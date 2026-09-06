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
                roughness={0.82}
                metalness={0.02}
            />

        </mesh>
    );
}

interface TerrainMeta {
    centerX: number;
    centerY: number;
    elevationMean: number;
}

interface BuildingSceneInfo {
    center: THREE.Vector3;
    size: THREE.Vector3;
    radius: number;
}

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function NZBuildingMesh({
    building,
    terrain,
    terrainMeta,
    isSelected,
    isDeemphasized,
    onSelect
}: {
    building: NZBuilding;
    terrain: NZTerrainData;
    terrainMeta: TerrainMeta;
    isSelected: boolean;
    isDeemphasized: boolean;
    onSelect: (
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
                    onSelect(building);
                }}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                    document.body.style.cursor = "auto";
                }}
            >
                <meshStandardMaterial
                    vertexColors={true}
                    side={THREE.DoubleSide}
                    roughness={isSelected ? 0.45 : isDeemphasized ? 0.88 : 0.72}
                    metalness={0.0}
                    color={isDeemphasized ? "#76869a" : "#ffffff"}
                    transparent={isDeemphasized}
                    opacity={isDeemphasized ? 0.55 : 1.0}
                    depthWrite={true}
                    emissive={isSelected ? "#0ea5e9" : "#000000"}
                    emissiveIntensity={isSelected ? 0.35 : 0.0}
                />
            </mesh>

            {isSelected && (
                <mesh geometry={geometry} raycast={() => null}>
                    <meshBasicMaterial
                        color="#38bdf8"
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

function CameraController({
    selectedBuilding,
    buildingSceneInfoMap,
    controlsRef
}: {
    selectedBuilding: NZBuilding | null;
    buildingSceneInfoMap: Map<string, BuildingSceneInfo>;
    controlsRef: React.RefObject<any>;
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
        };

        controls.addEventListener("start", onUserStart);
        return () => {
            controls.removeEventListener("start", onUserStart);
        };
    }, [controlsRef]);

    const prevBuildingIdRef = useRef<string | null>(null);

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
        // Target approximately 30–45% of the useful viewport
        // Vertical FOV = 45 deg, Frustum height at distance D is H ≈ 0.8284 * D
        // Bounding dimension S:
        const boundingDiameter = Math.max(info.radius * 2, info.size.x, info.size.y, info.size.z);
        let targetDistance = boundingDiameter * 2.3;
        targetDistance = THREE.MathUtils.clamp(targetDistance, 120, 240);

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
            const targetPitch = THREE.MathUtils.clamp(currentPitch, 0.48, 0.73);
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


function PropertyIntelligencePanel({
    building,
    onClose
}: {
    building: NZBuilding;
    onClose: () => void;
}) {
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

    useEffect(() => {
        (window as any).__nzTwinState = {
            selectedBuilding,
            setSelectedBuilding,
            buildings,
            terrain
        };
    }, [selectedBuilding, buildings, terrain]);


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

        return { centerX, centerY, elevationMean };
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
            const verticalOffset = localGroundElevation - building.min_elevation;

            const sceneCenterX =
                (building.bounds.min_x + building.bounds.max_x) / 2 - terrainMeta.centerX;
            const sceneCenterZ =
                (building.bounds.min_y + building.bounds.max_y) / 2 - terrainMeta.centerY;
            const sceneCenterY =
                (
                    (building.min_elevation + building.max_elevation) / 2 +
                    verticalOffset -
                    terrainMeta.elevationMean
                ) * 4.0;

            const sizeX = Math.max(12, building.bounds.max_x - building.bounds.min_x);
            const sizeZ = Math.max(12, building.bounds.max_y - building.bounds.min_y);
            const sizeY = Math.max(10, (building.max_elevation - building.min_elevation) * 4.0);
            const radius = Math.sqrt(sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ) * 0.5;

            map.set(building.id, {
                center: new THREE.Vector3(sceneCenterX, sceneCenterY, sceneCenterZ),
                size: new THREE.Vector3(sizeX, sizeY, sizeZ),
                radius
            });
        }

        return map;
    }, [terrain, terrainMeta, buildings]);


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

                <PerfFrameTracker />

                <NZTerrainMesh
                    terrain={terrain}
                    layer={layer}
                />


                {showBuildings &&
                    terrainMeta &&
                    buildings.map(
                        building => {
                            const isSelected = selectedBuilding?.id === building.id;
                            const isDeemphasized = isAnySelected && !isSelected;
                            return (
                                <NZBuildingMesh
                                    key={building.id}
                                    building={building}
                                    terrain={terrain}
                                    terrainMeta={terrainMeta}
                                    isSelected={isSelected}
                                    isDeemphasized={isDeemphasized}
                                    onSelect={
                                        setSelectedBuilding
                                    }
                                />
                            );
                        }
                    )
                }


                <OrbitControls
                    ref={controlsRef}
                    makeDefault
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={60}
                    maxDistance={1400}
                    target={[
                        0,
                        0,
                        0
                    ]}
                />

                <CameraController
                    selectedBuilding={selectedBuilding}
                    buildingSceneInfoMap={buildingSceneInfoMap}
                    controlsRef={controlsRef}
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


            {/* PROPERTY INTELLIGENCE */}

            {selectedBuilding && (
                <PropertyIntelligencePanel
                    building={selectedBuilding}
                    onClose={() => setSelectedBuilding(null)}
                />
            )}


            <div className="nz-footer-info">
                EPSG:2193 · NZTM2000 · LiDAR-derived
            </div>

        </div>
    );
}
