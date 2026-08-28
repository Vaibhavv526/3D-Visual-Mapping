import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
    Canvas
} from "@react-three/fiber";
import {
    OrbitControls,
    Line
} from "@react-three/drei";

import {
    getTerrain,
    type TerrainData
} from "../../services/terrainApi";

import PointInspector, {
    type SelectedPoint
} from "../PointInspector/PointInspector";
type Layer =
    | "RGB"
    | "Elevation"
    | "Slope"
    | "NDVI";


interface TerrainMeshProps {
    terrain: TerrainData;
    layer: Layer;
    onPointSelect: (point: SelectedPoint) => void;
}


function getFiniteRange(
    values: number[]
): [number, number] {

    const valid = values.filter(
        Number.isFinite
    );

    if (valid.length === 0) {
        return [0, 1];
    }

    return [
        Math.min(...valid),
        Math.max(...valid)
    ];
}


function colorFromStops(
    value: number,
    min: number,
    max: number,
    stops: Array<[number, THREE.Color]>
): THREE.Color {

    if (!Number.isFinite(value)) {
        return new THREE.Color(
            0.5,
            0.5,
            0.5
        );
    }

    const range = max - min;

    let t =
        range === 0
            ? 0.5
            : (value - min) / range;

    t = THREE.MathUtils.clamp(
        t,
        0,
        1
    );

    for (
        let i = 0;
        i < stops.length - 1;
        i++
    ) {

        const [
            positionA,
            colorA
        ] = stops[i];

        const [
            positionB,
            colorB
        ] = stops[i + 1];

        if (
            t >= positionA &&
            t <= positionB
        ) {

            const localT =
                (t - positionA) /
                (positionB - positionA);

            return colorA.clone().lerp(
                colorB,
                localT
            );
        }
    }

    return stops[
        stops.length - 1
    ][1].clone();
}


function elevationColor(
    value: number,
    min: number,
    max: number
): THREE.Color {

    return colorFromStops(
        value,
        min,
        max,
        [
            [
                0.0,
                new THREE.Color(
                    0x2166ac
                )
            ],
            [
                0.25,
                new THREE.Color(
                    0x2ca25f
                )
            ],
            [
                0.50,
                new THREE.Color(
                    0xffffbf
                )
            ],
            [
                0.75,
                new THREE.Color(
                    0xd9a066
                )
            ],
            [
                1.0,
                new THREE.Color(
                    0xffffff
                )
            ]
        ]
    );
}


function slopeColor(
    value: number,
    min: number,
    max: number
): THREE.Color {

    return colorFromStops(
        value,
        min,
        max,
        [
            [
                0.0,
                new THREE.Color(
                    0x440154
                )
            ],
            [
                0.25,
                new THREE.Color(
                    0x3b528b
                )
            ],
            [
                0.50,
                new THREE.Color(
                    0x21918c
                )
            ],
            [
                0.75,
                new THREE.Color(
                    0x5ec962
                )
            ],
            [
                1.0,
                new THREE.Color(
                    0xfde725
                )
            ]
        ]
    );
}


