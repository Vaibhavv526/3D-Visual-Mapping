import {
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import * as THREE from "three";

import {
    Canvas,
    useFrame,
    useThree
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

import {
    exportBuildingDossierPdf,
    exportAreaSummaryPdf,
    type PairwiseMeasurementData
} from "../../services/dossierPdf";


type TerrainLayer =
    | "rgb_hillshade"
    | "elevation"
    | "slope"
    | "relative"
    | "ndvi"
    | "rgb";


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

const C_NDVI_WATER = new THREE.Color("#64748b");
const C_NDVI_EARTH = new THREE.Color("#b45309");
const C_NDVI_AMBER = new THREE.Color("#eab308");
const C_NDVI_LIME  = new THREE.Color("#84cc16");
const C_NDVI_GREEN = new THREE.Color("#22c55e");
const C_NDVI_DEEP  = new THREE.Color("#064e3b");
const C_NDVI_TEMP  = new THREE.Color();

function ndviColor(v: number, target: THREE.Color): THREE.Color {
    if (!Number.isFinite(v)) {
        return target.copy(C_NDVI_WATER);
    }
    if (v < 0.12) {
        if (v <= 0) return target.copy(C_NDVI_WATER);
        const t = v / 0.12;
        return target.lerpColors(C_NDVI_WATER, C_NDVI_EARTH, t);
    }
    if (v < 0.35) {
        const t = (v - 0.12) / 0.23;
        if (t < 0.5) {
            return target.lerpColors(C_NDVI_EARTH, C_NDVI_AMBER, t * 2);
        } else {
            return target.lerpColors(C_NDVI_AMBER, C_NDVI_LIME, (t - 0.5) * 2);
        }
    }
    const t = THREE.MathUtils.clamp((v - 0.35) / 0.35, 0, 1);
    return target.lerpColors(C_NDVI_GREEN, C_NDVI_DEEP, t);
}

// Sentinel-2 Level-2A BOA reflectance calibration for MeshStandardMaterial.
// Physical reflectance in the tile has a baseline floor of ~0.075 to 0.080.
// We subtract the dark-floor baseline uniformly across all channels (preserving relative hue)
// and scale by 1.35 to deliver balanced linear diffuse albedos ([0.02, 0.28]).
const SENTINEL_RGB_DARK_FLOOR = 0.075;
const SENTINEL_RGB_GAIN = 1.35;

function sentinelReflectanceToAlbedo(v: number): number {
    return THREE.MathUtils.clamp((v - SENTINEL_RGB_DARK_FLOOR) * SENTINEL_RGB_GAIN, 0, 1);
}

// Multi-directional analytical hillshade illumination vector:
// Primary NW (azimuth 315°, altitude 45°) blended with secondary W (azimuth 270°, altitude 35°).
// Cartographic standard to avoid pseudoscopic relief inversion while accentuating ridges and valleys.
const HILLSHADE_SUN_DIR = new THREE.Vector3(-0.5786, 0.6983, 0.4105).normalize();
const HILLSHADE_FLAT_DOT = HILLSHADE_SUN_DIR.y; // 0.6983 for horizontal plane

function NZTerrainMesh({
    terrain,
    layer
}: TerrainMeshProps) {

    const geometry =
        useMemo(() => {

            const t0 = performance.now();
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
            // Vertical exaggeration: 1.5x terrain relief
            // -------------------------------------------------

            const Z_EXAGGERATION = 1.5;


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
            // Terrain faces (counter-clockwise winding for upward vertex normals)
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
                        face[2];

                    indices[i * 3 + 2] =
                        face[1];
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

            console.log(`[PERF:TERRAIN_GEO] Terrain geometry created in ${(performance.now() - t0).toFixed(2)}ms`);

            return geo;

        }, [terrain]);


    // ---------------------------------------------------------
    // Update terrain colors when layer changes
    // ---------------------------------------------------------

    useEffect(() => {

        const t0 = performance.now();
        const attribute =
            geometry.getAttribute(
                "color"
            ) as THREE.BufferAttribute;


        const colors =
            attribute.array as Float32Array;


        if (layer === "rgb_hillshade") {
            const rgbData = terrain.rgb;
            const normalAttr = geometry.getAttribute("normal") as THREE.BufferAttribute;
            if (rgbData && rgbData.length > 0 && normalAttr) {
                const sunX = HILLSHADE_SUN_DIR.x;
                const sunY = HILLSHADE_SUN_DIR.y;
                const sunZ = HILLSHADE_SUN_DIR.z;
                const flatDot = HILLSHADE_FLAT_DOT;

                for (let i = 0; i < rgbData.length; i++) {
                    const item = rgbData[i];
                    if (!item || (item[0] === 0 && item[1] === 0 && item[2] === 0)) {
                        colors[i * 3] = 0.08;
                        colors[i * 3 + 1] = 0.10;
                        colors[i * 3 + 2] = 0.12;
                        continue;
                    }

                    // Analytical normal dot product with multi-directional sun vector
                    const nx = normalAttr.getX(i);
                    const ny = normalAttr.getY(i);
                    const nz = normalAttr.getZ(i);
                    const dot = nx * sunX + ny * sunY + nz * sunZ;
                    const diff = dot - flatDot;
                    // Subtle hillshade modulation: 1.0 on flat land, [0.80, 1.22] on valleys/ridges/slopes
                    const hillshadeFactor = THREE.MathUtils.clamp(1.0 + diff * 0.72, 0.80, 1.22);

                    const baseR = sentinelReflectanceToAlbedo(item[0]);
                    const baseG = sentinelReflectanceToAlbedo(item[1]);
                    const baseB = sentinelReflectanceToAlbedo(item[2]);

                    colors[i * 3] = THREE.MathUtils.clamp(baseR * hillshadeFactor, 0, 1);
                    colors[i * 3 + 1] = THREE.MathUtils.clamp(baseG * hillshadeFactor, 0, 1);
                    colors[i * 3 + 2] = THREE.MathUtils.clamp(baseB * hillshadeFactor, 0, 1);
                }
            }
        } else if (layer === "rgb") {
            const rgbData = terrain.rgb;
            if (rgbData && rgbData.length > 0) {
                for (let i = 0; i < rgbData.length; i++) {
                    const item = rgbData[i];
                    if (!item || (item[0] === 0 && item[1] === 0 && item[2] === 0)) {
                        colors[i * 3] = 0.08;
                        colors[i * 3 + 1] = 0.10;
                        colors[i * 3 + 2] = 0.12;
                    } else {
                        colors[i * 3] = sentinelReflectanceToAlbedo(item[0]);
                        colors[i * 3 + 1] = sentinelReflectanceToAlbedo(item[1]);
                        colors[i * 3 + 2] = sentinelReflectanceToAlbedo(item[2]);
                    }
                }
            }
        } else if (layer === "ndvi") {
            const ndviData = terrain.ndvi;
            if (ndviData && ndviData.length > 0) {
                for (let i = 0; i < ndviData.length; i++) {
                    ndviColor(ndviData[i], C_NDVI_TEMP);
                    colors[i * 3] = C_NDVI_TEMP.r;
                    colors[i * 3 + 1] = C_NDVI_TEMP.g;
                    colors[i * 3 + 2] = C_NDVI_TEMP.b;
                }
            }
        } else {
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
        }


        attribute.needsUpdate =
            true;

        console.log(`[PERF:TERRAIN_COLOR] Layer "${layer}" vertex colors updated in ${(performance.now() - t0).toFixed(2)}ms`);

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
                roughness={0.86}
                metalness={0.01}
            />

        </mesh>
    );
}

interface TerrainMeta {
    centerX: number;
    centerY: number;
    elevationMean: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    areaM2: number;
    areaHa: number;
}

interface BuildingSceneInfo {
    center: THREE.Vector3;
    size: THREE.Vector3;
    radius: number;
}

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function SpatialMeasurementLine({
    centerA,
    centerB
}: {
    centerA: THREE.Vector3;
    centerB: THREE.Vector3;
}) {
    const { position, quaternion, length } = useMemo(() => {
        const dir = centerB.clone().sub(centerA);
        const len = dir.length();
        const mid = centerA.clone().add(centerB).multiplyScalar(0.5);
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion();
        if (len > 1e-4) {
            quat.setFromUnitVectors(up, dir.clone().normalize());
        }
        return { position: mid, quaternion: quat, length: len };
    }, [centerA, centerB]);

    if (length < 1e-3) return null;

    return (
        <group renderOrder={999}>
            {/* Solid 3D measurement cylinder */}
            <mesh position={position} quaternion={quaternion} raycast={() => null}>
                <cylinderGeometry args={[0.45, 0.45, length, 8]} />
                <meshBasicMaterial
                    color="#f59e0b"
                    depthTest={false}
                    transparent
                    opacity={0.92}
                />
            </mesh>

            {/* Origin endpoint marker (Cyan sphere) */}
            <mesh position={centerA} raycast={() => null}>
                <sphereGeometry args={[1.5, 16, 16]} />
                <meshBasicMaterial
                    color="#38bdf8"
                    depthTest={false}
                />
            </mesh>

            {/* Target endpoint marker (Amber sphere) */}
            <mesh position={centerB} raycast={() => null}>
                <sphereGeometry args={[1.5, 16, 16]} />
                <meshBasicMaterial
                    color="#fbbf24"
                    depthTest={false}
                />
            </mesh>
        </group>
    );
}

function NZBuildingMesh({
    building,
    terrain,
    terrainMeta,
    isOrigin,
    isTarget,
    isDeemphasized,
    measureMode,
    onSelect,
    onMeasureSelect
}: {
    building: NZBuilding;
    terrain: NZTerrainData;
    terrainMeta: TerrainMeta;
    isOrigin: boolean;
    isTarget: boolean;
    isDeemphasized: boolean;
    measureMode: boolean;
    onSelect: (
        building: NZBuilding
    ) => void;
    onMeasureSelect?: (
        building: NZBuilding
    ) => void;
}) {

    const geometry =
        useMemo(() => {

            const t0 = performance.now();
            const points =
                building.vertices;

            const terrainVertices =
                terrain.vertices;
            
            const centerX = terrainMeta.centerX;
            const centerY = terrainMeta.centerY;
            const elevationMean = terrainMeta.elevationMean;

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
            // Vertical positioning:
            // Terrain has 1.5x vertical exaggeration relative to elevationMean.
            // Building height retains strict 1.0x physical scale.
            // -------------------------------------------------

            const buildingBaseElevation =
                building.min_elevation;

            const terrainVisualGroundY =
                (localGroundElevation - elevationMean) * 1.5;


            // -------------------------------------------------
            // Build geometry: 1.0x physical building height on 1.5x terrain
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

                    // Physical delta height above building base scaled at 1.0x
                    positions[i * 3 + 1] =
                        terrainVisualGroundY +
                        (point[2] - buildingBaseElevation) * 1.0;

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

            const dt = performance.now() - t0;
            const w = window as any;
            w.__nzBuildingsPerf = w.__nzBuildingsPerf || { count: 0, totalTime: 0 };
            w.__nzBuildingsPerf.count++;
            w.__nzBuildingsPerf.totalTime += dt;
            if (w.__nzBuildingsPerf.count === 56) {
                console.log(`[PERF:BUILDINGS_GEO] All 56 building geometries created in ${w.__nzBuildingsPerf.totalTime.toFixed(2)}ms`);
            }

            return geo;

        }, [
            building,
            terrain,
            terrainMeta
        ]);


    return (
        <group>
            <mesh
                geometry={geometry}
                castShadow={!isDeemphasized}
                onClick={(event) => {
                    event.stopPropagation();
                    if (measureMode) {
                        if (!isOrigin && onMeasureSelect) {
                            onMeasureSelect(building);
                        }
                    } else {
                        onSelect(building);
                    }
                }}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    if (measureMode) {
                        document.body.style.cursor = isOrigin ? "not-allowed" : "crosshair";
                    } else {
                        document.body.style.cursor = "pointer";
                    }
                }}
                onPointerOut={() => {
                    document.body.style.cursor = measureMode ? "crosshair" : "auto";
                }}
            >
                <meshStandardMaterial
                    vertexColors={true}
                    side={THREE.DoubleSide}
                    roughness={isOrigin || isTarget ? 0.45 : isDeemphasized ? 0.88 : 0.72}
                    metalness={0.0}
                    color={isDeemphasized ? "#76869a" : "#ffffff"}
                    transparent={isDeemphasized}
                    opacity={isDeemphasized ? 0.55 : 1.0}
                    depthWrite={true}
                    emissive={isOrigin ? "#0ea5e9" : isTarget ? "#f59e0b" : "#000000"}
                    emissiveIntensity={isOrigin || isTarget ? 0.35 : 0.0}
                />
            </mesh>

            {(isOrigin || isTarget) && (
                <mesh geometry={geometry} raycast={() => null}>
                    <meshBasicMaterial
                        color={isOrigin ? "#38bdf8" : "#fbbf24"}
                        wireframe
                        transparent
                        opacity={0.65}
                        depthTest={true}
                    />
                </mesh>
            )}
        </group>
    );
}

export interface CameraPresetItem {
    id: "full" | "eastern_ridge" | "northern_corridor";
    name: string;
    badge: string;
    position: [number, number, number];
    target: [number, number, number];
}

export const CAMERA_PRESETS: CameraPresetItem[] = [
    {
        id: "full",
        name: "Full Site",
        badge: "960 × 1,440 m",
        position: [460, 410, 680],
        target: [0, -10, 0]
    },
    {
        id: "eastern_ridge",
        name: "Eastern Ridge",
        badge: "Ridge (~18 bldgs)",
        position: [480, 110, 360],
        target: [280, 8, 140]
    },
    {
        id: "northern_corridor",
        name: "Northern Corridor",
        badge: "Corridor (~32 bldgs)",
        position: [-80, 110, 760],
        target: [-190, -25, 460]
    }
];

function CameraController({
    selectedBuilding,
    buildingSceneInfoMap,
    controlsRef,
    presetRequest,
    onUserOrbit
}: {
    selectedBuilding: NZBuilding | null;
    buildingSceneInfoMap: Map<string, BuildingSceneInfo>;
    controlsRef: React.RefObject<any>;
    presetRequest: {
        id: string;
        target: THREE.Vector3;
        position: THREE.Vector3;
        timestamp: number;
    } | null;
    onUserOrbit?: () => void;
}) {
    const { camera } = useThree();

    const animRef = useRef<{
        active: boolean;
        startTime: number;
        duration: number;
        startPos: THREE.Vector3;
        endPos: THREE.Vector3;
        startTarget: THREE.Vector3;
        endTarget: THREE.Vector3;
    }>({
        active: false,
        startTime: 0,
        duration: 1000,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        startTarget: new THREE.Vector3(),
        endTarget: new THREE.Vector3()
    });

    // If user manually starts manipulating orbit controls, gracefully cancel the programmatic transition
    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls) return;

        const onUserStart = () => {
            if (animRef.current.active) {
                animRef.current.active = false;
            }
            if (onUserOrbit) {
                onUserOrbit();
            }
        };

        controls.addEventListener("start", onUserStart);
        return () => {
            controls.removeEventListener("start", onUserStart);
        };
    }, [controlsRef, onUserOrbit]);

    const prevBuildingIdRef = useRef<string | null>(null);

    // Animate to selected building
    useEffect(() => {
        if (!selectedBuilding) {
            // When inspector is closed (selectedBuilding becomes null):
            // Camera remains at its current position (no reset)
            prevBuildingIdRef.current = null;
            return;
        }

        if (selectedBuilding.id === prevBuildingIdRef.current) {
            return;
        }
        prevBuildingIdRef.current = selectedBuilding.id;

        const controls = controlsRef.current;
        if (!controls) return;

        const info = buildingSceneInfoMap.get(selectedBuilding.id);
        if (!info) return;

        // Framing distance calculation:
        const boundingDiameter = Math.max(info.radius * 2, info.size.x, info.size.y, info.size.z);
        let targetDistance = boundingDiameter * 2.3;
        targetDistance = THREE.MathUtils.clamp(targetDistance, 90, 220);

        // Determine camera offset direction:
        // Preserve user's current azimuth (horizontal angle) with an elevated 3D perspective pitch
        const currentTarget = controls.target.clone();
        const currentCameraPos = camera.position.clone();
        const currentOffset = currentCameraPos.clone().sub(currentTarget);

        let dirX = currentOffset.x;
        let dirZ = currentOffset.z;
        const horizDist = Math.sqrt(dirX * dirX + dirZ * dirZ);

        let offsetDir: THREE.Vector3;
        if (horizDist < 1e-2) {
            // Default perspective: south-southeast looking northwest
            offsetDir = new THREE.Vector3(0.55, 0.45, 0.70).normalize();
        } else {
            dirX /= horizDist;
            dirZ /= horizDist;
            // Elevation pitch angle: clamp between 26° (0.45 rad) and 42° (0.73 rad)
            const currentPitch = Math.atan2(currentOffset.y, horizDist);
            const targetPitch = THREE.MathUtils.clamp(currentPitch, 0.45, 0.70);
            const cosPitch = Math.cos(targetPitch);
            const sinPitch = Math.sin(targetPitch);

            offsetDir = new THREE.Vector3(dirX * cosPitch, sinPitch, dirZ * cosPitch).normalize();
        }

        const endTarget = info.center.clone();
        const endPos = info.center.clone().add(offsetDir.clone().multiplyScalar(targetDistance));

        animRef.current = {
            active: true,
            startTime: performance.now(),
            duration: 1000,
            startPos: currentCameraPos,
            endPos,
            startTarget: currentTarget,
            endTarget
        };
    }, [selectedBuilding, buildingSceneInfoMap, camera, controlsRef]);

    const prevPresetTimestampRef = useRef<number>(0);

    // Animate to selected camera preset
    useEffect(() => {
        if (!presetRequest || presetRequest.timestamp === prevPresetTimestampRef.current) {
            return;
        }
        prevPresetTimestampRef.current = presetRequest.timestamp;

        const controls = controlsRef.current;
        if (!controls) return;

        animRef.current = {
            active: true,
            startTime: performance.now(),
            duration: 1100,
            startPos: camera.position.clone(),
            endPos: presetRequest.position.clone(),
            startTarget: controls.target.clone(),
            endTarget: presetRequest.target.clone()
        };
    }, [presetRequest, camera, controlsRef]);

    useFrame(() => {
        if (!animRef.current.active) return;
        const controls = controlsRef.current;
        if (!controls) return;

        const now = performance.now();
        const elapsed = now - animRef.current.startTime;
        const progress = Math.min(1, elapsed / animRef.current.duration);
        const ease = easeInOutCubic(progress);

        camera.position.lerpVectors(animRef.current.startPos, animRef.current.endPos, ease);
        controls.target.lerpVectors(animRef.current.startTarget, animRef.current.endTarget, ease);
        controls.update();

        if (progress >= 1) {
            animRef.current.active = false;
        }
    });

    const { scene } = useThree();

    useEffect(() => {
        (window as any).__nzSceneState = {
            camera,
            scene,
            controls: controlsRef.current,
            buildingSceneInfoMap
        };
    }, [camera, scene, controlsRef, buildingSceneInfoMap]);

    return null;
}


