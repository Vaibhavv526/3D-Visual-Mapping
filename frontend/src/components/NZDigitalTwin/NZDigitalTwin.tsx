import {
    useEffect,
    useMemo,
    useState
} from "react";

import * as THREE from "three";

import {
    Canvas
} from "@react-three/fiber";

import {
    OrbitControls
} from "@react-three/drei";

import {
    getNZTerrain,
    getNZBuildings,
    type NZTerrainData,
    type NZBuilding
} from "../../services/nzApi";


type TerrainLayer =
    | "elevation"
    | "slope"
    | "relative";


interface TerrainMeshProps {
    terrain: NZTerrainData;
    layer: TerrainLayer;
}


function normalize(
    value: number,
    min: number,
    max: number
) {

    if (!Number.isFinite(value)) {
        return 0;
    }

    if (max === min) {
        return 0.5;
    }

    return THREE.MathUtils.clamp(
        (value - min) / (max - min),
        0,
        1
    );
}


function terrainColor(
    value: number,
    min: number,
    max: number,
    layer: TerrainLayer
) {

    const t = normalize(
        value,
        min,
        max
    );

    /*
     * Elevation:
     * low = blue
     * middle = green
     * high = brown/white
     */
    if (layer === "elevation") {

        const color =
            new THREE.Color();

        if (t < 0.5) {

            color.lerpColors(
                new THREE.Color("#2563eb"),
                new THREE.Color("#22c55e"),
                t * 2
            );

        } else {

            color.lerpColors(
                new THREE.Color("#22c55e"),
                new THREE.Color("#f59e0b"),
                (t - 0.5) * 2
            );
        }

        return color;
    }


    /*
     * Slope:
     * low = green
     * high = red
     */
    if (layer === "slope") {

        const color =
            new THREE.Color();

        color.lerpColors(
            new THREE.Color("#16a34a"),
            new THREE.Color("#dc2626"),
            t
        );

        return color;
    }


    /*
     * Relative elevation:
     * low = dark blue
     * high = yellow
     */

    const color =
        new THREE.Color();

    color.lerpColors(
        new THREE.Color("#1d4ed8"),
        new THREE.Color("#facc15"),
        t
    );

    return color;
}
function NZTerrainMesh({
    terrain,
    layer
}: TerrainMeshProps) {

    const geometry =
        useMemo(() => {

            const vertices =
                terrain.vertices;

            const positions =
                new Float32Array(
                    vertices.length * 3
                );


            // -------------------------------------------------
            // Calculate terrain bounds safely
            // -------------------------------------------------

            let minX = Infinity;
            let maxX = -Infinity;

            let minY = Infinity;
            let maxY = -Infinity;

            for (const vertex of vertices) {

                minX =
                    Math.min(
                        minX,
                        vertex[0]
                    );

                maxX =
                    Math.max(
                        maxX,
                        vertex[0]
                    );

                minY =
                    Math.min(
                        minY,
                        vertex[1]
                    );

                maxY =
                    Math.max(
                        maxY,
                        vertex[1]
                    );
            }


            const centerX =
                (minX + maxX) / 2;

            const centerY =
                (minY + maxY) / 2;


            // -------------------------------------------------
            // Mean terrain elevation
            // -------------------------------------------------

            const elevations =
                terrain.elevation;

            let elevationSum = 0;

            for (
                const elevation
                of elevations
            ) {

                elevationSum +=
                    elevation;
            }


            const elevationMean =
                elevationSum /
                elevations.length;


            // -------------------------------------------------
            // Vertical exaggeration
            // -------------------------------------------------

            const Z_EXAGGERATION = 4.0;


            // -------------------------------------------------
            // Create terrain positions
            // -------------------------------------------------

            vertices.forEach(
                (vertex, i) => {

                    positions[i * 3] =
                        vertex[0] -
                        centerX;

                    positions[i * 3 + 1] =
                        (
                            vertex[2] -
                            elevationMean
                        ) *
                        Z_EXAGGERATION;

                    positions[i * 3 + 2] =
                        vertex[1] -
                        centerY;
                }
            );


            // -------------------------------------------------
            // Terrain faces
            // -------------------------------------------------

            const indices =
                new Uint32Array(
                    terrain.faces.length * 3
                );


            terrain.faces.forEach(
                (face, i) => {

                    indices[i * 3] =
                        face[0];

                    indices[i * 3 + 1] =
                        face[1];

                    indices[i * 3 + 2] =
                        face[2];
                }
            );


            // -------------------------------------------------
            // Three.js geometry
            // -------------------------------------------------

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


            // -------------------------------------------------
            // Terrain vertex colors
            // -------------------------------------------------

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


            return geo;

        }, [terrain]);


    // ---------------------------------------------------------
    // Update terrain colors when layer changes
    // ---------------------------------------------------------

    useEffect(() => {

        const attribute =
            geometry.getAttribute(
                "color"
            ) as THREE.BufferAttribute;


        const colors =
            attribute.array as Float32Array;


        let values: number[];


        if (
            layer === "elevation"
        ) {

            values =
                terrain.elevation;

        } else if (
            layer === "slope"
        ) {

            values =
                terrain.slope;

        } else {

            values =
                terrain.relative_elevation;
        }


        const finiteValues =
            values.filter(
                Number.isFinite
            );


        let min =
            Infinity;

        let max =
            -Infinity;


        for (
            const value
            of finiteValues
        ) {

            min =
                Math.min(
                    min,
                    value
                );

            max =
                Math.max(
                    max,
                    value
                );
        }


        for (
            let i = 0;
            i < values.length;
            i++
        ) {

            const color =
                terrainColor(
                    values[i],
                    min,
                    max,
                    layer
                );


            colors[i * 3] =
                color.r;

            colors[i * 3 + 1] =
                color.g;

            colors[i * 3 + 2] =
                color.b;
        }


        attribute.needsUpdate =
            true;

    }, [
        geometry,
        terrain,
        layer
    ]);


    return (
        <mesh
            geometry={geometry}
            receiveShadow
        >

            <meshStandardMaterial
                vertexColors
                side={THREE.DoubleSide}
                roughness={0.82}
                metalness={0.02}
            />

        </mesh>
    );
}