function ndviColor(
    value: number
): THREE.Color {

    return colorFromStops(
        value,
        -1,
        1,
        [
            [
                0.0,
                new THREE.Color(
                    0xa50026
                )
            ],
            [
                0.25,
                new THREE.Color(
                    0xf46d43
                )
            ],
            [
                0.50,
                new THREE.Color(
                    0xffffbf
                )
            ],
            [
                0.75,
                new THREE.Color(
                    0x66bd63
                )
            ],
            [
                1.0,
                new THREE.Color(
                    0x006837
                )
            ]
        ]
    );
}
function SelectionMarker({
    point,
    terrain
}: {
    point: SelectedPoint | null;
    terrain: TerrainData;
}) {

    if (!point) {
        return null;
    }

    const elevationValues =
        terrain.elevation.filter(
            Number.isFinite
        );

    const elevationMean =
        elevationValues.length > 0
            ? elevationValues.reduce(
                (sum, value) => sum + value,
                0
            ) / elevationValues.length
            : 0;

    const Z_EXAGGERATION = 8.0;

    const position: [
        number,
        number,
        number
    ] = [
        point.x - 500,
        (
            point.elevation -
            elevationMean
        ) * Z_EXAGGERATION + 6,
        point.y - 500
    ];

    return (
        <mesh position={position}>
            <sphereGeometry
                args={[8, 16, 16]}
            />

            <meshBasicMaterial
                color="#ff2222"
            />
        </mesh>
    );
}
function MeasurementLine({
    pointA,
    pointB,
    terrain
}: {
    pointA: SelectedPoint;
    pointB: SelectedPoint;
    terrain: TerrainData;
}) {

    const elevationValues =
        terrain.elevation.filter(
            Number.isFinite
        );

    const elevationMean =
        elevationValues.length > 0
            ? elevationValues.reduce(
                (sum, value) =>
                    sum + value,
                0
            ) / elevationValues.length
            : 0;

    const Z_EXAGGERATION = 8.0;

    const positionA =
        new THREE.Vector3(
            pointA.x - 500,
            (
                pointA.elevation -
                elevationMean
            ) * Z_EXAGGERATION + 8,
            pointA.y - 500
        );

    const positionB =
        new THREE.Vector3(
            pointB.x - 500,
            (
                pointB.elevation -
                elevationMean
            ) * Z_EXAGGERATION + 8,
            pointB.y - 500
        );

    return (
        <>
            <Line
                points={[
                    positionA,
                    positionB
                ]}
                color="#00ff88"
                lineWidth={3}
            />

            <mesh
                position={positionA}
            >
                <sphereGeometry
                    args={[7, 16, 16]}
                />

                <meshBasicMaterial
                    color="#00ff88"
                />
            </mesh>

            <mesh
                position={positionB}
            >
                <sphereGeometry
                    args={[7, 16, 16]}
                />

                <meshBasicMaterial
                    color="#00ff88"
                />
            </mesh>
        </>
    );
}
function TerrainMesh({
    terrain,
    layer,
    onPointSelect
}: TerrainMeshProps) {

    const geometry =
        useMemo(() => {

            const vertices =
                terrain.vertices;

            const faces =
                terrain.faces;

            const positions =
                new Float32Array(
                    vertices.length * 3
                );

            let elevationSum = 0;
            let elevationCount = 0;

            for (
                const value of terrain.elevation
            ) {

                if (
                    Number.isFinite(value)
                ) {

                    elevationSum += value;
                    elevationCount++;
                }
            }

            const elevationMean =
                elevationCount > 0
                    ? elevationSum /
                      elevationCount
                    : 0;

            const Z_EXAGGERATION = 8.0;

            for (
                let i = 0;
                i < vertices.length;
                i++
            ) {

                const x =
                    vertices[i][0];

                const y =
                    vertices[i][1];

                const z =
                    vertices[i][2];

                positions[i * 3] =
                    x - 500;

                positions[i * 3 + 1] =
                    (
                        z -
                        elevationMean
                    ) * Z_EXAGGERATION;

                positions[i * 3 + 2] =
                    y - 500;
            }

            const indices =
                new Uint32Array(
                    faces.length * 3
                );

            for (
                let i = 0;
                i < faces.length;
                i++
            ) {

                indices[i * 3] =
                    faces[i][0];

                indices[i * 3 + 1] =
                    faces[i][1];

                indices[i * 3 + 2] =
                    faces[i][2];
            }

            const geo =
                new THREE.BufferGeometry();

            geo.setAttribute(
                "position",
                new THREE.BufferAttribute(
                    positions,
                    3
                )
            );

            geo.setIndex(
                new THREE.BufferAttribute(
                    indices,
                    1
                )
            );

            const colors =
                new Float32Array(
                    vertices.length * 3
                );

            geo.setAttribute(
                "color",
                new THREE.BufferAttribute(
                    colors,
                    3
                )
            );

            geo.computeVertexNormals();

            console.log(
                "Creating React terrain:",
                vertices.length,
                "vertices"
            );

            return geo;

        }, [terrain]);


    useEffect(() => {

        const colorAttribute =
            geometry.getAttribute(
                "color"
            ) as THREE.BufferAttribute;

        const colors =
            colorAttribute.array as Float32Array;

        const [
            elevationMin,
            elevationMax
        ] =
            getFiniteRange(
                terrain.elevation
            );

        const [
            slopeMin,
            slopeMax
        ] =
            getFiniteRange(
                terrain.slope
            );

        for (
            let i = 0;
            i < terrain.vertices.length;
            i++
        ) {

            let color =
                new THREE.Color(
                    0.5,
                    0.5,
                    0.5
                );


            if (
                layer === "RGB"
            ) {

                const pixel =
                    terrain.rgb[i];

                if (
                    Array.isArray(pixel) &&
                    pixel.length >= 3
                ) {

                    let r =
                        Number(pixel[0]);

                    let g =
                        Number(pixel[1]);

                    let b =
                        Number(pixel[2]);

                    if (
                        r <= 1 &&
                        g <= 1 &&
                        b <= 1
                    ) {

                        r *= 255;
                        g *= 255;
                        b *= 255;
                    }

                    color.setRGB(
                        THREE.MathUtils.clamp(
                            r / 255,
                            0,
                            1
                        ),
                        THREE.MathUtils.clamp(
                            g / 255,
                            0,
                            1
                        ),
                        THREE.MathUtils.clamp(
                            b / 255,
                            0,
                            1
                        )
                    );
                }
            }


            if (
                layer === "Elevation"
            ) {

                color =
                    elevationColor(
                        terrain.elevation[i],
                        elevationMin,
                        elevationMax
                    );
            }


            if (
                layer === "Slope"
            ) {

                color =
                    slopeColor(
                        terrain.slope[i],
                        slopeMin,
                        slopeMax
                    );
            }


            if (
                layer === "NDVI"
            ) {

                color =
                    ndviColor(
                        terrain.ndvi[i]
                    );
            }


            colors[i * 3] =
                color.r;

            colors[i * 3 + 1] =
                color.g;

            colors[i * 3 + 2] =
                color.b;
        }

        colorAttribute.needsUpdate =
            true;

    }, [
        geometry,
        terrain,
        layer
    ]);

    return (
        <mesh
            geometry={geometry}
            onClick={(event) => {

                event.stopPropagation();

                const triangleIndex =
                    event.faceIndex;

                if (
                    triangleIndex === undefined ||
                    triangleIndex === null
                ) {
                    return;
                }

                const face =
                    terrain.faces[triangleIndex];

                if (!face) {
                    return;
                }

                const vertexIndices = [
                    face[0],
                    face[1],
                    face[2]
                ];

                let nearestIndex =
                    vertexIndices[0];

                let nearestDistance =
                    Infinity;

                const elevationValues =
                    terrain.elevation.filter(
                        Number.isFinite
                    );

                const elevationMean =
                    elevationValues.length > 0
                        ? elevationValues.reduce(
                            (sum, value) =>
                                sum + value,
                            0
                        ) / elevationValues.length
                        : 0;

                const Z_EXAGGERATION = 8.0;

                for (
                    const index of vertexIndices
                ) {

                    const vertex =
                        terrain.vertices[index];

                    if (!vertex) {
                        continue;
                    }

                    const worldVertex =
                        new THREE.Vector3(
                            vertex[0] - 500,
                            (
                                vertex[2] -
                                elevationMean
                            ) * Z_EXAGGERATION,
                            vertex[1] - 500
                        );

                    const distance =
                        event.point.distanceTo(
                            worldVertex
                        );

                    if (
                        distance <
                        nearestDistance
                    ) {

                        nearestDistance =
                            distance;

                        nearestIndex =
                            index;
                    }
                }

                const vertex =
                    terrain.vertices[
                        nearestIndex
                    ];

                if (!vertex) {
                    return;
                }

                const selectedPoint: SelectedPoint = {
                    index: nearestIndex,
                    x: vertex[0],
                    y: vertex[1],
                    elevation:
                        terrain.elevation[
                            nearestIndex
                        ],
                    slope:
                        terrain.slope[
                            nearestIndex
                        ],
                    ndvi:
                        terrain.ndvi[
                            nearestIndex
                        ]
                };

                console.log(
                    "Selected React terrain point:",
                    selectedPoint
                );

                onPointSelect(
                    selectedPoint
                );
            }}
        >

            <meshStandardMaterial
                vertexColors
                side={THREE.DoubleSide}
                roughness={0.85}
                metalness={0.05}
            />

        </mesh>
    );
}


