import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
    Canvas
} from "@react-three/fiber";
import {
    OrbitControls
} from "@react-three/drei";

import {
    getTerrain,
    type TerrainData
} from "../../services/terrainApi";


type Layer =
    | "RGB"
    | "Elevation"
    | "Slope"
    | "NDVI";


interface TerrainMeshProps {
    terrain: TerrainData;
    layer: Layer;
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


function TerrainMesh({
    terrain,
    layer
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
                />

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

        </div>
    );
}