function NZBuildingMesh({
    building,
    terrain,
    onSelect
}: {
    building: NZBuilding;
    terrain: NZTerrainData;
    onSelect: (
        building: NZBuilding
    ) => void;
}) {

    const geometry =
        useMemo(() => {

            const points =
                building.vertices;

            const terrainVertices =
                terrain.vertices;
            
            let minX = Infinity;
            let maxX = -Infinity;

            let minY = Infinity;
            let maxY = -Infinity;

            for (const vertex of terrainVertices) {

                minX = Math.min(
                    minX,
                    vertex[0]
                );

                maxX = Math.max(
                    maxX,
                    vertex[0]
                );

                minY = Math.min(
                    minY,
                    vertex[1]
                );

                maxY = Math.max(
                    maxY,
                    vertex[1]
                );
            }

            const centerX =
                (minX + maxX) / 2;

            const centerY =
                (minY + maxY) / 2;

            const elevationMean =
                terrain.elevation.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) / terrain.elevation.length;

            const Z_EXAGGERATION = 4.0;


            // -------------------------------------------------
            // Find building ground position
            // -------------------------------------------------

            const buildingCenterX =
                points.reduce(
                    (sum, point) =>
                        sum + point[0],
                    0
                ) / points.length;

            const buildingCenterY =
                points.reduce(
                    (sum, point) =>
                        sum + point[1],
                    0
                ) / points.length;


            // Find nearest terrain vertex to building centre.
            // This gives us the local terrain elevation instead
            // of using the global terrain mean.
            let nearestIndex = 0;
            let nearestDistance = Infinity;

            for (
                let i = 0;
                i < terrainVertices.length;
                i++
            ) {

                const dx =
                    terrainVertices[i][0] -
                    buildingCenterX;

                const dy =
                    terrainVertices[i][1] -
                    buildingCenterY;

                const distance =
                    dx * dx + dy * dy;

                if (
                    distance <
                    nearestDistance
                ) {

                    nearestDistance =
                        distance;

                    nearestIndex =
                        i;
                }
            }


            const localGroundElevation =
                terrain.elevation[
                    nearestIndex
                ];


            // -------------------------------------------------
            // Vertical correction
            // -------------------------------------------------

            const buildingBaseElevation =
                building.min_elevation;

            const verticalOffset =
                localGroundElevation -
                buildingBaseElevation;


            // -------------------------------------------------
            // Build geometry
            // -------------------------------------------------

            const positions =
                new Float32Array(
                    points.length * 3
                );


            points.forEach(
                (point, i) => {

                    positions[i * 3] =
                        point[0] -
                        centerX;

                    positions[i * 3 + 1] =
                        (
                            point[2] +
                            verticalOffset -
                            elevationMean
                        ) *
                        Z_EXAGGERATION;

                    positions[i * 3 + 2] =
                        point[1] -
                        centerY;
                }
            );


            const indices =
                new Uint32Array(
                    building.faces.length * 3
                );


            building.faces.forEach(
                (face, i) => {

                    indices[i * 3] =
                        face[0];

                    indices[i * 3 + 1] =
                        face[1];

                    indices[i * 3 + 2] =
                        face[2];
                }
            );


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


            // -------------------------------------------------
            // Sentinel-2 RGB
            // -------------------------------------------------

            const colors =
                new Float32Array(
                    points.length * 3
                );


            points.forEach(
                (_point, i) => {

                    const rgb =
                        building.rgb?.[i] ??
                        [0.5, 0.5, 0.5];

                    const enhance =
                        (value: number) => {

                            const v =
                                THREE.MathUtils.clamp(
                                    value * 2.2,
                                    0,
                                    1
                                );

                            return v <= 0.0031308
                                ? 12.92 * v
                                : 1.055 *
                                    Math.pow(
                                        v,
                                        1 / 2.4
                                    ) -
                                    0.055;
                        };


                    colors[i * 3] =
                        enhance(rgb[0]);

                    colors[i * 3 + 1] =
                        enhance(rgb[1]);

                    colors[i * 3 + 2] =
                        enhance(rgb[2]);
                }
            );


            geo.setAttribute(
                "color",
                new THREE.BufferAttribute(
                    colors,
                    3
                )
            );

            
            // -------------------------------------------------
            // Compute normals
            // -------------------------------------------------

            geo.computeVertexNormals();


            // -------------------------------------------------
            // Separate roof and wall faces
            //
            // Three.js coordinates:
            // X = east/west
            // Y = vertical
            // Z = north/south
            //
            // Roofs have a strong upward-facing normal.
            // Walls are mostly vertical.
            // -------------------------------------------------

            const roofIndices: number[] = [];
            const wallIndices: number[] = [];

            const positionAttribute =
                geo.getAttribute(
                    "position"
                ) as THREE.BufferAttribute;

            const indexAttribute =
                geo.getIndex();

            if (indexAttribute) {

                const a = new THREE.Vector3();
                const b = new THREE.Vector3();
                const c = new THREE.Vector3();

                const ab = new THREE.Vector3();
                const ac = new THREE.Vector3();

                const normal = new THREE.Vector3();

                for (
                    let i = 0;
                    i < indexAttribute.count;
                    i += 3
                ) {

                    const ia =
                        indexAttribute.getX(i);

                    const ib =
                        indexAttribute.getX(i + 1);

                    const ic =
                        indexAttribute.getX(i + 2);


                    a.fromBufferAttribute(
                        positionAttribute,
                        ia
                    );

                    b.fromBufferAttribute(
                        positionAttribute,
                        ib
                    );

                    c.fromBufferAttribute(
                        positionAttribute,
                        ic
                    );


                    ab.subVectors(
                        b,
                        a
                    );

                    ac.subVectors(
                        c,
                        a
                    );


                    normal
                        .crossVectors(
                            ab,
                            ac
                        )
                        .normalize();


                    /*
                    * Y is the vertical axis.
                    *
                    * A value above ~0.45 means the
                    * triangle faces sufficiently upward
                    * to be considered part of a roof.
                    */

                    if (normal.y > 0.45) {

                        roofIndices.push(
                            ia,
                            ib,
                            ic
                        );

                    } else {

                        wallIndices.push(
                            ia,
                            ib,
                            ic
                        );
                    }
                }
            }


            // -------------------------------------------------
            // Store roof/wall classification as an attribute
            // -------------------------------------------------

            const surfaceType =
                new Float32Array(
                    points.length
                );

            for (
                const index of roofIndices
            ) {

                surfaceType[index] = 1;
            }

            for (
                const index of wallIndices
            ) {

                if (
                    surfaceType[index] !== 1
                ) {

                    surfaceType[index] = 0;
                }
            }


            geo.setAttribute(
                "surfaceType",
                new THREE.BufferAttribute(
                    surfaceType,
                    1
                )
            );


            return geo;

        }, [
            building,
            terrain
        ]);


    return (
        <mesh
            geometry={geometry}
            castShadow
            onClick={(event) => {

                event.stopPropagation();

                onSelect(building);

            }}
        >

            <meshStandardMaterial
                vertexColors={true}
                side={THREE.DoubleSide}
                roughness={0.72}
                metalness={0.0}
            />

        </mesh>
    );
}