export default function TerrainViewer() {

    const [
        terrain,
        setTerrain
    ] =
        useState<TerrainData | null>(
            null
        );

    const [
        selectedPoint,
        setSelectedPoint
    ] =
        useState<SelectedPoint | null>(
            null
        );

    const [
        measurementMode,
        setMeasurementMode
    ] =
        useState(false);

    const [
        measurePointA,
        setMeasurePointA
    ] =
        useState<SelectedPoint | null>(
            null
        );

    const [
        measurePointB,
        setMeasurePointB
    ] =
        useState<SelectedPoint | null>(
            null
        );

    const [
        layer,
        setLayer
    ] =
        useState<Layer>("RGB");

    const [
        error,
        setError
    ] =
        useState<string | null>(
            null
        );
    const handlePointSelect = (
        point: SelectedPoint
    ) => {

        setSelectedPoint(point);

        if (!measurementMode) {
            return;
        }

        // First click → Point A
        if (!measurePointA || measurePointB) {

            setMeasurePointA(point);
            setMeasurePointB(null);

            console.log(
                "Measurement Point A:",
                point
            );

            return;
        }

        // Second click → Point B
        setMeasurePointB(point);

        console.log(
            "Measurement Point B:",
            point
        );
    };

    const horizontalDistance =
        measurePointA &&
        measurePointB
            ? Math.sqrt(
                Math.pow(
                    measurePointB.x -
                    measurePointA.x,
                    2
                ) +
                Math.pow(
                    measurePointB.y -
                    measurePointA.y,
                    2
                )
            )
            : null;

    const elevationDifference =
        measurePointA &&
        measurePointB
            ? measurePointB.elevation -
            measurePointA.elevation
            : null;

    const distance3D =
        horizontalDistance !== null &&
        elevationDifference !== null
            ? Math.sqrt(
                Math.pow(
                    horizontalDistance,
                    2
                ) +
                Math.pow(
                    elevationDifference,
                    2
                )
            )
            : null;
    useEffect(() => {

        getTerrain()
            .then((data) => {

                console.log(
                    "Terrain loaded from React:",
                    data.vertex_count,
                    "vertices",
                    data.triangle_count,
                    "triangles"
                );

                setTerrain(data);
            })
            .catch((err) => {

                console.error(
                    "Terrain loading failed:",
                    err
                );

                setError(
                    "Failed to load terrain"
                );
            });

    }, []);


    if (error) {

        return (
            <div>
                {error}
            </div>
        );
    }


    if (!terrain) {

        return (
            <div>
                Loading terrain...
            </div>
        );
    }


    return (
        <div
            style={{
                width: "100%",
                height: "650px",
                position: "relative",
                background: "#020617",
                borderRadius: "12px",
                overflow: "hidden"
            }}
        >

            <div
                style={{
                    position: "absolute",
                    top: "16px",
                    left: "16px",
                    zIndex: 10,
                    display: "flex",
                    gap: "8px"
                }}
            >

                {(
                    [
                        "RGB",
                        "Elevation",
                        "Slope",
                        "NDVI"
                    ] as Layer[]
                ).map(
                    (item) => (

                        <button
                            key={item}
                            onClick={() =>
                                setLayer(item)
                            }
                            style={{
                                padding:
                                    "8px 14px",
                                borderRadius:
                                    "6px",
                                border:
                                    "1px solid #475569",
                                background:
                                    layer === item
                                        ? "#2563eb"
                                        : "#1e293b",
                                color:
                                    "white",
                                cursor:
                                    "pointer",
                                fontWeight:
                                    600
                            }}
                        >
                            {item}
                        </button>

                    )
                )}
                <button
                    onClick={() => {

                        const nextMode =
                            !measurementMode;

                        setMeasurementMode(
                            nextMode
                        );

                        setMeasurePointA(null);
                        setMeasurePointB(null);

                    }}
                    style={{
                        padding: "8px 14px",
                        borderRadius: "6px",
                        border:
                            "1px solid #475569",
                        background:
                            measurementMode
                                ? "#16a34a"
                                : "#1e293b",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 600
                    }}
                >
                    Measure
                </button>

            </div>


            <div
                style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    zIndex: 10,
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background:
                        "rgba(15,23,42,0.88)",
                    color: "white",
                    fontSize: "12px"
                }}
            >
                <strong>
                    Bilaspur AOI
                </strong>
                <br />
                1000 × 1000 m
                <br />
                {terrain.crs}
            </div>


            <Canvas
                camera={{
                    position: [
                        850,
                        700,
                        850
                    ],
                    fov: 45,
                    near: 0.1,
                    far: 10000
                }}
                gl={{
                    antialias: true
                }}
            >

                <color
                    attach="background"
                    args={["#020617"]}
                />

                <ambientLight
                    intensity={1.2}
                />

                <directionalLight
                    position={[
                        500,
                        1000,
                        500
                    ]}
                    intensity={2}
                />

                <TerrainMesh
                    terrain={terrain}
                    layer={layer}
                    onPointSelect={
                        handlePointSelect
                    }
                />
                <SelectionMarker
                    point={selectedPoint}
                    terrain={terrain}
                />
                {measurePointA &&
                    measurePointB && (
                        <MeasurementLine
                            pointA={measurePointA}
                            pointB={measurePointB}
                            terrain={terrain}
                        />
                    )}
                <OrbitControls
                    enableDamping
                    dampingFactor={0.08}
                    target={[
                        0,
                        0,
                        0
                    ]}
                />

            </Canvas>
            {measurementMode && (
                <div
                    style={{
                        position: "absolute",
                        top: "70px",
                        left: "16px",
                        zIndex: 20,
                        minWidth: "190px",
                        padding: "14px",
                        borderRadius: "8px",
                        background:
                            "rgba(15,23,42,0.94)",
                        border:
                            "1px solid #334155",
                        color: "white",
                        fontSize: "12px",
                        boxShadow:
                            "0 8px 24px rgba(0,0,0,0.35)"
                    }}
                >

                    <div
                        style={{
                            color: "#00ff88",
                            fontWeight: 700,
                            fontSize: "11px",
                            marginBottom: "10px"
                        }}
                    >
                        3D MEASUREMENT
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            gap: "20px",
                            marginBottom: "6px"
                        }}
                    >
                        <span>Point A</span>

                        <strong>
                            {measurePointA
                                ? `(${measurePointA.x.toFixed(0)}, ${measurePointA.y.toFixed(0)})`
                                : "--"}
                        </strong>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            gap: "20px",
                            marginBottom: "6px"
                        }}
                    >
                        <span>Point B</span>

                        <strong>
                            {measurePointB
                                ? `(${measurePointB.x.toFixed(0)}, ${measurePointB.y.toFixed(0)})`
                                : "--"}
                        </strong>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            gap: "20px",
                            marginBottom: "6px"
                        }}
                    >
                        <span>Horizontal</span>

                        <strong>
                            {horizontalDistance !== null
                                ? `${horizontalDistance.toFixed(2)} m`
                                : "--"}
                        </strong>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            gap: "20px",
                            marginBottom: "6px"
                        }}
                    >
                        <span>Elevation Δ</span>

                        <strong>
                            {elevationDifference !== null
                                ? `${elevationDifference.toFixed(2)} m`
                                : "--"}
                        </strong>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            gap: "20px"
                        }}
                    >
                        <span>3D Distance</span>

                        <strong>
                            {distance3D !== null
                                ? `${distance3D.toFixed(2)} m`
                                : "--"}
                        </strong>
                    </div>

                </div>
            )}
            <PointInspector
                point={selectedPoint}
            />

        </div>
    );
}