function PerfFrameTracker() {
    const rendered = useRef(false);
    useFrame(() => {
        if (!rendered.current) {
            rendered.current = true;
            const t = performance.now();
            const start = (window as any).__nzStartTime || t;
            console.log(`[PERF:FIRST_FRAME] First WebGL frame rendered: ${(t - start).toFixed(2)}ms total initial load time`);
        }
    });
    return null;
}


export interface BuildingLocalComparison {
    baselineLabel: string;
    isFallback: boolean;
    nearbyCount100m: number;
    heightDelta: number;
    nearbyHeightAvg: number;
    heightRank: number;
    heightPercentile: number;
    areaDelta: number;
    nearbyAreaAvg: number;
    areaRatio: number;
    groundDelta: number;
    nearbyGroundAvg: number;
    nearestBuildingId: string;
    nearestDistance: number;
    nearestHeightDelta: number;
    nearestRelativeText: string;
}

export interface BuildingSiteAnalysis {
    groundElevation: number;
    localSlope: number;
    terrainClass: "Flat" | "Moderate" | "Steep";
    relativeElevation: number;
    elevationClass: "Low" | "Moderate" | "High";
    nearbyCount50m: number;
    nearestBuildingId: string;
    nearestDistance: number;
    proximityClass: "Low" | "Moderate" | "High";
    meanNdvi: number;
    vegetationClass: "Low vegetation" | "Moderate vegetation" | "High vegetation";
    spatialContext: "Low" | "Moderate" | "High";
    contextScore: number;
    overallAttention?: "Low" | "Moderate" | "High";
    attentionScore?: number;
    comparison: BuildingLocalComparison;
}