export default function NZDigitalTwin() {

    const [
        terrain,
        setTerrain
    ] =
        useState<NZTerrainData | null>(
            null
        );


    const [
        buildings,
        setBuildings
    ] =
        useState<NZBuilding[]>([]);


    const [
        selectedBuilding,
        setSelectedBuilding
    ] =
        useState<NZBuilding | null>(
            null
        );


    const [
        layer,
        setLayer
    ] =
        useState<TerrainLayer>(
            "elevation"
        );


    const [
        showBuildings,
        setShowBuildings
    ] =
        useState(true);


    const [
        error,
        setError
    ] =
        useState<string | null>(
            null
        );


    useEffect(() => {

        Promise.all([
            getNZTerrain(),
            getNZBuildings()
        ])

        .then(([
            terrainData,
            buildingData
        ]) => {

            setTerrain(
                terrainData
            );

            setBuildings(
                buildingData.buildings
            );

        })

        .catch((err) => {

            console.error(
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load NZ Digital Twin"
            );

        });

    }, []);


    if (error) {

        return (
            <div className="nz-error">
                {error}
            </div>
        );
    }


    if (!terrain) {

        return (
            <div className="nz-loading">
                Loading New Zealand LiDAR Digital Twin...
            </div>
        );
    }


    const elevation =
        terrain.elevation;


    const slope =
        terrain.slope;


    const elevationMin =
        elevation.reduce((min, value) => Math.min(min, value), Infinity);


    const elevationMax =
        elevation.reduce((max, value) => Math.max(max, value), -Infinity);


    const slopeMax =
        slope.reduce((max, value) => Math.max(max, value), -Infinity);


    return (
        <div className="nz-twin">

            <Canvas
                shadows
                camera={{
                    position: [
                        500,
                        420,
                        720
                    ],
                    fov: 45
                }}
            >

                <color
                    attach="background"
                    args={["#07111f"]}
                />


                <ambientLight
                    intensity={1.15}
                />


                <directionalLight
                    castShadow
                    position={[
                        250,
                        500,
                        300
                    ]}
                    intensity={2.6}
                />


                <directionalLight
                    position={[
                        -300,
                        180,
                        -200
                    ]}
                    intensity={0.8}
                />


                <NZTerrainMesh
                    terrain={terrain}
                    layer={layer}
                />


                {showBuildings &&
                    buildings.map(
                        building => (

                            <NZBuildingMesh
                                key={building.id}
                                building={building}
                                terrain={terrain}
                                onSelect={
                                    setSelectedBuilding
                                }
                            />

                        )
                    )
                }


                <OrbitControls
                    makeDefault
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={180}
                    maxDistance={1400}
                    target={[
                        0,
                        0,
                        0
                    ]}
                />

            </Canvas>


            {/* TOP LEFT */}

            <div className="nz-overlay nz-title">

                <div className="nz-kicker">
                    GEOSPATIAL DIGITAL TWIN
                </div>

                <h3>
                    New Zealand LiDAR
                </h3>

                <span>
                    3D terrain + property intelligence
                </span>

            </div>


            {/* TOP RIGHT */}

            <div className="nz-overlay nz-stats">

                <div>
                    <span>
                        POINTS
                    </span>

                    <strong>
                        6.5M
                    </strong>
                </div>


                <div>
                    <span>
                        TERRAIN
                    </span>

                    <strong>
                        {terrain.vertex_count.toLocaleString()}
                    </strong>
                </div>


                <div>
                    <span>
                        BUILDINGS
                    </span>

                    <strong>
                        {buildings.length}
                    </strong>
                </div>

            </div>


            {/* LEFT LAYER PANEL */}

            <div className="nz-overlay nz-layer-panel">

                <div className="nz-panel-title">
                    TERRAIN LAYER
                </div>


                <button
                    className={
                        layer === "elevation"
                            ? "nz-layer active"
                            : "nz-layer"
                    }
                    onClick={() =>
                        setLayer("elevation")
                    }
                >
                    <span>
                        Elevation
                    </span>

                    <small>
                        {elevationMin.toFixed(1)}
                        {" – "}
                        {elevationMax.toFixed(1)} m
                    </small>
                </button>


                <button
                    className={
                        layer === "slope"
                            ? "nz-layer active"
                            : "nz-layer"
                    }
                    onClick={() =>
                        setLayer("slope")
                    }
                >
                    <span>
                        Slope
                    </span>

                    <small>
                        0 – {slopeMax.toFixed(1)}°
                    </small>
                </button>


                <button
                    className={
                        layer === "relative"
                            ? "nz-layer active"
                            : "nz-layer"
                    }
                    onClick={() =>
                        setLayer("relative")
                    }
                >
                    <span>
                        Relative Elevation
                    </span>

                    <small>
                        0 – 1
                    </small>
                </button>


                <div className="nz-divider" />


                <div className="nz-panel-title">
                    OBJECTS
                </div>


                <label className="nz-toggle">

                    <input
                        type="checkbox"
                        checked={showBuildings}
                        onChange={(event) =>
                            setShowBuildings(
                                event.target.checked
                            )
                        }
                    />

                    <span>
                        Buildings
                    </span>

                    <b>
                        {buildings.length}
                    </b>

                </label>

            </div>


            {/* BOTTOM LEFT */}

            <div className="nz-overlay nz-legend">

                <div className="nz-panel-title">
                    {layer === "elevation"
                        ? "ELEVATION"
                        : layer === "slope"
                            ? "SLOPE"
                            : "RELATIVE ELEVATION"
                    }
                </div>

                <div className="nz-gradient" />

                <div className="nz-legend-values">

                    <span>
                        {layer === "slope"
                            ? "0°"
                            : layer === "relative"
                                ? "0"
                                : `${elevationMin.toFixed(1)}m`
                        }
                    </span>

                    <span>
                        {layer === "slope"
                            ? `${slopeMax.toFixed(1)}°`
                            : layer === "relative"
                                ? "1"
                                : `${elevationMax.toFixed(1)}m`
                        }
                    </span>

                </div>

            </div>


            {/* PROPERTY INSPECTOR */}

            {selectedBuilding && (

                <div className="nz-overlay nz-property">

                    <button
                        className="nz-close"
                        onClick={() =>
                            setSelectedBuilding(null)
                        }
                    >
                        ×
                    </button>


                    <div className="nz-kicker">
                        SELECTED PROPERTY
                    </div>


                    <h3>
                        {selectedBuilding.id}
                    </h3>


                    <div className="nz-property-grid">

                        <div>
                            <span>
                                LiDAR points
                            </span>

                            <strong>
                                {selectedBuilding.point_count.toLocaleString()}
                            </strong>
                        </div>


                        <div>
                            <span>
                                Height
                            </span>

                            <strong>
                                {selectedBuilding.height_range.toFixed(2)}
                                {" "}m
                            </strong>
                        </div>


                        <div>
                            <span>
                                Base
                            </span>

                            <strong>
                                {selectedBuilding.min_elevation.toFixed(2)}
                                {" "}m
                            </strong>
                        </div>


                        <div>
                            <span>
                                Roof
                            </span>

                            <strong>
                                {selectedBuilding.max_elevation.toFixed(2)}
                                {" "}m
                            </strong>
                        </div>

                    </div>

                </div>
            )}


            <div className="nz-footer-info">
                EPSG:2193 · NZTM2000 · LiDAR-derived
            </div>

        </div>
    );
}