function PropertyIntelligencePanel({
    building,
    analysis,
    measureMode,
    measureTarget,
    targetAnalysis,
    onStartMeasure,
    onClearMeasure,
    onSelectDifferentTarget,
    onOpenDossier,
    onClose
}: {
    building: NZBuilding;
    analysis?: BuildingSiteAnalysis;
    measureMode: boolean;
    measureTarget: NZBuilding | null;
    targetAnalysis?: BuildingSiteAnalysis;
    onStartMeasure: () => void;
    onClearMeasure: () => void;
    onSelectDifferentTarget: () => void;
    onOpenDossier: () => void;
    onClose: () => void;
}) {
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [exportPdfSuccess, setExportPdfSuccess] = useState(false);

    const handleExportDossierPdf = () => {
        setIsExportingPdf(true);
        try {
            let pairwise: PairwiseMeasurementData | null = null;
            if (measureMode && measureTarget) {
                const cxA = (building.bounds.min_x + building.bounds.max_x) / 2;
                const cyA = (building.bounds.min_y + building.bounds.max_y) / 2;
                const cxB = (measureTarget.bounds.min_x + measureTarget.bounds.max_x) / 2;
                const cyB = (measureTarget.bounds.min_y + measureTarget.bounds.max_y) / 2;
                const horizDist = Math.hypot(cxB - cxA, cyB - cyA);
                const groundA = analysis?.groundElevation ?? building.ground_elevation;
                const groundB = targetAnalysis?.groundElevation ?? measureTarget.ground_elevation;
                const baseDiff = groundB - groundA;
                const heightDiff = building.height - measureTarget.height;
                const dist3D = Math.sqrt(horizDist * horizDist + baseDiff * baseDiff);
                pairwise = {
                    targetId: measureTarget.id,
                    targetHeight: measureTarget.height,
                    targetGroundElevation: groundB,
                    horizontalDistance: horizDist,
                    distance3D: dist3D,
                    baseElevationDiff: baseDiff,
                    heightDiff: heightDiff
                };
            }

            exportBuildingDossierPdf({
                building,
                analysis,
                pairwise,
                datasetName: "New Zealand LiDAR + Sentinel-2",
                crsName: "EPSG:2193 (NZGD2000 / NZTM2000)"
            });
            setExportPdfSuccess(true);
            setTimeout(() => setExportPdfSuccess(false), 2500);
        } catch (err) {
            console.error("Failed to generate dossier PDF:", err);
        } finally {
            setIsExportingPdf(false);
        }
    };

    // 1. PROPERTY
    const width = building.bounds.max_x - building.bounds.min_x;
    const depth = building.bounds.max_y - building.bounds.min_y;
    const centroidX = (building.bounds.min_x + building.bounds.max_x) / 2;
    const centroidY = (building.bounds.min_y + building.bounds.max_y) / 2;
    const bboxArea = width * depth;

    // 2. ELEVATION
    const estimatedStoreys = Math.max(1, Math.round(building.height / 3.2));

    // 3. LiDAR
    // building.point_count, building.triangle_count, building.min_elevation, building.max_elevation

    // 4. ENVIRONMENT
    const meanNdvi =
        building.ndvi && building.ndvi.length > 0
            ? building.ndvi.reduce((sum, v) => sum + v, 0) / building.ndvi.length
            : 0;

    let ndviInterpretation = "Impervious Surface";
    if (meanNdvi >= 0.35) {
        ndviInterpretation = "Vegetated Surface";
    } else if (meanNdvi >= 0.22) {
        ndviInterpretation = "Mixed / Canopy Overhang";
    } else if (meanNdvi >= 0.12) {
        ndviInterpretation = "Built / Low Canopy";
    }

    const enhanceSrgb = (v: number) => {
        const clamped = THREE.MathUtils.clamp(v * 2.2, 0, 1);
        return clamped <= 0.0031308
            ? 12.92 * clamped
            : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    };

    const meanRgb =
        building.rgb && building.rgb.length > 0
            ? [
                building.rgb.reduce((s, c) => s + c[0], 0) / building.rgb.length,
                building.rgb.reduce((s, c) => s + c[1], 0) / building.rgb.length,
                building.rgb.reduce((s, c) => s + c[2], 0) / building.rgb.length,
            ]
            : [0.5, 0.5, 0.5];

    const swatchR = Math.round(enhanceSrgb(meanRgb[0]) * 255);
    const swatchG = Math.round(enhanceSrgb(meanRgb[1]) * 255);
    const swatchB = Math.round(enhanceSrgb(meanRgb[2]) * 255);
    const swatchCss = `rgb(${swatchR}, ${swatchG}, ${swatchB})`;

    return (
        <div className="nz-overlay nz-property">
            <button
                className="nz-close"
                onClick={onClose}
                aria-label="Close Property Intelligence"
            >
                ×
            </button>

            <div className="nz-kicker">
                PROPERTY INTELLIGENCE
            </div>

            <div className="nz-property-header">
                <h3>{building.id}</h3>
                <span className="nz-class-badge">Class 6 · Structure</span>
            </div>

            {/* 1. PROPERTY */}
            <div className="nz-section-title">1. PROPERTY</div>
            <div className="nz-property-grid">
                <div className="nz-prop-item nz-prop-full">
                    <span>Centroid (NZTM2000)</span>
                    <strong>
                        {centroidX.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} E · {centroidY.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} N
                    </strong>
                </div>
                <div className="nz-prop-item">
                    <span>Footprint (W × D)</span>
                    <strong>{width.toFixed(1)} m × {depth.toFixed(1)} m</strong>
                </div>
                <div className="nz-prop-item">
                    <span>BBox Area</span>
                    <strong>{Math.round(bboxArea).toLocaleString()} m²</strong>
                </div>
            </div>

            {/* 2. ELEVATION */}
            <div className="nz-section-title">2. ELEVATION</div>
            <div className="nz-property-grid">
                <div className="nz-prop-item">
                    <span>Ground Elevation</span>
                    <strong>{building.ground_elevation.toFixed(2)} m</strong>
                </div>
                <div className="nz-prop-item">
                    <span>Roof Elevation</span>
                    <strong>{building.roof_elevation.toFixed(2)} m</strong>
                </div>
                <div className="nz-prop-item">
                    <span>Building Height</span>
                    <strong>{building.height.toFixed(2)} m</strong>
                </div>
                <div className="nz-prop-item">
                    <span>Est. Storeys</span>
                    <strong>~{estimatedStoreys} {estimatedStoreys === 1 ? "Storey" : "Storeys"}</strong>
                </div>
            </div>

            {/* 3. LiDAR */}
            <div className="nz-section-title">3. LiDAR</div>
            <div className="nz-property-grid">
                <div className="nz-prop-item">
                    <span>Point Count</span>
                    <strong>{building.point_count.toLocaleString()} pts</strong>
                </div>
                <div className="nz-prop-item">
                    <span>Triangles</span>
                    <strong>{building.triangle_count.toLocaleString()} faces</strong>
                </div>
                <div className="nz-prop-item">
                    <span>Min Elevation</span>
                    <strong>{building.min_elevation.toFixed(2)} m</strong>
                </div>
                <div className="nz-prop-item">
                    <span>Max Elevation</span>
                    <strong>{building.max_elevation.toFixed(2)} m</strong>
                </div>
            </div>

            {/* 4. ENVIRONMENT */}
            <div className="nz-section-title">4. ENVIRONMENT</div>
            <div className="nz-property-grid">
                <div className="nz-prop-item">
                    <span>Mean NDVI</span>
                    <strong>{meanNdvi.toFixed(3)}</strong>
                </div>
                <div className="nz-prop-item">
                    <span>Interpretation</span>
                    <strong className="nz-highlight-text">{ndviInterpretation}</strong>
                </div>
                <div className="nz-prop-item nz-prop-full nz-swatch-row">
                    <div className="nz-swatch" style={{ backgroundColor: swatchCss }} />
                    <div>
                        <span>True-Color Swatch</span>
                        <strong>RGB ({swatchR}, {swatchG}, {swatchB})</strong>
                    </div>
                </div>
            </div>

            {/* 5. SITE ANALYSIS */}
            <div className="nz-section-title">5. SITE ANALYSIS</div>
            {analysis && (
                <>
                    <div className="nz-property-grid">
                        <div className="nz-prop-item">
                            <span>Indicative Slope</span>
                            <strong>
                                {analysis.localSlope.toFixed(1)}° · <span className="nz-highlight-text">{analysis.terrainClass}</span>
                            </strong>
                        </div>
                        <div className="nz-prop-item">
                            <span>Elevation Context</span>
                            <strong>
                                {analysis.relativeElevation.toFixed(2)} · <span className="nz-highlight-text">{analysis.elevationClass}</span>
                            </strong>
                        </div>
                        <div className="nz-prop-item">
                            <span>Nearby Buildings</span>
                            <strong>
                                {analysis.nearbyCount50m} {analysis.nearbyCount50m === 1 ? "structure" : "structures"} <small style={{ color: "#94a3b8", fontWeight: 400 }}>(≤50m)</small>
                            </strong>
                        </div>
                        <div className="nz-prop-item">
                            <span>Nearest Building</span>
                            <strong>
                                {analysis.nearestDistance.toFixed(1)} m <small style={{ color: "#38bdf8", fontWeight: 500 }}>({analysis.nearestBuildingId})</small>
                            </strong>
                        </div>
                        <div className="nz-prop-item nz-prop-full">
                            <span>Vegetation Condition</span>
                            <strong>
                                <span className="nz-highlight-text">{analysis.vegetationClass}</span> · NDVI {analysis.meanNdvi.toFixed(3)}
                            </strong>
                        </div>
                    </div>

                    <div className="nz-site-summary">
                        <div className="nz-site-summary-header">
                            <span>INDICATIVE SITE CONDITION</span>
                            <span className={`nz-context-badge nz-context-${analysis.spatialContext.toLowerCase()}`}>
                                Spatial Context: {analysis.spatialContext}
                            </span>
                        </div>
                        <div className="nz-summary-matrix">
                            <div className="nz-summary-cell">
                                <span className="nz-cell-label">Terrain</span>
                                <strong className="nz-cell-val">{analysis.terrainClass}</strong>
                            </div>
                            <div className="nz-summary-cell">
                                <span className="nz-cell-label">Elevation</span>
                                <strong className="nz-cell-val">{analysis.elevationClass}</strong>
                            </div>
                            <div className="nz-summary-cell">
                                <span className="nz-cell-label">Vegetation</span>
                                <strong className="nz-cell-val">{analysis.vegetationClass.replace(" vegetation", "")}</strong>
                            </div>
                            <div className="nz-summary-cell">
                                <span className="nz-cell-label">Proximity</span>
                                <strong className="nz-cell-val">{analysis.proximityClass}</strong>
                            </div>
                        </div>
                        <div className="nz-disclaimer">
                            Indicative spatial context derived from LiDAR terrain and Sentinel-2 data. Not an engineering, flood-risk, structural, or regulatory assessment.
                        </div>
                    </div>
                </>
            )}

            {/* 6. LOCAL COMPARISON */}
            <div className="nz-section-title">6. LOCAL COMPARISON</div>
            {analysis?.comparison && (
                <>
                    <div className="nz-comparison-baseline">
                        <span>Neighborhood Baseline</span>
                        <strong className={analysis.comparison.isFallback ? "nz-fallback-text" : ""}>
                            {analysis.comparison.baselineLabel}
                        </strong>
                    </div>

                    <div className="nz-property-grid">
                        {/* Height Standing */}
                        <div className="nz-prop-item">
                            <span>Height vs Local Avg</span>
                            <strong>
                                <span className={analysis.comparison.heightDelta >= 0 ? "nz-delta-pos" : "nz-delta-neg"}>
                                    {analysis.comparison.heightDelta >= 0 ? "+" : ""}{analysis.comparison.heightDelta.toFixed(1)} m
                                </span>
                                <small className="nz-sub-metric"> vs {analysis.comparison.nearbyHeightAvg.toFixed(1)} m</small>
                            </strong>
                            <div className="nz-prop-note">
                                Rank #{analysis.comparison.heightRank} of 56 <small>({analysis.comparison.heightPercentile <= 50 ? `Top ${analysis.comparison.heightPercentile}%` : `Bottom ${100 - analysis.comparison.heightPercentile}%`})</small>
                            </div>
                        </div>

                        {/* Est. Footprint (BBox) */}
                        <div className="nz-prop-item">
                            <span>Est. Footprint (BBox)</span>
                            <strong>
                                <span className={analysis.comparison.areaDelta >= 0 ? "nz-delta-pos" : "nz-delta-neg"}>
                                    {analysis.comparison.areaDelta >= 0 ? "+" : ""}{Math.round(analysis.comparison.areaDelta)} m²
                                </span>
                                <small className="nz-sub-metric"> vs {Math.round(analysis.comparison.nearbyAreaAvg)} m²</small>
                            </strong>
                            <div className="nz-prop-note">
                                {analysis.comparison.areaRatio.toFixed(1)}× neighborhood mean
                            </div>
                        </div>

                        {/* Ground Base vs Local Avg */}
                        <div className="nz-prop-item">
                            <span>Ground Base vs Local Avg</span>
                            <strong>
                                <span className={analysis.comparison.groundDelta >= 0 ? "nz-delta-pos" : "nz-delta-neg"}>
                                    {analysis.comparison.groundDelta >= 0 ? "+" : ""}{analysis.comparison.groundDelta.toFixed(1)} m
                                </span>
                            </strong>
                            <div className="nz-prop-note">
                                {analysis.comparison.groundDelta >= 0 ? "Above local base" : "Below local base"}
                            </div>
                        </div>

                        {/* Nearest Structure */}
                        <div className="nz-prop-item">
                            <span>Nearest Structure</span>
                            <strong>
                                {analysis.comparison.nearestBuildingId} <small className="nz-sub-metric">· {analysis.comparison.nearestDistance.toFixed(1)}m away</small>
                            </strong>
                            <div className="nz-prop-note nz-highlight-text">
                                {analysis.comparison.nearestRelativeText}
                            </div>
                        </div>
                    </div>

                    <div className="nz-disclaimer">
                        Indicative comparative values relative to available tile structures. Not official zoning or cadastral data.
                    </div>
                </>
            )}

            {/* 7. SPATIAL MEASUREMENT */}
            <div className="nz-section-title">7. SPATIAL MEASUREMENT</div>
            {!measureMode && (
                <div className="nz-measure-trigger-wrap">
                    <button
                        type="button"
                        className="nz-btn-measure-trigger"
                        onClick={onStartMeasure}
                    >
                        📐 Measure to Structure
                    </button>
                    <div className="nz-prop-note">
                        Measure centroid distance and elevation delta to another structure.
                    </div>
                </div>
            )}

            {measureMode && !measureTarget && (
                <div className="nz-measure-active-card">
                    <div className="nz-measure-active-header">
                        <span className="nz-measure-pill">MEASUREMENT MODE</span>
                        <button
                            type="button"
                            className="nz-btn-measure-close"
                            onClick={onClearMeasure}
                            title="Cancel measurement"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="nz-measure-instruction">
                        <span className="nz-measure-dot" />
                        Measurement mode · Click a target structure
                    </div>
                    <div className="nz-measure-pair-banner">
                        <div className="nz-pair-node">
                            <span className="nz-node-role">Origin (A)</span>
                            <strong className="nz-badge-origin">{building.id}</strong>
                        </div>
                    </div>
                    <div className="nz-measure-btn-row">
                        <button
                            type="button"
                            className="nz-btn-measure-action nz-btn-clear-measure"
                            onClick={onClearMeasure}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {measureMode && measureTarget && (
                (() => {
                    const cxA = (building.bounds.min_x + building.bounds.max_x) / 2;
                    const cyA = (building.bounds.min_y + building.bounds.max_y) / 2;
                    const cxB = (measureTarget.bounds.min_x + measureTarget.bounds.max_x) / 2;
                    const cyB = (measureTarget.bounds.min_y + measureTarget.bounds.max_y) / 2;

                    const horizontalDistance = Math.hypot(cxB - cxA, cyB - cyA);

                    const groundA = analysis?.groundElevation ?? building.ground_elevation;
                    const groundB = targetAnalysis?.groundElevation ?? measureTarget.ground_elevation;
                    const baseDiff = groundB - groundA;

                    const heightDiff = building.height - measureTarget.height;

                    const distance3D = Math.sqrt(horizontalDistance * horizontalDistance + baseDiff * baseDiff);

                    const baseDiffText =
                        baseDiff > 0.05
                            ? "B is higher"
                            : baseDiff < -0.05
                            ? "A is higher"
                            : "Similar base level";

                    const heightDiffText =
                        heightDiff > 0.05
                            ? "A is taller"
                            : heightDiff < -0.05
                            ? "B is taller"
                            : "Similar height";

                    return (
                        <div className="nz-measure-result-card">
                            <div className="nz-measure-result-header">
                                <span className="nz-measure-pill nz-pill-amber">PAIR MEASUREMENT</span>
                                <button
                                    type="button"
                                    className="nz-btn-measure-close"
                                    onClick={onClearMeasure}
                                    title="Clear measurement"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="nz-measure-pair-banner">
                                <div className="nz-pair-node">
                                    <span className="nz-node-role">Origin (A)</span>
                                    <strong className="nz-badge-origin">{building.id}</strong>
                                </div>
                                <span className="nz-arrow">→</span>
                                <div className="nz-pair-node">
                                    <span className="nz-node-role">Target (B)</span>
                                    <strong className="nz-badge-target">{measureTarget.id}</strong>
                                </div>
                            </div>

                            <div className="nz-property-grid nz-measure-grid">
                                <div className="nz-prop-item nz-prop-span2">
                                    <span>Horizontal Distance</span>
                                    <strong className="nz-measure-val">
                                        {horizontalDistance.toFixed(1)} m
                                    </strong>
                                    <div className="nz-prop-note">Horizontal Distance · Centroid-to-Centroid</div>
                                </div>

                                <div className="nz-prop-item nz-prop-span2">
                                    <span>3D Straight-Line</span>
                                    <strong className="nz-measure-val">
                                        {distance3D.toFixed(1)} m
                                    </strong>
                                </div>

                                <div className="nz-prop-item">
                                    <span>Base Elevation Difference</span>
                                    <strong>
                                        <span className={baseDiff > 0.05 ? "nz-delta-pos" : baseDiff < -0.05 ? "nz-delta-neg" : ""}>
                                            {baseDiff > 0.05 ? "+" : ""}{baseDiff.toFixed(1)} m
                                        </span>
                                    </strong>
                                    <div className="nz-prop-note">
                                        {baseDiffText}
                                    </div>
                                </div>

                                <div className="nz-prop-item">
                                    <span>Height Difference</span>
                                    <strong>
                                        <span className={heightDiff > 0.05 ? "nz-delta-pos" : heightDiff < -0.05 ? "nz-delta-neg" : ""}>
                                            {heightDiff > 0.05 ? "+" : ""}{heightDiff.toFixed(1)} m
                                        </span>
                                    </strong>
                                    <div className="nz-prop-note">
                                        {heightDiffText}
                                    </div>
                                </div>
                            </div>

                            <div className="nz-measure-btn-row">
                                <button
                                    type="button"
                                    className="nz-btn-measure-action nz-btn-change-target"
                                    onClick={onSelectDifferentTarget}
                                >
                                    Select Different Target
                                </button>
                                <button
                                    type="button"
                                    className="nz-btn-measure-action nz-btn-clear-measure"
                                    onClick={onClearMeasure}
                                >
                                    Clear
                                </button>
                            </div>

                            <div className="nz-disclaimer">
                                Indicative spatial measurement based on available LiDAR building data. Not a legal boundary or certified survey measurement.
                            </div>
                        </div>
                    );
                })()
            )}

            {/* 8. MUNICIPAL DOSSIER EXPORT */}
            <div className="nz-section-title">8. SURVEY DOSSIER EXPORT</div>
            <div className="nz-dossier-trigger-wrap">
                <div className="nz-dossier-btn-row">
                    <button
                        type="button"
                        className="nz-btn-dossier-trigger"
                        onClick={handleExportDossierPdf}
                        disabled={isExportingPdf}
                        title="Generate and download official Municipal Survey Dossier PDF"
                    >
                        {isExportingPdf ? "⏳ Generating..." : exportPdfSuccess ? "✓ Dossier Downloaded!" : "📄 Generate Survey Dossier"}
                    </button>
                    <button
                        type="button"
                        className="nz-btn-dossier-preview"
                        onClick={onOpenDossier}
                        title="Preview survey dossier modal"
                    >
                        👁 Preview
                    </button>
                </div>
                <div className="nz-prop-note">
                    Official municipal survey report (PDF) with LiDAR elevation, geometry, Sentinel-2 NDVI, and spatial context.
                </div>
            </div>
        </div>
    );
}

export type SpatialFilterType =
  | "all"
  | "steep"
  | "tall"
  | "high_context"
  | "isolated";

export interface AreaIntelligenceData {
    tileWidth: number;
    tileHeight: number;
    surveyAreaHa: number;
    totalFootprintM2: number;
    coveragePct: number;
    totalBuildings: number;
    avgHeight: number;
    tallestHeight: number;
    tallestBuildingId: string;
    tallCount10m: number;
    slopeFlatCount: number;
    slopeModerateCount: number;
    slopeSteepCount: number;
    contextLowCount: number;
    contextModerateCount: number;
    contextHighCount: number;
    isolatedCount: number;
    ndviMean: number;
    ndviLowPct: number;
    ndviModPct: number;
    ndviHighPct: number;
}

interface AreaIntelligencePanelProps {
    data: AreaIntelligenceData;
    activeFilter: SpatialFilterType;
    onSelectFilter: (filter: SpatialFilterType) => void;
    matchedBuildings: { building: NZBuilding; metricText: string }[];
    onFocusBuilding: (building: NZBuilding) => void;
    onOpenDossier: () => void;
}

function AreaIntelligencePanel({
    data,
    activeFilter,
    onSelectFilter,
    matchedBuildings,
    onFocusBuilding,
    onOpenDossier
}: AreaIntelligencePanelProps) {
    return (
        <div className="nz-overlay nz-area-intel">
            <div className="nz-area-header">
                <div className="nz-kicker">AREA INTELLIGENCE</div>
                <h3>Tile Overview · New Zealand</h3>
                <span>EPSG:2193 · Active LiDAR tile</span>
            </div>

            <div className="nz-area-content">
                {/* SECTION 1: SURVEY SCOPE */}
                <div className="nz-prop-section-title">1. SURVEY SCOPE</div>
                <div className="nz-prop-grid">
                    <div className="nz-prop-item">
                        <span>Tile Dimensions</span>
                        <strong>{data.tileWidth.toLocaleString()} × {data.tileHeight.toLocaleString()} m</strong>
                    </div>
                    <div className="nz-prop-item">
                        <span>Survey Area</span>
                        <strong>{data.surveyAreaHa.toFixed(1)} ha</strong>
                    </div>
                    <div className="nz-prop-item nz-prop-span2">
                        <span>Estimated Built Coverage</span>
                        <strong>
                            {data.totalFootprintM2.toLocaleString()} m²
                            <span className="nz-coverage-pill">{data.coveragePct.toFixed(1)}% of tile area</span>
                        </strong>
                        <div className="nz-prop-note">Estimated from available building bounding boxes</div>
                    </div>
                </div>

                {/* SECTION 2: BUILT ENVIRONMENT */}
                <div className="nz-prop-section-title">2. BUILT ENVIRONMENT</div>
                <div className="nz-prop-grid">
                    <div className="nz-prop-item">
                        <span>Structures</span>
                        <strong>{data.totalBuildings}</strong>
                    </div>
                    <div className="nz-prop-item">
                        <span>Average Height</span>
                        <strong>{data.avgHeight.toFixed(1)} m</strong>
                    </div>
                    <div className="nz-prop-item">
                        <span>Tallest Structure</span>
                        <strong>{data.tallestHeight.toFixed(1)} m</strong>
                        <div className="nz-prop-note">{data.tallestBuildingId}</div>
                    </div>
                    <div className="nz-prop-item">
                        <span>Structures ≥10 m</span>
                        <strong>
                            {data.tallCount10m}
                            <span className="nz-prop-subtext"> of {data.totalBuildings}</span>
                        </strong>
                    </div>
                </div>

                {/* SECTION 3: TERRAIN & SPATIAL CONTEXT */}
                <div className="nz-prop-section-title">3. TERRAIN & SPATIAL CONTEXT</div>

                <div className="nz-distrib-block">
                    <div className="nz-distrib-label">
                        <span>Terrain Slope at Building Sites</span>
                    </div>
                    <div className="nz-distrib-bar">
                        <div
                            className="nz-distrib-seg nz-seg-flat"
                            style={{ width: `${(data.slopeFlatCount / data.totalBuildings) * 100}%` }}
                            title={`Flat: ${data.slopeFlatCount}`}
                        />
                        <div
                            className="nz-distrib-seg nz-seg-mod"
                            style={{ width: `${(data.slopeModerateCount / data.totalBuildings) * 100}%` }}
                            title={`Moderate: ${data.slopeModerateCount}`}
                        />
                        <div
                            className="nz-distrib-seg nz-seg-steep"
                            style={{ width: `${(data.slopeSteepCount / data.totalBuildings) * 100}%` }}
                            title={`Steep: ${data.slopeSteepCount}`}
                        />
                    </div>
                    <div className="nz-distrib-legend">
                        <span className="nz-legend-item"><span className="nz-legend-dot nz-dot-flat" /> {data.slopeFlatCount} Flat</span>
                        <span className="nz-legend-item"><span className="nz-legend-dot nz-dot-mod" /> {data.slopeModerateCount} Moderate</span>
                        <span className="nz-legend-item"><span className="nz-legend-dot nz-dot-steep" /> {data.slopeSteepCount} Steep</span>
                    </div>
                </div>

                <div className="nz-distrib-block" style={{ marginTop: "8px" }}>
                    <div className="nz-distrib-label">
                        <span>Spatial Context Summary</span>
                    </div>
                    <div className="nz-distrib-bar">
                        <div
                            className="nz-distrib-seg nz-seg-ctx-low"
                            style={{ width: `${(data.contextLowCount / data.totalBuildings) * 100}%` }}
                            title={`Low: ${data.contextLowCount}`}
                        />
                        <div
                            className="nz-distrib-seg nz-seg-ctx-mod"
                            style={{ width: `${(data.contextModerateCount / data.totalBuildings) * 100}%` }}
                            title={`Moderate: ${data.contextModerateCount}`}
                        />
                        <div
                            className="nz-distrib-seg nz-seg-ctx-high"
                            style={{ width: `${(data.contextHighCount / data.totalBuildings) * 100}%` }}
                            title={`High: ${data.contextHighCount}`}
                        />
                    </div>
                    <div className="nz-distrib-legend">
                        <span className="nz-legend-item"><span className="nz-legend-dot nz-dot-ctx-low" /> {data.contextLowCount} Low</span>
                        <span className="nz-legend-item"><span className="nz-legend-dot nz-dot-ctx-mod" /> {data.contextModerateCount} Moderate</span>
                        <span className="nz-legend-item"><span className="nz-legend-dot nz-dot-ctx-high" /> {data.contextHighCount} High</span>
                    </div>
                </div>

                <div className="nz-distrib-block" style={{ marginTop: "8px" }}>
                    <div className="nz-distrib-label">
                        <span>Sample-based NDVI Distribution</span>
                        <span className="nz-distrib-val" style={{ color: "#38bdf8", fontWeight: 600 }}>Mean {data.ndviMean.toFixed(2)}</span>
                    </div>
                    <div className="nz-distrib-bar">
                        <div
                            className="nz-distrib-seg nz-seg-ndvi-low"
                            style={{ width: `${data.ndviLowPct}%` }}
                            title={`Low / Impervious (<0.12): ${data.ndviLowPct.toFixed(1)}%`}
                        />
                        <div
                            className="nz-distrib-seg nz-seg-ndvi-mod"
                            style={{ width: `${data.ndviModPct}%` }}
                            title={`Moderate (0.12–0.35): ${data.ndviModPct.toFixed(1)}%`}
                        />
                        <div
                            className="nz-distrib-seg nz-seg-ndvi-high"
                            style={{ width: `${data.ndviHighPct}%` }}
                            title={`High Canopy (≥0.35): ${data.ndviHighPct.toFixed(1)}%`}
                        />
                    </div>
                    <div className="nz-distrib-legend">
                        <span className="nz-legend-item"><span className="nz-legend-dot nz-dot-ndvi-low" /> {data.ndviLowPct.toFixed(1)}% Low</span>
                        <span className="nz-legend-item"><span className="nz-legend-dot nz-dot-ndvi-mod" /> {data.ndviModPct.toFixed(1)}% Mod</span>
                        <span className="nz-legend-item"><span className="nz-legend-dot nz-dot-ndvi-high" /> {data.ndviHighPct.toFixed(1)}% High</span>
                    </div>
                </div>

                {/* SECTION 4: SPATIAL QUERY */}
                <div className="nz-prop-section-title">4. SPATIAL QUERY</div>
                <div className="nz-query-chips">
                    <button
                        type="button"
                        className={`nz-chip-btn ${activeFilter === "all" ? "active" : ""}`}
                        onClick={() => onSelectFilter("all")}
                    >
                        All · {data.totalBuildings}
                    </button>
                    <button
                        type="button"
                        className={`nz-chip-btn ${activeFilter === "steep" ? "active" : ""}`}
                        onClick={() => onSelectFilter("steep")}
                    >
                        Steep Slope · {data.slopeSteepCount}
                    </button>
                    <button
                        type="button"
                        className={`nz-chip-btn ${activeFilter === "tall" ? "active" : ""}`}
                        onClick={() => onSelectFilter("tall")}
                    >
                        Tall Structures · {data.tallCount10m}
                    </button>
                    <button
                        type="button"
                        className={`nz-chip-btn ${activeFilter === "high_context" ? "active" : ""}`}
                        onClick={() => onSelectFilter("high_context")}
                    >
                        High Context · {data.contextHighCount}
                    </button>
                    <button
                        type="button"
                        className={`nz-chip-btn ${activeFilter === "isolated" ? "active" : ""}`}
                        onClick={() => onSelectFilter("isolated")}
                    >
                        Isolated · {data.isolatedCount}
                    </button>
                </div>

                {/* QUERY RESULT DRAWER */}
                {activeFilter !== "all" && (
                    <div className="nz-query-drawer">
                        <div className="nz-query-drawer-header">
                            <span>Matching Structures ({matchedBuildings.length})</span>
                        </div>
                        <div className="nz-query-list">
                            {matchedBuildings.map(({ building, metricText }) => (
                                <div key={building.id} className="nz-query-item">
                                    <div className="nz-query-item-info">
                                        <span className="nz-query-id">{building.id}</span>
                                        <span className="nz-query-metric">{metricText}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="nz-btn-query-focus"
                                        onClick={() => onFocusBuilding(building)}
                                        title={`Focus camera on ${building.id}`}
                                    >
                                        Focus
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* INTERACTION PROMPT */}
                <div className="nz-area-prompt">
                    <span className="nz-prompt-icon">📍</span>
                    <span>Click any structure in 3D to open Property Intelligence.</span>
                </div>

                {/* 6. MUNICIPAL SUMMARY EXPORT */}
                <div className="nz-dossier-trigger-wrap" style={{ marginTop: "10px" }}>
                    <div className="nz-dossier-btn-row">
                        <button
                            type="button"
                            className="nz-btn-dossier-trigger"
                            onClick={() => {
                                exportAreaSummaryPdf({
                                    areaData: data,
                                    terrainMeta: (window as any).__nzTwinState?.terrainMeta,
                                    activeFilter,
                                    matchedBuildingsCount: matchedBuildings.length
                                });
                            }}
                            title="Generate and download Tile Geospatial Area Summary PDF"
                        >
                            📄 Export Area Summary
                        </button>
                        <button
                            type="button"
                            className="nz-btn-dossier-preview"
                            onClick={onOpenDossier}
                            title="Preview area geospatial summary modal"
                        >
                            👁 Preview
                        </button>
                    </div>
                    <div className="nz-prop-note">
                        Export tile geospatial aggregates, print PDF, or download JSON.
                    </div>
                </div>

                {/* FOOTER DISCLAIMER */}
                <div className="nz-property-disclaimer" style={{ marginTop: "8px" }}>
                    NDVI and Sentinel-2 true-color values are derived from satellite reflectance mapped onto airborne LiDAR terrain. Vegetation classes are indicative and sample-based, not a certified environmental or land-cover survey.
                </div>
            </div>
        </div>
    );
}

function downloadJsonFile(filename: string, data: object) {
    const text = JSON.stringify(data, null, 2);
    const blob = new Blob([text], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function copyJsonToClipboard(data: object): Promise<boolean> {
    const text = JSON.stringify(data, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const success = document.execCommand("copy");
        document.body.removeChild(ta);
        return Promise.resolve(success);
    } catch {
        return Promise.resolve(false);
    }
}

interface DossierModalProps {
    type: "building" | "area";
    isOpen: boolean;
    onClose: () => void;
    building?: NZBuilding | null;
    analysis?: BuildingSiteAnalysis;
    measureTarget?: NZBuilding | null;
    targetAnalysis?: BuildingSiteAnalysis;
    areaData?: AreaIntelligenceData;
    terrainMeta?: TerrainMeta | null;
    elevationMin?: number;
    elevationMax?: number;
    activeFilter?: SpatialFilterType;
    matchedBuildings?: { building: NZBuilding; metricText: string }[];
}

function DossierModal({
    type,
    isOpen,
    onClose,
    building,
    analysis,
    measureTarget,
    targetAnalysis,
    areaData,
    terrainMeta,
    elevationMin = 0,
    elevationMax = 0,
    activeFilter = "all",
    matchedBuildings = []
}: DossierModalProps) {
    const [copied, setCopied] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isBuilding = type === "building" && !!building;

    // 1. Structure calculations
    const width = building ? building.bounds.max_x - building.bounds.min_x : 0;
    const depth = building ? building.bounds.max_y - building.bounds.min_y : 0;
    const centroidX = building ? (building.bounds.min_x + building.bounds.max_x) / 2 : 0;
    const centroidY = building ? (building.bounds.min_y + building.bounds.max_y) / 2 : 0;
    const bboxArea = width * depth;
    const estimatedStoreys = building ? Math.max(1, Math.round(building.height / 3.2)) : 1;
    const meanNdvi = building?.ndvi && building.ndvi.length > 0
        ? building.ndvi.reduce((sum, v) => sum + v, 0) / building.ndvi.length
        : 0;

    let ndviInterpretation = "Impervious Surface";
    if (meanNdvi >= 0.35) ndviInterpretation = "Vegetated Surface";
    else if (meanNdvi >= 0.22) ndviInterpretation = "Mixed / Canopy Overhang";
    else if (meanNdvi >= 0.12) ndviInterpretation = "Built / Low Canopy";

    const enhanceSrgb = (v: number) => {
        const clamped = THREE.MathUtils.clamp(v * 2.2, 0, 1);
        return clamped <= 0.0031308
            ? 12.92 * clamped
            : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    };

    const meanRgb = building?.rgb && building.rgb.length > 0
        ? [
            building.rgb.reduce((s, c) => s + c[0], 0) / building.rgb.length,
            building.rgb.reduce((s, c) => s + c[1], 0) / building.rgb.length,
            building.rgb.reduce((s, c) => s + c[2], 0) / building.rgb.length
        ]
        : [0.5, 0.5, 0.5];

    const srgbColor = `rgb(${Math.round(enhanceSrgb(meanRgb[0]) * 255)}, ${Math.round(enhanceSrgb(meanRgb[1]) * 255)}, ${Math.round(enhanceSrgb(meanRgb[2]) * 255)})`;

    // 2. Pairwise measurement (if active)
    let pairwise = null;
    if (isBuilding && building && measureTarget) {
        const cxA = (building.bounds.min_x + building.bounds.max_x) / 2;
        const cyA = (building.bounds.min_y + building.bounds.max_y) / 2;
        const cxB = (measureTarget.bounds.min_x + measureTarget.bounds.max_x) / 2;
        const cyB = (measureTarget.bounds.min_y + measureTarget.bounds.max_y) / 2;
        const horizDist = Math.hypot(cxB - cxA, cyB - cyA);
        const groundA = analysis?.groundElevation ?? building.ground_elevation;
        const groundB = targetAnalysis?.groundElevation ?? measureTarget.ground_elevation;
        const baseDiff = groundB - groundA;
        const heightDiff = building.height - measureTarget.height;
        const dist3D = Math.sqrt(horizDist * horizDist + baseDiff * baseDiff);
        pairwise = {
            targetId: measureTarget.id,
            targetHeight: measureTarget.height,
            targetGroundElevation: groundB,
            horizontalDistance: horizDist,
            distance3D: dist3D,
            baseElevationDiff: baseDiff,
            heightDiff: heightDiff
        };
    }

    // 3. JSON payload generator
    const getPayload = () => {
        if (isBuilding && building) {
            return {
                dossier_type: "structure_survey_dossier",
                schema_version: "1.0",
                generated_at: new Date().toISOString(),
                coordinate_reference_system: {
                    code: "EPSG:2193",
                    name: "NZGD2000 / New Zealand Transverse Mercator 2000",
                    units: "metres"
                },
                data_sources: {
                    lidar: "Airborne LiDAR Point Cloud (NZ tile)",
                    multispectral: "Sentinel-2 MSI Surface Reflectance (RGB/NDVI)",
                    processing_engine: "SIH 3D Digital Twin Engine"
                },
                asset_identification: {
                    structure_id: building.id,
                    centroid_coordinates: {
                        easting_m: Number(centroidX.toFixed(2)),
                        northing_m: Number(centroidY.toFixed(2))
                    },
                    bounding_box_extents: {
                        min_x: Number(building.bounds.min_x.toFixed(2)),
                        max_x: Number(building.bounds.max_x.toFixed(2)),
                        min_y: Number(building.bounds.min_y.toFixed(2)),
                        max_y: Number(building.bounds.max_y.toFixed(2)),
                        width_m: Number(width.toFixed(2)),
                        length_m: Number(depth.toFixed(2))
                    },
                    estimated_footprint_bbox_m2: Number(bboxArea.toFixed(1))
                },
                vertical_profile: {
                    height_m: Number(building.height.toFixed(2)),
                    estimated_storeys: estimatedStoreys,
                    ground_elevation_m: Number((analysis?.groundElevation ?? building.min_elevation).toFixed(2)),
                    apex_elevation_m: Number(building.max_elevation.toFixed(2)),
                    lidar_point_count: building.point_count,
                    mesh_triangle_count: building.triangle_count
                },
                topography_and_environment: {
                    mean_slope_deg: Number(analysis?.localSlope?.toFixed(1) ?? 0),
                    slope_category: analysis?.terrainClass ?? "Flat",
                    mean_ndvi: Number(meanNdvi.toFixed(3)),
                    vegetation_classification: ndviInterpretation,
                    surface_reflectance_sample_rgb: [
                        Number(meanRgb[0].toFixed(3)),
                        Number(meanRgb[1].toFixed(3)),
                        Number(meanRgb[2].toFixed(3))
                    ]
                },
                local_context_and_comparison: {
                    nearest_structure_id: analysis?.nearestBuildingId ?? null,
                    nearest_structure_distance_m: Number(analysis?.nearestDistance?.toFixed(1) ?? 0),
                    proximity_rating: analysis?.proximityClass ?? "Moderate",
                    spatial_context_rating: analysis?.spatialContext ?? "Moderate",
                    spatial_context_score: Number(analysis?.contextScore?.toFixed(2) ?? 0),
                    tile_height_comparison: {
                        rank_description: analysis?.comparison ? `Rank #${analysis.comparison.heightRank} of 56` : "N/A",
                        height_difference_from_average_m: Number(analysis?.comparison?.heightDelta?.toFixed(1) ?? 0),
                        tile_average_height_m: Number(analysis?.comparison?.nearbyHeightAvg?.toFixed(1) ?? 0),
                        percentile_pct: Number(analysis?.comparison?.heightPercentile?.toFixed(0) ?? 0)
                    },
                    tile_footprint_comparison: {
                        footprint_difference_from_average_m2: Number(analysis?.comparison?.areaDelta?.toFixed(1) ?? 0),
                        tile_average_footprint_m2: Number(analysis?.comparison?.nearbyAreaAvg?.toFixed(1) ?? 0),
                        ratio_to_average: Number(analysis?.comparison?.areaRatio?.toFixed(2) ?? 0)
                    }
                },
                pairwise_measurement: pairwise ? {
                    target_structure_id: pairwise.targetId,
                    centroid_3d_distance_m: Number(pairwise.distance3D.toFixed(2)),
                    horizontal_distance_m: Number(pairwise.horizontalDistance.toFixed(2)),
                    base_elevation_difference_m: Number(pairwise.baseElevationDiff.toFixed(2)),
                    height_difference_m: Number(pairwise.heightDiff.toFixed(2))
                } : null,
                disclaimer: "Indicative LiDAR-derived survey. Footprint estimated from 2D bounding extents. Storeys estimated based on 3.2m standard floor height. Not a certified legal boundary, cadastral title, or structural engineering inspection."
            };
        } else if (areaData) {
            return {
                report_type: "area_geospatial_summary",
                schema_version: "1.0",
                generated_at: new Date().toISOString(),
                coordinate_reference_system: {
                    code: "EPSG:2193",
                    name: "NZGD2000 / New Zealand Transverse Mercator 2000",
                    units: "metres"
                },
                data_sources: {
                    lidar: "Airborne LiDAR DEM & Building Models (NZ tile)",
                    multispectral: "Sentinel-2 MSI Surface Reflectance (RGB/NDVI)",
                    processing_engine: "SIH 3D Digital Twin Engine"
                },
                spatial_extents: {
                    bounding_box: {
                        min_x: Number(terrainMeta?.minX?.toFixed(2) ?? 0),
                        max_x: Number(terrainMeta?.maxX?.toFixed(2) ?? 0),
                        min_y: Number(terrainMeta?.minY?.toFixed(2) ?? 0),
                        max_y: Number(terrainMeta?.maxY?.toFixed(2) ?? 0),
                        width_m: Number(areaData.tileWidth.toFixed(1)),
                        height_m: Number(areaData.tileHeight.toFixed(1))
                    },
                    survey_area: {
                        area_m2: Number(terrainMeta?.areaM2?.toFixed(1) ?? 0),
                        area_ha: Number(areaData.surveyAreaHa.toFixed(2))
                    }
                },
                built_environment_aggregates: {
                    total_structures: areaData.totalBuildings,
                    total_estimated_footprint_m2: Number(areaData.totalFootprintM2.toFixed(1)),
                    footprint_coverage_pct: Number(areaData.coveragePct.toFixed(1)),
                    average_structure_height_m: Number(areaData.avgHeight.toFixed(1)),
                    maximum_structure_height_m: Number(areaData.tallestHeight.toFixed(1)),
                    tallest_structure_id: areaData.tallestBuildingId,
                    height_distribution: {
                        tall_structures_ge_10m: areaData.tallCount10m,
                        standard_structures_lt_10m: areaData.totalBuildings - areaData.tallCount10m
                    }
                },
                topographic_distribution: {
                    elevation_range_m: {
                        min_m: Number(elevationMin.toFixed(1)),
                        max_m: Number(elevationMax.toFixed(1)),
                        mean_m: Number(terrainMeta?.elevationMean?.toFixed(1) ?? 0)
                    },
                    slope_distribution: {
                        flat_lt_5deg: areaData.slopeFlatCount,
                        moderate_5_to_15deg: areaData.slopeModerateCount,
                        steep_gt_15deg: areaData.slopeSteepCount
                    }
                },
                multispectral_environmental_profile: {
                    tile_mean_ndvi: Number(areaData.ndviMean.toFixed(3)),
                    vegetation_coverage_pct: {
                        low_or_bare_lt_0_12: Number(areaData.ndviLowPct.toFixed(1)),
                        moderate_vegetation_0_12_to_0_35: Number(areaData.ndviModPct.toFixed(1)),
                        high_canopy_gt_0_35: Number(areaData.ndviHighPct.toFixed(1))
                    }
                },
                spatial_query_context: {
                    active_filter: activeFilter,
                    matched_structure_count: matchedBuildings.length,
                    matched_structure_ids: matchedBuildings.map(m => m.building.id)
                },
                disclaimer: "Aggregated geospatial intelligence derived from airborne LiDAR and Sentinel-2 satellite imagery. Building footprints are estimated from 2D bounding boxes. Not an official municipal cadastral record or legal zoning survey."
            };
        }
        return {};
    };

    const handleCopy = async () => {
        const payload = getPayload();
        const ok = await copyJsonToClipboard(payload);
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        const payload = getPayload();
        const filename = isBuilding ? `${building?.id}_survey_dossier.json` : `NZ_area_geospatial_summary.json`;
        downloadJsonFile(filename, payload);
    };

    const handleExportPdf = () => {
        if (isBuilding && building) {
            exportBuildingDossierPdf({
                building,
                analysis,
                pairwise,
                datasetName: "New Zealand LiDAR + Sentinel-2",
                crsName: "EPSG:2193 (NZGD2000 / NZTM2000)"
            });
        } else if (areaData) {
            exportAreaSummaryPdf({
                areaData,
                terrainMeta,
                elevationMin,
                elevationMax,
                activeFilter,
                matchedBuildingsCount: matchedBuildings.length
            });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div
            className="nz-modal-overlay"
            ref={overlayRef}
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            <div className="nz-dossier-card nz-printable-dossier" role="dialog" aria-modal="true">
                {/* TOPBAR */}
                <div className="nz-dossier-topbar">
                    <div className="nz-dossier-title-group">
                        <span className="nz-dossier-badge">MUNICIPAL DOSSIER ENGINE</span>
                        <h2 className="nz-dossier-heading">
                            {isBuilding ? `MUNICIPAL SURVEY DOSSIER · ${building?.id}` : "Tile Geospatial Area Summary"}
                        </h2>
                    </div>
                    <div className="nz-dossier-actions">
                        <button
                            type="button"
                            className="nz-btn-modal-action primary"
                            onClick={handleExportPdf}
                            title="Export and download official PDF document"
                        >
                            {isBuilding ? "⬇ Export PDF Dossier" : "⬇ Export PDF Summary"}
                        </button>
                        <button
                            type="button"
                            className="nz-btn-modal-action"
                            onClick={handlePrint}
                            title="Print dossier or save via browser print"
                        >
                            🖨 Browser Print
                        </button>
                        <button
                            type="button"
                            className="nz-btn-modal-action"
                            onClick={handleDownload}
                            title="Download machine-readable JSON"
                        >
                            💾 Download JSON
                        </button>
                        <button
                            type="button"
                            className="nz-btn-modal-action"
                            onClick={handleCopy}
                            title="Copy JSON to clipboard"
                        >
                            {copied ? "✓ Copied!" : "📋 Copy JSON"}
                        </button>
                        <button
                            type="button"
                            className="nz-btn-modal-close"
                            onClick={onClose}
                            title="Close modal (Esc)"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* SCROLLABLE DOSSIER BODY */}
                <div className="nz-dossier-body">
                    {isBuilding && building ? (
                        <>
                            {/* SECTION 1: HEADER & SURVEY METADATA */}
                            <div className="nz-dossier-section nz-dossier-meta-hero">
                                <div className="nz-hero-top">
                                    <div>
                                        <div className="nz-hero-kicker">MUNICIPAL SURVEY DOSSIER</div>
                                        <div className="nz-hero-id">{building.id}</div>
                                        <div className="nz-hero-sub">3D Visual Mapping · New Zealand Digital Twin</div>
                                    </div>
                                    <div className="nz-hero-meta-tags">
                                        <span className="nz-dtag">CRS: EPSG:2193 (NZTM2000)</span>
                                        <span className="nz-dtag">DATASET: NZ LiDAR + SENTINEL-2</span>
                                        <span className="nz-dtag">DATE: {new Date().toLocaleDateString("en-NZ", { year: "numeric", month: "short", day: "numeric" })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: ASSET IDENTIFICATION & EXTENTS */}
                            <div className="nz-dossier-section">
                                <div className="nz-dossier-sec-header">
                                    <span className="nz-dossier-sec-title">📍 1. Asset Identification & Spatial Extents</span>
                                    <span className="nz-sec-tag">NZTM2000</span>
                                </div>
                                <div className="nz-dossier-grid-4">
                                    <div className="nz-dossier-item">
                                        <span>Centroid Easting</span>
                                        <strong>{centroidX.toFixed(1)} m E</strong>
                                        <small>EPSG:2193</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Centroid Northing</span>
                                        <strong>{centroidY.toFixed(1)} m N</strong>
                                        <small>EPSG:2193</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Estimated Footprint (BBox)</span>
                                        <strong className="nz-text-cyan">{bboxArea.toFixed(1)} m²</strong>
                                        <small>W {width.toFixed(1)}m × L {depth.toFixed(1)}m</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Footprint vs Average</span>
                                        <strong>
                                            {analysis?.comparison
                                                ? `${analysis.comparison.areaDelta >= 0 ? "+" : ""}${Math.round(analysis.comparison.areaDelta)} m²`
                                                : "N/A"}
                                        </strong>
                                        <small>Tile avg: {analysis?.comparison ? Math.round(analysis.comparison.nearbyAreaAvg) : 0} m²</small>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: VERTICAL PROFILE & GEOMETRY */}
                            <div className="nz-dossier-section">
                                <div className="nz-dossier-sec-header">
                                    <span className="nz-dossier-sec-title">🏢 2. Vertical Profile & LiDAR Geometry</span>
                                    <span className="nz-sec-tag">Airborne LiDAR</span>
                                </div>
                                <div className="nz-dossier-grid-4">
                                    <div className="nz-dossier-item">
                                        <span>Structure Height</span>
                                        <strong className="nz-text-amber">{building.height.toFixed(2)} m</strong>
                                        <small>Eaves to Apex max</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Estimated Storeys</span>
                                        <strong>~{estimatedStoreys} Storey{estimatedStoreys > 1 ? "s" : ""}</strong>
                                        <small>Assumes 3.2m / storey</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Ground / Apex AMSL</span>
                                        <strong>{(analysis?.groundElevation ?? building.min_elevation).toFixed(1)}m / {building.max_elevation.toFixed(1)}m</strong>
                                        <small>Above mean sea level</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>LiDAR Points / Triangles</span>
                                        <strong>{building.point_count.toLocaleString()} / {building.triangle_count.toLocaleString()}</strong>
                                        <small>Reconstructed 3D mesh</small>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4: TOPOGRAPHY & ENVIRONMENT */}
                            <div className="nz-dossier-section">
                                <div className="nz-dossier-sec-header">
                                    <span className="nz-dossier-sec-title">🌿 3. Topography & Multispectral Environment</span>
                                    <span className="nz-sec-tag">Sentinel-2 + LiDAR DEM</span>
                                </div>
                                <div className="nz-dossier-grid-4">
                                    <div className="nz-dossier-item">
                                        <span>Terrain Slope</span>
                                        <strong>{analysis ? `${analysis.localSlope.toFixed(1)}° · ${analysis.terrainClass}` : "N/A"}</strong>
                                        <small>Sampled terrain foundation</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Sentinel-2 NDVI</span>
                                        <strong className="nz-text-emerald">{meanNdvi.toFixed(3)}</strong>
                                        <small>{ndviInterpretation}</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Surface Reflectance</span>
                                        <div className="nz-dossier-swatch-row">
                                            <span className="nz-dossier-swatch" style={{ background: srgbColor }} />
                                            <small>RGB [{(meanRgb[0]*255).toFixed(0)}, {(meanRgb[1]*255).toFixed(0)}, {(meanRgb[2]*255).toFixed(0)}]</small>
                                        </div>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Height Rank in Tile</span>
                                        <strong>{analysis?.comparison ? `Rank #${analysis.comparison.heightRank} of 56` : "N/A"}</strong>
                                        <small>Percentile: {analysis?.comparison ? analysis.comparison.heightPercentile.toFixed(0) : 0}%</small>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 5: LOCAL CONTEXT & RELATIVE COMPARISON */}
                            <div className="nz-dossier-section">
                                <div className="nz-dossier-sec-header">
                                    <span className="nz-dossier-sec-title">🧭 4. Local Spatial Context & Proximity</span>
                                    <span className="nz-sec-tag">Spatial Analysis</span>
                                </div>
                                <div className="nz-dossier-grid-4">
                                    <div className="nz-dossier-item">
                                        <span>Nearest Structure</span>
                                        <strong>{analysis?.nearestBuildingId ?? "N/A"}</strong>
                                        <small>{analysis?.nearestDistance?.toFixed(1) ?? "0"} m separation</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Proximity Rating</span>
                                        <strong>{analysis?.proximityClass ?? "Moderate"}</strong>
                                        <small>Density index</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Spatial Context</span>
                                        <strong>{analysis?.spatialContext ?? "Moderate"}</strong>
                                        <small>Index: {analysis?.contextScore.toFixed(2)}</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Height vs Tile Average</span>
                                        <strong>
                                            {analysis?.comparison
                                                ? `${analysis.comparison.heightDelta >= 0 ? "+" : ""}${analysis.comparison.heightDelta.toFixed(1)} m`
                                                : "N/A"}
                                        </strong>
                                        <small>Tile avg: {analysis?.comparison ? analysis.comparison.nearbyHeightAvg.toFixed(1) : 0} m</small>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 6: SPATIAL MEASUREMENT */}
                            <div className="nz-dossier-section nz-dossier-section-measure">
                                <div className="nz-dossier-sec-header">
                                    <span className="nz-dossier-sec-title">📐 5. Spatial Measurement</span>
                                    <span className="nz-sec-tag nz-sec-tag-amber">{pairwise ? "Active Measurement" : "Measurement Status"}</span>
                                </div>
                                {pairwise ? (
                                    <div className="nz-dossier-grid-4">
                                        <div className="nz-dossier-item">
                                            <span>Origin → Target</span>
                                            <strong className="nz-text-amber">{building.id} → {pairwise.targetId}</strong>
                                            <small>Target Height: {pairwise.targetHeight.toFixed(1)}m</small>
                                        </div>
                                        <div className="nz-dossier-item">
                                            <span>Horizontal Distance</span>
                                            <strong className="nz-text-amber">{pairwise.horizontalDistance.toFixed(1)} m</strong>
                                            <small>Centroid-to-centroid 2D</small>
                                        </div>
                                        <div className="nz-dossier-item">
                                            <span>3D Straight-Line</span>
                                            <strong>{pairwise.distance3D.toFixed(1)} m</strong>
                                            <small>Direct spatial euclidean</small>
                                        </div>
                                        <div className="nz-dossier-item">
                                            <span>Base Elevation ΔZ</span>
                                            <strong>{pairwise.baseElevationDiff >= 0 ? "+" : ""}{pairwise.baseElevationDiff.toFixed(1)} m</strong>
                                            <small>{pairwise.baseElevationDiff > 0.05 ? "Target is higher" : pairwise.baseElevationDiff < -0.05 ? "Origin is higher" : "Level ground"}</small>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="nz-dossier-item nz-prop-full">
                                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>No inter-building measurement recorded.</span>
                                        <small style={{ color: "#64748b", marginTop: "4px" }}>
                                            Activate measurement mode in the 3D twin to calculate horizontal distance, 3D Euclidean distance, and base elevation deltas.
                                        </small>
                                    </div>
                                )}
                            </div>

                            {/* SECTION 7: DATA NOTES & LIMITATIONS */}
                            <div className="nz-dossier-disclaimer-box">
                                <div className="nz-disclaimer-title">⚖️ DATA NOTES & LIMITATIONS</div>
                                <ul className="nz-disclaimer-list">
                                    <li>Derived from the available LiDAR and Sentinel-2 data for the active New Zealand tile.</li>
                                    <li>Footprint values are bounding-box estimates and are not cadastral boundaries.</li>
                                    <li>Spatial Context is an indicative contextual index and is not an engineering, flood-risk, structural, zoning, or regulatory assessment.</li>
                                    <li>Inter-building distances are indicative spatial measurements based on available building geometry and are not certified survey measurements.</li>
                                    <li>Storey count is an estimation assuming a standard 3.2m floor height. Not a certified architectural survey.</li>
                                </ul>
                            </div>
                        </>
                    ) : areaData ? (
                        <>
                            {/* AREA SUMMARY: HEADER & METADATA */}
                            <div className="nz-dossier-section nz-dossier-meta-hero">
                                <div className="nz-hero-top">
                                    <div>
                                        <div className="nz-hero-kicker">MUNICIPAL GEOSPATIAL AREA SUMMARY · NEW ZEALAND</div>
                                        <div className="nz-hero-id">Active LiDAR Tile Overview</div>
                                        <div className="nz-hero-sub">Territorial Multi-Sensor Fusion & Built Environment Aggregates</div>
                                    </div>
                                    <div className="nz-hero-meta-tags">
                                        <span className="nz-dtag">CRS: EPSG:2193 (NZTM2000)</span>
                                        <span className="nz-dtag">TERRAIN: 346,801 VERTICES</span>
                                        <span className="nz-dtag">STRUCTURES: {areaData.totalBuildings} IDENTIFIED</span>
                                    </div>
                                </div>
                            </div>

                            {/* AREA SECTION 1: SPATIAL EXTENTS */}
                            <div className="nz-dossier-section">
                                <div className="nz-dossier-sec-header">
                                    <span className="nz-dossier-sec-title">🗺️ 1. Tile Spatial Extents & Coverage</span>
                                    <span className="nz-sec-tag">NZTM2000</span>
                                </div>
                                <div className="nz-dossier-grid-4">
                                    <div className="nz-dossier-item">
                                        <span>Tile Dimensions</span>
                                        <strong>{areaData.tileWidth} m × {areaData.tileHeight} m</strong>
                                        <small>Square spatial extent</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Survey Area</span>
                                        <strong className="nz-text-cyan">{areaData.surveyAreaHa.toFixed(2)} ha</strong>
                                        <small>{terrainMeta?.areaM2 ? (terrainMeta.areaM2 / 1000000).toFixed(3) : "0"} km²</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Easting Range</span>
                                        <strong>{terrainMeta?.minX?.toFixed(0)} – {terrainMeta?.maxX?.toFixed(0)}</strong>
                                        <small>EPSG:2193 Easting (m)</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Northing Range</span>
                                        <strong>{terrainMeta?.minY?.toFixed(0)} – {terrainMeta?.maxY?.toFixed(0)}</strong>
                                        <small>EPSG:2193 Northing (m)</small>
                                    </div>
                                </div>
                            </div>

                            {/* AREA SECTION 2: BUILT ENVIRONMENT AGGREGATES */}
                            <div className="nz-dossier-section">
                                <div className="nz-dossier-sec-header">
                                    <span className="nz-dossier-sec-title">🏙️ 2. Built Environment & Footprint Aggregates</span>
                                    <span className="nz-sec-tag">LiDAR Structural Census</span>
                                </div>
                                <div className="nz-dossier-grid-4">
                                    <div className="nz-dossier-item">
                                        <span>Total Structures</span>
                                        <strong className="nz-text-cyan">{areaData.totalBuildings}</strong>
                                        <small>Reconstructed models</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Total Footprint</span>
                                        <strong>{areaData.totalFootprintM2.toLocaleString(undefined, { maximumFractionDigits: 0 })} m²</strong>
                                        <small>{areaData.coveragePct.toFixed(1)}% of tile area</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Mean Structure Height</span>
                                        <strong>{areaData.avgHeight.toFixed(1)} m</strong>
                                        <small>Across {areaData.totalBuildings} structures</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Tallest Structure</span>
                                        <strong className="nz-text-amber">{areaData.tallestHeight.toFixed(1)} m ({areaData.tallestBuildingId})</strong>
                                        <small>{areaData.tallCount10m} structures ≥ 10m</small>
                                    </div>
                                </div>
                            </div>

                            {/* AREA SECTION 3: TOPOGRAPHIC DISTRIBUTION */}
                            <div className="nz-dossier-section">
                                <div className="nz-dossier-sec-header">
                                    <span className="nz-dossier-sec-title">⛰️ 3. Topographic Profile & Foundation Slopes</span>
                                    <span className="nz-sec-tag">LiDAR DEM</span>
                                </div>
                                <div className="nz-dossier-grid-4">
                                    <div className="nz-dossier-item">
                                        <span>Elevation Range</span>
                                        <strong>{elevationMin.toFixed(1)}m – {elevationMax.toFixed(1)}m</strong>
                                        <small>Mean: {terrainMeta?.elevationMean.toFixed(1)}m AMSL</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Flat Foundations (&lt;5°)</span>
                                        <strong>{areaData.slopeFlatCount} structures</strong>
                                        <small>{((areaData.slopeFlatCount / areaData.totalBuildings) * 100).toFixed(0)}% of structures</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Moderate Slopes (5–15°)</span>
                                        <strong>{areaData.slopeModerateCount} structures</strong>
                                        <small>{((areaData.slopeModerateCount / areaData.totalBuildings) * 100).toFixed(0)}% of structures</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Steep Foundations (&gt;15°)</span>
                                        <strong className="nz-text-amber">{areaData.slopeSteepCount} structures</strong>
                                        <small>{((areaData.slopeSteepCount / areaData.totalBuildings) * 100).toFixed(0)}% of structures</small>
                                    </div>
                                </div>
                            </div>

                            {/* AREA SECTION 4: MULTISPECTRAL ENVIRONMENTAL PROFILE */}
                            <div className="nz-dossier-section">
                                <div className="nz-dossier-sec-header">
                                    <span className="nz-dossier-sec-title">🛰️ 4. Multispectral Environmental Profile</span>
                                    <span className="nz-sec-tag">Sentinel-2 MSI</span>
                                </div>
                                <div className="nz-dossier-grid-4">
                                    <div className="nz-dossier-item">
                                        <span>Tile Mean NDVI</span>
                                        <strong className="nz-text-emerald">{areaData.ndviMean.toFixed(3)}</strong>
                                        <small>Overall vegetative index</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Bare / Built Cover (&lt;0.12)</span>
                                        <strong>{areaData.ndviLowPct.toFixed(1)}%</strong>
                                        <small>Impervious & bare soil</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Low / Mixed Cover (0.12–0.35)</span>
                                        <strong>{areaData.ndviModPct.toFixed(1)}%</strong>
                                        <small>Grass & light scrub</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>High Canopy Cover (&gt;0.35)</span>
                                        <strong className="nz-text-emerald">{areaData.ndviHighPct.toFixed(1)}%</strong>
                                        <small>Dense canopy / forest</small>
                                    </div>
                                </div>
                            </div>

                            {/* AREA SECTION 5: SPATIAL QUERY STATE */}
                            <div className="nz-dossier-section">
                                <div className="nz-dossier-sec-header">
                                    <span className="nz-dossier-sec-title">🔍 5. Active Spatial Query & Selection</span>
                                    <span className="nz-sec-tag">{activeFilter === "all" ? "Full Tile" : `Filter: ${activeFilter}`}</span>
                                </div>
                                <div className="nz-dossier-grid-2">
                                    <div className="nz-dossier-item">
                                        <span>Active Filter</span>
                                        <strong className="nz-text-cyan">{activeFilter === "all" ? "None (All Structures Visible)" : activeFilter.toUpperCase()}</strong>
                                        <small>{matchedBuildings.length} of {areaData.totalBuildings} structures matching query</small>
                                    </div>
                                    <div className="nz-dossier-item">
                                        <span>Matching Structure IDs</span>
                                        <div className="nz-dossier-matched-ids">
                                            {activeFilter === "all"
                                                ? "All 56 structures in tile active."
                                                : matchedBuildings.map(m => m.building.id).join(", ")}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* AREA SECTION 6: MUNICIPAL GOVERNANCE DISCLAIMER */}
                            <div className="nz-dossier-disclaimer-box">
                                <div className="nz-disclaimer-title">⚖️ MUNICIPAL GOVERNANCE & DATA INTEGRITY NOTICE</div>
                                <p>
                                    This territorial area summary report is synthesized from 346,801 airborne LiDAR terrain vertices and 56 reconstructed structures integrated with Sentinel-2 MSI surface reflectance. Footprint areas are bounding box estimates. Elevation and slope statistics represent sampled DEM terrain. Not an official municipal zoning report or legal land registry document.
                                </p>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
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
        measureMode,
        setMeasureMode
    ] =
        useState<boolean>(false);

    const [
        measureTarget,
        setMeasureTarget
    ] =
        useState<NZBuilding | null>(null);

    const [activeFilter, setActiveFilter] = useState<SpatialFilterType>("all");
    const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

    const handleSelectBuilding = (b: NZBuilding) => {
        setActivePreset(null);
        setSelectedBuilding(b);
        setMeasureMode(false);
        setMeasureTarget(null);
        setIsDossierOpen(false);
        document.body.style.cursor = "auto";
    };

    useEffect(() => {
        if (!selectedBuilding) {
            setMeasureMode(false);
            setMeasureTarget(null);
            document.body.style.cursor = "auto";
        }
    }, [selectedBuilding]);


    const [
        layer,
        setLayer
    ] =
        useState<TerrainLayer>(
            "rgb_hillshade"
        );

    const [cameraPresetRequest, setCameraPresetRequest] = useState<{
        id: string;
        target: THREE.Vector3;
        position: THREE.Vector3;
        timestamp: number;
    } | null>(null);

    const [activePreset, setActivePreset] = useState<string | null>(null);

    const handleSelectPreset = (preset: (typeof CAMERA_PRESETS)[number]) => {
        setActivePreset(preset.id);
        setCameraPresetRequest({
            id: preset.id,
            target: new THREE.Vector3(...preset.target),
            position: new THREE.Vector3(...preset.position),
            timestamp: performance.now()
        });
    };


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

    const controlsRef = useRef<any>(null);


    useEffect(() => {

        (window as any).__nzStartTime = performance.now();
        (window as any).__nzBuildingsPerf = { count: 0, totalTime: 0 };
        console.log("[PERF:START] Initiating NZ Digital Twin load...");

        Promise.all([
            getNZTerrain(),
            getNZBuildings()
        ])

        .then(([
            terrainData,
            buildingData
        ]) => {

            const tRecv = performance.now();
            const start = (window as any).__nzStartTime || tRecv;
            console.log(`[PERF:REACT_STATE] Both datasets received and parsed in ${(tRecv - start).toFixed(2)}ms. Triggering state update & render...`);

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


    const terrainMeta = useMemo(() => {
        if (!terrain) return null;

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const vertex of terrain.vertices) {
            minX = Math.min(minX, vertex[0]);
            maxX = Math.max(maxX, vertex[0]);
            minY = Math.min(minY, vertex[1]);
            maxY = Math.max(maxY, vertex[1]);
        }

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const elevationSum = terrain.elevation.reduce(
            (sum, value) => sum + value,
            0
        );
        const elevationMean = elevationSum / terrain.elevation.length;
        const width = maxX - minX;
        const height = maxY - minY;
        const areaM2 = width * height;
        const areaHa = areaM2 / 10000;

        return {
            centerX,
            centerY,
            elevationMean,
            minX,
            maxX,
            minY,
            maxY,
            width,
            height,
            areaM2,
            areaHa
        };
    }, [terrain]);


    const buildingSceneInfoMap = useMemo(() => {
        if (!terrain || !terrainMeta || buildings.length === 0) {
            return new Map<string, BuildingSceneInfo>();
        }

        const map = new Map<string, BuildingSceneInfo>();
        const terrainVertices = terrain.vertices;

        for (const building of buildings) {
            const points = building.vertices;
            const buildingCenterX =
                points.reduce((sum, point) => sum + point[0], 0) / points.length;
            const buildingCenterY =
                points.reduce((sum, point) => sum + point[1], 0) / points.length;

            let nearestIndex = 0;
            let nearestDistance = Infinity;

            for (let i = 0; i < terrainVertices.length; i++) {
                const dx = terrainVertices[i][0] - buildingCenterX;
                const dy = terrainVertices[i][1] - buildingCenterY;
                const distance = dx * dx + dy * dy;

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = i;
                }
            }

            const localGroundElevation = terrain.elevation[nearestIndex];
            const terrainVisualGroundY = (localGroundElevation - terrainMeta.elevationMean) * 1.5;
            const buildingHeight = building.max_elevation - building.min_elevation;

            const sceneCenterX =
                (building.bounds.min_x + building.bounds.max_x) / 2 - terrainMeta.centerX;
            const sceneCenterZ =
                (building.bounds.min_y + building.bounds.max_y) / 2 - terrainMeta.centerY;
            const sceneCenterY = terrainVisualGroundY + buildingHeight * 0.5;

            const sizeX = Math.max(12, building.bounds.max_x - building.bounds.min_x);
            const sizeZ = Math.max(12, building.bounds.max_y - building.bounds.min_y);
            const sizeY = Math.max(6, buildingHeight * 1.0);
            const radius = Math.sqrt(sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ) * 0.5;

            map.set(building.id, {
                center: new THREE.Vector3(sceneCenterX, sceneCenterY, sceneCenterZ),
                size: new THREE.Vector3(sizeX, sizeY, sizeZ),
                radius
            });
        }

        return map;
    }, [terrain, terrainMeta, buildings]);

    const siteAnalysisMap = useMemo(() => {
        if (!terrain || buildings.length === 0) {
            return new Map<string, BuildingSiteAnalysis>();
        }

        const t0 = performance.now();
        const map = new Map<string, BuildingSiteAnalysis>();
        const terrainVertices = terrain.vertices;
        const terrainSlope = terrain.slope;
        const terrainRelativeElevation = terrain.relative_elevation;

        // 1. Calculate building centroids and identify nearest terrain index
        const buildingIntermediates = buildings.map((building) => {
            const cx = (building.bounds.min_x + building.bounds.max_x) / 2;
            const cy = (building.bounds.min_y + building.bounds.max_y) / 2;

            let nearestIndex = 0;
            let nearestDistSq = Infinity;
            for (let i = 0; i < terrainVertices.length; i++) {
                const dx = terrainVertices[i][0] - cx;
                const dy = terrainVertices[i][1] - cy;
                const distSq = dx * dx + dy * dy;
                if (distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    nearestIndex = i;
                }
            }

            const meanNdvi =
                building.ndvi && building.ndvi.length > 0
                    ? building.ndvi.reduce((sum, v) => sum + v, 0) / building.ndvi.length
                    : 0;

            return {
                building,
                cx,
                cy,
                nearestIndex,
                meanNdvi
            };
        });

        // Pre-sort buildings by height for ranking
        const sortedByHeight = [...buildings].sort((a, b) => b.height - a.height);

        // 2. Proximity & neighborhood analysis in EPSG:2193 (NZTM2000 metric coordinates) across all 56 buildings
        for (let i = 0; i < buildingIntermediates.length; i++) {
            const cur = buildingIntermediates[i];
            const otherBuildingsWithDist: { other: typeof buildingIntermediates[0]; dist: number }[] = [];
            let nearestDist = Infinity;
            let nearestBuildingId = "None";
            let nearestBuildingHeight = 0;
            let nearbyCount50m = 0;

            for (let j = 0; j < buildingIntermediates.length; j++) {
                if (i === j) continue;
                const other = buildingIntermediates[j];
                const dist = Math.hypot(cur.cx - other.cx, cur.cy - other.cy);
                otherBuildingsWithDist.push({ other, dist });
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestBuildingId = other.building.id;
                    nearestBuildingHeight = other.building.height;
                }
                if (dist <= 50.0) {
                    nearbyCount50m++;
                }
            }

            otherBuildingsWithDist.sort((a, b) => a.dist - b.dist);

            // Phase 5B Local Comparison Baseline (100m radius with 3-closest fallback)
            const within100m = otherBuildingsWithDist.filter((item) => item.dist <= 100.0);
            const isFallback = within100m.length === 0;
            const refGroup = isFallback ? otherBuildingsWithDist.slice(0, 3) : within100m;
            const baselineLabel = isFallback
                ? "vs 3 closest structures"
                : `vs local avg (${within100m.length} ${within100m.length === 1 ? "structure" : "structures"} ≤100m)`;

            const nearbyHeightAvg =
                refGroup.reduce((sum, item) => sum + item.other.building.height, 0) / refGroup.length;

            const nearbyAreaAvg =
                refGroup.reduce((sum, item) => {
                    const b = item.other.building.bounds;
                    return sum + (b.max_x - b.min_x) * (b.max_y - b.min_y);
                }, 0) / refGroup.length;

            const nearbyGroundAvg =
                refGroup.reduce((sum, item) => sum + item.other.building.ground_elevation, 0) / refGroup.length;

            const curArea =
                (cur.building.bounds.max_x - cur.building.bounds.min_x) *
                (cur.building.bounds.max_y - cur.building.bounds.min_y);

            const heightDelta = cur.building.height - nearbyHeightAvg;
            const areaDelta = curArea - nearbyAreaAvg;
            const areaRatio = nearbyAreaAvg > 0 ? curArea / nearbyAreaAvg : 1.0;
            const groundDelta = cur.building.ground_elevation - nearbyGroundAvg;

            const heightRank = sortedByHeight.findIndex((b) => b.id === cur.building.id) + 1;
            const heightPercentile = Math.max(1, Math.round((heightRank / buildings.length) * 100));

            const nearestDiffH = cur.building.height - nearestBuildingHeight;
            const nearestRelativeText =
                nearestDiffH > 0.1
                    ? `Taller by +${nearestDiffH.toFixed(1)}m`
                    : nearestDiffH < -0.1
                        ? `Shorter by ${nearestDiffH.toFixed(1)}m`
                        : "Similar height (±0.1m)";

            const comparison: BuildingLocalComparison = {
                baselineLabel,
                isFallback,
                nearbyCount100m: within100m.length,
                heightDelta,
                nearbyHeightAvg,
                heightRank,
                heightPercentile,
                areaDelta,
                nearbyAreaAvg,
                areaRatio,
                groundDelta,
                nearbyGroundAvg,
                nearestBuildingId,
                nearestDistance: Number.isFinite(nearestDist) ? nearestDist : 0,
                nearestHeightDelta: nearestDiffH,
                nearestRelativeText
            };

            const localSlope = terrainSlope[cur.nearestIndex] ?? 0;
            const relativeElevation = terrainRelativeElevation[cur.nearestIndex] ?? 0;
            const groundElevation = cur.building.ground_elevation;

            // Terrain Classification: Flat (<5°), Moderate (5-15°), Steep (>=15°)
            const terrainClass: "Flat" | "Moderate" | "Steep" =
                localSlope < 5.0 ? "Flat" : localSlope < 15.0 ? "Moderate" : "Steep";

            // Relative Elevation Context: Low (<0.25), Moderate (0.25-0.55), High (>=0.55)
            const elevationClass: "Low" | "Moderate" | "High" =
                relativeElevation < 0.25 ? "Low" : relativeElevation < 0.55 ? "Moderate" : "High";

            // Proximity Classification: Low (0 nearby within 50m), Moderate (1-2), High (>=3)
            const proximityClass: "Low" | "Moderate" | "High" =
                nearbyCount50m === 0 ? "Low" : nearbyCount50m <= 2 ? "Moderate" : "High";

            // Vegetation Classification: Low (<0.20), Moderate (0.20-0.35), High (>=0.35)
            const vegetationClass: "Low vegetation" | "Moderate vegetation" | "High vegetation" =
                cur.meanNdvi >= 0.35
                    ? "High vegetation"
                    : cur.meanNdvi >= 0.20
                        ? "Moderate vegetation"
                        : "Low vegetation";

            // Transparent Compound Attention Score (0 to 7)
            // Slope: Steep = 2, Moderate = 1, Flat = 0
            const slopeScore = terrainClass === "Steep" ? 2 : terrainClass === "Moderate" ? 1 : 0;
            // Catchment context: Low relative elevation = 2, Moderate = 1, High = 0
            const elevScore = elevationClass === "Low" ? 2 : elevationClass === "Moderate" ? 1 : 0;
            // Vegetation cover: High = 1, Moderate/Low = 0
            const vegScore = vegetationClass === "High vegetation" ? 1 : 0;
            // Proximity density: High (>=3) = 2, Moderate (1-2) = 1, Low (0) = 0
            const proxScore = proximityClass === "High" ? 2 : proximityClass === "Moderate" ? 1 : 0;

            // Composite spatial-context score (0 to 7):
            // Combines terrain slope, catchment elevation context, vegetation, and structure proximity.
            // Note: This is an indicative composite spatial-context index, NOT a risk or engineering rating.
            const contextScore = slopeScore + elevScore + vegScore + proxScore;
            const spatialContext: "Low" | "Moderate" | "High" =
                contextScore <= 1 ? "Low" : contextScore <= 3 ? "Moderate" : "High";

            map.set(cur.building.id, {
                groundElevation,
                localSlope,
                terrainClass,
                relativeElevation,
                elevationClass,
                nearbyCount50m,
                nearestBuildingId,
                nearestDistance: Number.isFinite(nearestDist) ? nearestDist : 0,
                proximityClass,
                meanNdvi: cur.meanNdvi,
                vegetationClass,
                spatialContext,
                contextScore,
                overallAttention: spatialContext,
                attentionScore: contextScore,
                comparison
            });
        }

        console.log(`[PERF:SITE_ANALYSIS] Spatial site analysis precomputed for ${buildings.length} buildings in ${(performance.now() - t0).toFixed(2)}ms`);
        return map;
    }, [terrain, buildings]);

    const areaIntelligence = useMemo<AreaIntelligenceData | null>(() => {
        if (!terrain || !terrainMeta || buildings.length === 0 || siteAnalysisMap.size === 0) {
            return null;
        }

        const tileWidth = Math.round(terrainMeta.width);
        const tileHeight = Math.round(terrainMeta.height);
        const surveyAreaHa = terrainMeta.areaHa;

        let totalFootprintM2 = 0;
        let totalHeight = 0;
        let tallestHeight = -Infinity;
        let tallestBuildingId = "NZ-B001";
        let tallCount10m = 0;

        for (const b of buildings) {
            const bWidth = b.bounds.max_x - b.bounds.min_x;
            const bHeight = b.bounds.max_y - b.bounds.min_y;
            totalFootprintM2 += bWidth * bHeight;

            totalHeight += b.height;
            if (b.height > tallestHeight) {
                tallestHeight = b.height;
                tallestBuildingId = b.id;
            }
            if (b.height >= 10.0) {
                tallCount10m++;
            }
        }

        const avgHeight = totalHeight / buildings.length;
        const coveragePct = terrainMeta.areaM2 > 0 ? (totalFootprintM2 / terrainMeta.areaM2) * 100 : 0;

        let slopeFlatCount = 0;
        let slopeModerateCount = 0;
        let slopeSteepCount = 0;
        let contextLowCount = 0;
        let contextModerateCount = 0;
        let contextHighCount = 0;
        let isolatedCount = 0;

        for (const analysis of siteAnalysisMap.values()) {
            if (analysis.terrainClass === "Flat") slopeFlatCount++;
            else if (analysis.terrainClass === "Moderate") slopeModerateCount++;
            else if (analysis.terrainClass === "Steep") slopeSteepCount++;

            if (analysis.spatialContext === "Low") contextLowCount++;
            else if (analysis.spatialContext === "Moderate") contextModerateCount++;
            else if (analysis.spatialContext === "High") contextHighCount++;

            if (analysis.nearbyCount50m === 0) isolatedCount++;
        }

        let ndviMean = 0;
        let ndviLowCount = 0;
        let ndviModCount = 0;
        let ndviHighCount = 0;
        let ndviSampleTotal = 0;

        if (terrain.ndvi && terrain.ndvi.length > 0) {
            let sum = 0;
            for (let i = 0; i < terrain.ndvi.length; i++) {
                const v = terrain.ndvi[i];
                if (Number.isFinite(v)) {
                    sum += v;
                    ndviSampleTotal++;
                    if (v < 0.12) {
                        ndviLowCount++;
                    } else if (v < 0.35) {
                        ndviModCount++;
                    } else {
                        ndviHighCount++;
                    }
                }
            }
            if (ndviSampleTotal > 0) {
                ndviMean = sum / ndviSampleTotal;
            }
        }

        const ndviLowPct = ndviSampleTotal > 0 ? (ndviLowCount / ndviSampleTotal) * 100 : 0;
        const ndviModPct = ndviSampleTotal > 0 ? (ndviModCount / ndviSampleTotal) * 100 : 0;
        const ndviHighPct = ndviSampleTotal > 0 ? (ndviHighCount / ndviSampleTotal) * 100 : 0;

        return {
            tileWidth,
            tileHeight,
            surveyAreaHa,
            totalFootprintM2: Math.round(totalFootprintM2),
            coveragePct,
            totalBuildings: buildings.length,
            avgHeight,
            tallestHeight,
            tallestBuildingId,
            tallCount10m,
            slopeFlatCount,
            slopeModerateCount,
            slopeSteepCount,
            contextLowCount,
            contextModerateCount,
            contextHighCount,
            isolatedCount,
            ndviMean,
            ndviLowPct,
            ndviModPct,
            ndviHighPct
        };
    }, [terrain, terrainMeta, buildings, siteAnalysisMap]);

    const matchedBuildingData = useMemo(() => {
        if (activeFilter === "all") {
            return buildings.map(b => ({
                building: b,
                metricText: `${b.height.toFixed(1)} m`
            }));
        }

        const list: { building: NZBuilding; metricText: string }[] = [];
        for (const b of buildings) {
            const analysis = siteAnalysisMap.get(b.id);
            if (!analysis) continue;

            if (activeFilter === "steep" && analysis.terrainClass === "Steep") {
                list.push({
                    building: b,
                    metricText: `Slope ${analysis.localSlope.toFixed(1)}°`
                });
            } else if (activeFilter === "tall" && b.height >= 10.0) {
                list.push({
                    building: b,
                    metricText: `${b.height.toFixed(1)} m`
                });
            } else if (activeFilter === "high_context" && analysis.spatialContext === "High") {
                list.push({
                    building: b,
                    metricText: `High Context (${analysis.contextScore}/7)`
                });
            } else if (activeFilter === "isolated" && analysis.nearbyCount50m === 0) {
                list.push({
                    building: b,
                    metricText: `${analysis.nearestDistance.toFixed(1)} m nearest`
                });
            }
        }
        return list;
    }, [buildings, siteAnalysisMap, activeFilter]);

    const matchedBuildingIdSet = useMemo(() => {
        if (activeFilter === "all") return null;
        return new Set(matchedBuildingData.map(item => item.building.id));
    }, [matchedBuildingData, activeFilter]);

    useEffect(() => {
        (window as any).__nzTwinState = {
            selectedBuilding,
            setSelectedBuilding: handleSelectBuilding,
            measureMode,
            setMeasureMode,
            measureTarget,
            setMeasureTarget,
            activeFilter,
            setActiveFilter,
            matchedBuildingData,
            buildings,
            terrain,
            terrainMeta,
            siteAnalysisMap,
            areaIntelligence,
            layer,
            setLayer,
            isDossierOpen,
            setIsDossierOpen,
            exportBuildingDossierPdf,
            exportAreaSummaryPdf
        };
    }, [selectedBuilding, measureMode, measureTarget, activeFilter, matchedBuildingData, buildings, terrain, terrainMeta, siteAnalysisMap, areaIntelligence, layer, isDossierOpen]);


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

    const isAnySelected = selectedBuilding !== null;


    return (
        <div className={`nz-twin ${measureMode ? "nz-measuring" : ""}`}>

            <Canvas
                shadows
                camera={{
                    position: [
                        360,
                        240,
                        480
                    ],
                    fov: 45
                }}
            >

                <color
                    attach="background"
                    args={["#07111f"]}
                />


                <ambientLight
                    intensity={0.45}
                    color="#dbe4ee"
                />


                <directionalLight
                    castShadow
                    position={[
                        -350,
                        480,
                        260
                    ]}
                    intensity={2.2}
                    color="#ffffff"
                />


                <directionalLight
                    position={[
                        280,
                        200,
                        -200
                    ]}
                    intensity={0.32}
                    color="#93c5fd"
                />

                <PerfFrameTracker />

                <NZTerrainMesh
                    terrain={terrain}
                    layer={layer}
                />


                {showBuildings &&
                    terrainMeta &&
                    buildings.map(
                        building => {
                            const isOrigin = selectedBuilding?.id === building.id;
                            const isTarget = measureTarget?.id === building.id;
                            const isDeemphasized = isAnySelected
                                ? !isOrigin && !isTarget
                                : matchedBuildingIdSet !== null && !matchedBuildingIdSet.has(building.id);
                            return (
                                <NZBuildingMesh
                                    key={building.id}
                                    building={building}
                                    terrain={terrain}
                                    terrainMeta={terrainMeta}
                                    isOrigin={isOrigin}
                                    isTarget={isTarget}
                                    isDeemphasized={isDeemphasized}
                                    measureMode={measureMode}
                                    onSelect={
                                        handleSelectBuilding
                                    }
                                    onMeasureSelect={
                                        setMeasureTarget
                                    }
                                />
                            );
                        }
                    )
                }

                {measureTarget && selectedBuilding && terrainMeta && (
                    (() => {
                        const infoA = buildingSceneInfoMap.get(selectedBuilding.id);
                        const infoB = buildingSceneInfoMap.get(measureTarget.id);
                        if (infoA && infoB) {
                            return (
                                <SpatialMeasurementLine
                                    centerA={infoA.center}
                                    centerB={infoB.center}
                                />
                            );
                        }
                        return null;
                    })()
                )}


                <OrbitControls
                    ref={controlsRef}
                    makeDefault
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={50}
                    maxDistance={1400}
                    target={[
                        20,
                        -5,
                        40
                    ]}
                />

                <CameraController
                    selectedBuilding={selectedBuilding}
                    buildingSceneInfoMap={buildingSceneInfoMap}
                    controlsRef={controlsRef}
                    presetRequest={cameraPresetRequest}
                    onUserOrbit={() => setActivePreset(null)}
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


                <div>
                    <span>
                        SCALE
                    </span>

                    <strong>
                        1.5×
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
                        layer === "rgb_hillshade"
                            ? "nz-layer active"
                            : "nz-layer"
                    }
                    onClick={() =>
                        setLayer("rgb_hillshade")
                    }
                >
                    <span>
                        True Color + Hillshade
                    </span>

                    <small>
                        Sentinel-2 + LiDAR hillshade
                    </small>
                </button>


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


                <button
                    className={
                        layer === "ndvi"
                            ? "nz-layer active"
                            : "nz-layer"
                    }
                    onClick={() =>
                        setLayer("ndvi")
                    }
                >
                    <span>
                        Vegetation (NDVI)
                    </span>

                    <small>
                        Vegetation & surface reflectance
                    </small>
                </button>


                <button
                    className={
                        layer === "rgb"
                            ? "nz-layer active"
                            : "nz-layer"
                    }
                    onClick={() =>
                        setLayer("rgb")
                    }
                >
                    <span>
                        Satellite (RGB)
                    </span>

                    <small>
                        Sentinel-2 raw reflectance
                    </small>
                </button>


                <div className="nz-divider" />


                <div className="nz-panel-title">
                    SCENE FOCUS
                </div>

                <div className="nz-preset-grid">
                    {CAMERA_PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            className={
                                activePreset === preset.id
                                    ? "nz-preset-btn active"
                                    : "nz-preset-btn"
                            }
                            onClick={() => handleSelectPreset(preset)}
                        >
                            <span>{preset.name}</span>
                            <small>{preset.badge}</small>
                        </button>
                    ))}
                </div>


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
                    {layer === "rgb_hillshade"
                        ? "SENTINEL-2 TRUE COLOR · LiDAR HILLSHADE"
                        : layer === "elevation"
                            ? "ELEVATION"
                            : layer === "slope"
                                ? "SLOPE"
                                : layer === "relative"
                                    ? "RELATIVE ELEVATION"
                                    : layer === "ndvi"
                                        ? "VEGETATION · NDVI"
                                        : "SATELLITE · RAW REFLECTANCE"
                    }
                </div>

                {layer === "rgb_hillshade" ? (
                    <div className="nz-legend-rgb-info">
                        <div className="nz-legend-rgb-title">
                            Sentinel-2 True Color + LiDAR Hillshade
                        </div>
                        <div className="nz-legend-rgb-sub">
                            10 m BOA reflectance · Analytical relief shading · 1.5× exaggeration
                        </div>
                    </div>
                ) : layer === "rgb" ? (
                    <div className="nz-legend-rgb-info">
                        <div className="nz-legend-rgb-title">
                            Sentinel-2 True-Color Surface
                        </div>
                        <div className="nz-legend-rgb-sub">
                            10 m optical resolution · Unmodulated reflectance
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={`nz-gradient nz-gradient-${layer}`} />

                        <div className="nz-legend-values">
                            {layer === "slope" ? (
                                <>
                                    <span>0°</span>
                                    <span>{slopeMax.toFixed(1)}°</span>
                                </>
                            ) : layer === "relative" ? (
                                <>
                                    <span>0</span>
                                    <span>1</span>
                                </>
                            ) : layer === "elevation" ? (
                                <>
                                    <span>{elevationMin.toFixed(1)}m</span>
                                    <span>{elevationMax.toFixed(1)}m</span>
                                </>
                            ) : (
                                <>
                                    <span>&lt;0.12 Bare</span>
                                    <span>0.12–0.35 Low</span>
                                    <span>&gt;0.35 Canopy</span>
                                </>
                            )}
                        </div>
                    </>
                )}

            </div>


            {/* PROPERTY INTELLIGENCE (when building selected) OR AREA INTELLIGENCE (when no building selected) */}

            {selectedBuilding ? (
                <PropertyIntelligencePanel
                    building={selectedBuilding}
                    analysis={siteAnalysisMap.get(selectedBuilding.id)}
                    measureMode={measureMode}
                    measureTarget={measureTarget}
                    targetAnalysis={measureTarget ? siteAnalysisMap.get(measureTarget.id) : undefined}
                    onStartMeasure={() => {
                        setMeasureMode(true);
                        setMeasureTarget(null);
                    }}
                    onClearMeasure={() => {
                        setMeasureMode(false);
                        setMeasureTarget(null);
                        document.body.style.cursor = "auto";
                    }}
                    onSelectDifferentTarget={() => {
                        setMeasureTarget(null);
                    }}
                    onOpenDossier={() => setIsDossierOpen(true)}
                    onClose={() => {
                        setSelectedBuilding(null);
                        setMeasureMode(false);
                        setMeasureTarget(null);
                        setIsDossierOpen(false);
                        document.body.style.cursor = "auto";
                    }}
                />
            ) : areaIntelligence ? (
                <AreaIntelligencePanel
                    data={areaIntelligence}
                    activeFilter={activeFilter}
                    onSelectFilter={setActiveFilter}
                    matchedBuildings={matchedBuildingData}
                    onFocusBuilding={handleSelectBuilding}
                    onOpenDossier={() => setIsDossierOpen(true)}
                />
            ) : null}

            {isDossierOpen && (
                <DossierModal
                    type={selectedBuilding ? "building" : "area"}
                    isOpen={isDossierOpen}
                    onClose={() => setIsDossierOpen(false)}
                    building={selectedBuilding}
                    analysis={selectedBuilding ? siteAnalysisMap.get(selectedBuilding.id) : undefined}
                    measureTarget={measureTarget}
                    targetAnalysis={measureTarget ? siteAnalysisMap.get(measureTarget.id) : undefined}
                    areaData={areaIntelligence || undefined}
                    terrainMeta={terrainMeta}
                    elevationMin={elevationMin}
                    elevationMax={elevationMax}
                    activeFilter={activeFilter}
                    matchedBuildings={matchedBuildingData}
                />
            )}

            <div className="nz-footer-info">
                EPSG:2193 · NZTM2000 · LiDAR-derived · Terrain scale 1.5× (Visual)
            </div>

        </div>
    );
}
