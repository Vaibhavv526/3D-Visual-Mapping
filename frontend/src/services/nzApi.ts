const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";


export interface NZTerrainData {
    vertices: number[][];
    faces: number[][];
    elevation: number[];
    slope: number[];
    relative_elevation: number[];
    rgb: number[][];
    ndvi: number[];
    vertex_count: number;
    triangle_count: number;
    crs: string;
    dataset: string;
}


export interface NZBuilding {
    id: string;
    vertices: number[][];
    faces: number[][];
    point_count: number;
    triangle_count: number;

    rgb: number[][];
    ndvi: number[];

    height: number;
    ground_elevation: number;
    local_ground_elevation: number;
    roof_elevation: number;
    structural_height?: number;
    structural_roof_elevation?: number;

    min_elevation: number;
    max_elevation: number;
    height_range: number;

    bounds: {
        min_x: number;
        max_x: number;
        min_y: number;
        max_y: number;
    };
    vertical_structure?: NZVerticalStructure | null;
}

export type VerticalExplorationMode =
    | "building"
    | "exploring";

export interface NZFloorLevel {
    floor_index: number;
    label: string;
    base_elevation: number;
    top_elevation: number;
    height: number;
    vertical_unit_id: string | null;
    geometry_status?: string;
    geometry_source?: string;
    footprint?: number[][];
    footprint_area?: number;
    footprint_width?: number;
    footprint_depth?: number;
    point_count?: number;
    support_ratio?: number;
}

export type NZVerticalConsistencyStatus = "HIGH" | "MODERATE" | "LIMITED" | "NOT_AVAILABLE";

export interface NZVerticalConsistencySignal {
    name: string;
    description: string;
    value: number;
}

export interface NZVerticalConsistencyLevel {
    level_index: number;
    consistency_status: NZVerticalConsistencyStatus;
    explanation: string;
    signals: NZVerticalConsistencySignal[];
}

export interface NZVerticalStructureConsistency {
    building_id: string;
    overall_status: NZVerticalConsistencyStatus;
    available_signal_count: number;
    disclaimer: string;
    levels: NZVerticalConsistencyLevel[];
}

export interface NZVerticalStructure {
    building_id: string;
    property_id_3d: string | null;
    building_height: number;
    ground_elevation: number;
    roof_elevation: number;
    structural_height?: number;
    structural_roof_elevation?: number;
    raw_max_z?: number;
    raw_height?: number;
    roof_estimation_method?: string;
    estimated_floor_height: number;
    estimated_floor_count: number;
    description?: string;
    consistency?: NZVerticalStructureConsistency | null;
    floors: NZFloorLevel[];
}


export interface NZBuildingsData {
    buildings: NZBuilding[];
    building_count: number;
    crs: string;
    dataset: string;
}


export async function getNZTerrain(): Promise<NZTerrainData> {

    const t0 = performance.now();
    const res = await fetch(`${API_BASE_URL}/api/nz/terrain`);
    const tHeaders = performance.now();
    const text = await res.text();
    const tDownload = performance.now();
    const data = JSON.parse(text);
    const tParse = performance.now();

    const sizeBytes = new Blob([text]).size;
    console.log(`[PERF:API_TERRAIN] Total: ${(tParse - t0).toFixed(2)}ms | TTFB: ${(tHeaders - t0).toFixed(2)}ms | Download: ${(tDownload - tHeaders).toFixed(2)}ms | JSON Parse: ${(tParse - tDownload).toFixed(2)}ms | Payload: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB (${sizeBytes.toLocaleString()} bytes)`);

    return data;
}


export async function getNZBuildings(): Promise<NZBuildingsData> {

    const t0 = performance.now();
    const res = await fetch(`${API_BASE_URL}/api/nz/buildings`);
    const tHeaders = performance.now();
    const text = await res.text();
    const tDownload = performance.now();
    const data = JSON.parse(text);
    const tParse = performance.now();

    const sizeBytes = new Blob([text]).size;
    console.log(`[PERF:API_BUILDINGS] Total: ${(tParse - t0).toFixed(2)}ms | TTFB: ${(tHeaders - t0).toFixed(2)}ms | Download: ${(tDownload - tHeaders).toFixed(2)}ms | JSON Parse: ${(tParse - tDownload).toFixed(2)}ms | Payload: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB (${sizeBytes.toLocaleString()} bytes)`);

    return data;
}


export interface NZParcel {
    parcel_id: string;
    appellation?: string | null;
    parcel_intent?: string | null;
    land_district?: string | null;
    statutory_actions?: string | null;
    titles?: string | null;
    survey_area?: number | null;
    calculated_area: number;
    centroid: [number, number];
    bounds: {
        min_x: number;
        max_x: number;
        min_y: number;
        max_y: number;
    };
    rings: number[][][];
    associated_building_ids: string[];
}


export interface NZIntersectingParcel {
    parcel_id: string;
    intersection_area: number;
    overlap_fraction: number;
}


export interface NZBuildingCadastralAssociation {
    building_id: string;
    primary_parcel_id: string | null;
    property_id_3d: string | null;
    vertical_unit_id: string | null;
    identity_status: "Parcel associated" | "Multi-parcel" | "Unassociated building" | string;
    association_type: "Centroid contained" | "Footprint intersection" | "Unassociated";
    overlap_fraction: number | null;
    footprint_method?: string;
    is_multi_parcel: boolean;
    intersecting_parcels: NZIntersectingParcel[];
    notes?: string;
    vertical_structure?: NZVerticalStructure | null;
}


export interface NZParcelsSummary {
    total_parcels: number;
    parcels_with_buildings: number;
    vacant_parcels: number;
    multi_building_parcels: number;
    total_buildings: number;
    associated_buildings: number;
    unassociated_buildings: number;
    multi_parcel_buildings: number;
    identities_generated?: number;
}


export interface NZParcelsData {
    available: boolean;
    message?: string;
    dataset?: string;
    crs: string;
    source?: string;
    licence?: string;
    processed_at_utc?: string;
    summary: NZParcelsSummary | null;
    parcels: NZParcel[];
    associations: NZBuildingCadastralAssociation[] | Record<string, NZBuildingCadastralAssociation>;
}


export async function getNZParcels(): Promise<NZParcelsData> {
    const t0 = performance.now();
    try {
        const res = await fetch(`${API_BASE_URL}/api/nz/parcels`);
        const tHeaders = performance.now();
        if (!res.ok) {
            return {
                available: false,
                crs: "EPSG:2193",
                parcels: [],
                associations: [],
                summary: null,
            };
        }
        const text = await res.text();
        const tDownload = performance.now();
        const data: NZParcelsData = JSON.parse(text);
        const tParse = performance.now();

        const sizeBytes = new Blob([text]).size;
        console.log(
            `[PERF:API_PARCELS] Total: ${(tParse - t0).toFixed(2)}ms | TTFB: ${(tHeaders - t0).toFixed(2)}ms | Download: ${(tDownload - tHeaders).toFixed(2)}ms | JSON Parse: ${(tParse - tDownload).toFixed(2)}ms | Payload: ${(sizeBytes / 1024).toFixed(1)} KB`
        );

        return data;
    } catch (err) {
        console.warn("[API_PARCELS] Could not fetch cadastral parcels:", err);
        return {
            available: false,
            crs: "EPSG:2193",
            parcels: [],
            associations: [],
            summary: null,
        };
    }
}

export type ValidationStatus = "PASS" | "WARNING" | "ERROR" | "NOT_AVAILABLE";

export interface NZBuildingMLProfile {
    building_id: string;
    anomaly_score: number;
    normalized_deviation: number;
    classification: "Typical" | "Moderately unusual" | "Highly unusual";
    feature_summary: {
        Height: number;
        "Estimated Levels": number;
        "Footprint Area (bbox)": number;
        "Ground Elevation": number;
        "Roof Elevation": number;
    };
}

export interface NZBuildingMLSummary {
    model_type: string;
    feature_names: string[];
    training_sample_count: number;
    dataset: string;
    disclaimer: string;
    profiles: NZBuildingMLProfile[];
}

export async function getNZMLBuildings(): Promise<NZBuildingMLSummary> {
    const res = await fetch(`${API_BASE_URL}/api/nz/ml/buildings`);
    if (!res.ok) {
        throw new Error(`Failed to fetch NZ ML buildings: ${res.statusText}`);
    }
    return res.json();
}

export interface ValidationCheck {
    rule: string;
    status: ValidationStatus;
    title: string;
    message: string;
    details?: string;
}

export interface ValidationResult {
    overallStatus: ValidationStatus;
    passCount: number;
    warningCount: number;
    errorCount: number;
    unavailableCount: number;
    checks: ValidationCheck[];
}

export function validate3DProperty(
    building: NZBuilding | null,
    cadastralAssoc: NZBuildingCadastralAssociation | null | undefined,
    parcelsAvailable: boolean
): ValidationResult {
    const checks: ValidationCheck[] = [];
    let passCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let unavailableCount = 0;

    const addCheck = (check: ValidationCheck) => {
        checks.push(check);
        if (check.status === "PASS") passCount++;
        else if (check.status === "WARNING") warningCount++;
        else if (check.status === "ERROR") errorCount++;
        else if (check.status === "NOT_AVAILABLE") unavailableCount++;
    };

    if (!building) {
        return {
            overallStatus: "NOT_AVAILABLE",
            passCount: 0,
            warningCount: 0,
            errorCount: 0,
            unavailableCount: 0,
            checks: []
        };
    }

    // --- 1. GEOMETRY VALIDATION ---
    // A. Coordinate validity
    let coordsValid = true;
    for (const v of building.vertices) {
        if (!Number.isFinite(v[0]) || !Number.isFinite(v[1]) || !Number.isFinite(v[2])) {
            coordsValid = false;
            break;
        }
    }

    // B. Bounds validity
    const b = building.bounds;
    const boundsValid = b.min_x < b.max_x && b.min_y < b.max_y;

    // C. Vertex bounds consistency
    let vertexBoundsValid = true;
    const tol = 0.001;
    for (const v of building.vertices) {
        if (v[0] < b.min_x - tol || v[0] > b.max_x + tol || v[1] < b.min_y - tol || v[1] > b.max_y + tol) {
            vertexBoundsValid = false;
            break;
        }
    }

    // D. Face index validity & E. Face structure validity
    let facesValid = true;
    for (const f of building.faces) {
        if (f.length !== 3) {
            facesValid = false;
            break;
        }
        for (const idx of f) {
            if (idx < 0 || idx >= building.vertices.length || !Number.isInteger(idx)) {
                facesValid = false;
                break;
            }
        }
        if (!facesValid) break;
    }

    if (!coordsValid || !boundsValid || !vertexBoundsValid || !facesValid) {
        addCheck({
            rule: "geometry_integrity",
            status: "ERROR",
            title: "Geometry bounds",
            message: "Building geometry contains invalid coordinates, bounds, or faces."
        });
    } else {
        addCheck({
            rule: "geometry_integrity",
            status: "PASS",
            title: "Geometry integrity",
            message: "Building geometry is internally consistent."
        });
    }

    // --- 2. VERTICAL STRUCTURE VALIDATION ---
    const vs = building.vertical_structure;
    if (vs) {
        let vsError = false;
        let vsWarning = false;

        // A. Floor count consistency
        if (vs.estimated_floor_count !== vs.floors.length) vsError = true;

        // B. Floor ordering, E. Positive floor height, F. Height consistency, G. No significant vertical overlap
        for (let i = 0; i < vs.floors.length; i++) {
            const f = vs.floors[i];
            if (f.top_elevation <= f.base_elevation) vsError = true;
            if (Math.abs(f.height - (f.top_elevation - f.base_elevation)) > 0.05) vsError = true;
            if (i > 0) {
                const prev = vs.floors[i - 1];
                if (prev.top_elevation > f.base_elevation + 0.05) vsError = true; // overlap
            }
        }

        // C. First floor base
        if (vs.floors.length > 0) {
            if (Math.abs(vs.floors[0].base_elevation - building.ground_elevation) > 0.05) vsError = true;
        }

        // D. Final roof relationship
        if (vs.floors.length > 0) {
            const targetRoofElev = vs.structural_roof_elevation ?? building.roof_elevation;
            if (Math.abs(vs.floors[vs.floors.length - 1].top_elevation - targetRoofElev) > 0.05) vsError = true;
        }

        // H. Vertical ID consistency
        if (vs.property_id_3d) {
            for (const f of vs.floors) {
                if (!f.vertical_unit_id || !f.vertical_unit_id.startsWith(vs.property_id_3d + "-L")) vsError = true;
            }
        } else {
            for (const f of vs.floors) {
                if (f.vertical_unit_id) vsError = true;
            }
        }

        // I. Floor-height plausibility
        if (vs.estimated_floor_height < 2.0 || vs.estimated_floor_height > 6.0) vsWarning = true;

        if (vsError) {
            addCheck({
                rule: "vertical_structure",
                status: "ERROR",
                title: "Vertical structure",
                message: "Vertical levels are inconsistent or have structural overlap."
            });
        } else if (vsWarning) {
            addCheck({
                rule: "vertical_structure",
                status: "WARNING",
                title: "Floor-height estimate",
                message: "Estimated level height is outside the typical display range. Review LiDAR-derived assumption."
            });
        } else {
            addCheck({
                rule: "vertical_structure",
                status: "PASS",
                title: "Vertical structure",
                message: `${vs.floors.length} estimated levels form a continuous vertical sequence.`
            });
        }
    } else {
        addCheck({
            rule: "vertical_structure",
            status: "PASS", // No vertical structure, nothing to invalidate
            title: "Vertical structure",
            message: "No vertical structure defined for this building."
        });
    }

    // --- 3. PROPERTY IDENTITY VALIDATION ---
    if (!parcelsAvailable) {
        addCheck({
            rule: "property_identity",
            status: "PASS",
            title: "Property identity",
            message: "Identity state is consistent with the available cadastral data."
        });
    } else if (cadastralAssoc) {
        let idValid = true;
        if (cadastralAssoc.primary_parcel_id) {
            const expectedId = `3DP-${cadastralAssoc.primary_parcel_id}-${building.id}`;
            if (cadastralAssoc.property_id_3d !== expectedId) {
                idValid = false;
            } else if (cadastralAssoc.vertical_unit_id && !cadastralAssoc.vertical_unit_id.startsWith(expectedId + "-L")) {
                idValid = false;
            }
        } else {
            if (cadastralAssoc.property_id_3d || cadastralAssoc.vertical_unit_id) idValid = false;
        }

        if (!idValid) {
            addCheck({
                rule: "property_identity",
                status: "ERROR",
                title: "Property identity",
                message: "Deterministic 3D property identity is inconsistent."
            });
        } else {
            addCheck({
                rule: "property_identity",
                status: "PASS",
                title: "Property identity",
                message: cadastralAssoc.primary_parcel_id ? "Deterministic 3D property identity is consistent." : "Identity state is consistent with the available cadastral data."
            });
        }
    } else {
        // parcelsAvailable is true, but cadastralAssoc is null/unassociated
        addCheck({
            rule: "property_identity",
            status: "PASS",
            title: "Property identity",
            message: "Identity state is consistent with the available cadastral data."
        });
    }

    // --- 4. CADASTRAL ASSOCIATION VALIDATION & 5. BUILDING <-> PARCEL TOPOLOGY ---
    if (!parcelsAvailable) {
        addCheck({
            rule: "cadastral_topology",
            status: "NOT_AVAILABLE",
            title: "Cadastral topology",
            message: "Cadastral dataset not loaded. Parcel topology checks are unavailable."
        });
    } else if (cadastralAssoc) {
        let cadError = false;
        let cadWarning = false;
        let cadMsg = "Building-to-parcel topology is consistent.";

        // B. Primary parcel consistency
        if (cadastralAssoc.association_type === "Centroid contained" || cadastralAssoc.association_type === "Footprint intersection") {
            if (!cadastralAssoc.primary_parcel_id) cadError = true;
        } else if (cadastralAssoc.association_type === "Unassociated") {
            if (cadastralAssoc.primary_parcel_id) cadError = true;
        }

        // C. Multi-parcel relationship
        if (cadastralAssoc.is_multi_parcel) {
            if (!cadastralAssoc.intersecting_parcels || cadastralAssoc.intersecting_parcels.length < 2) cadError = true;
            else {
                cadWarning = true;
                cadMsg = "Multiple parcel intersection requires review.";
            }
        }

        // D. Overlap fraction validity
        if (cadastralAssoc.overlap_fraction !== null) {
            if (cadastralAssoc.overlap_fraction < 0 || cadastralAssoc.overlap_fraction > 1) cadError = true;
        }

        if (cadError) {
            addCheck({
                rule: "cadastral_topology",
                status: "ERROR",
                title: "Cadastral topology",
                message: "Cadastral association metadata is inconsistent."
            });
        } else if (cadWarning) {
            addCheck({
                rule: "cadastral_topology",
                status: "WARNING",
                title: "Cadastral topology",
                message: cadMsg
            });
        } else {
            addCheck({
                rule: "cadastral_topology",
                status: "PASS",
                title: "Cadastral topology",
                message: cadMsg
            });
        }
    }

    // Overall Status
    let overallStatus: ValidationStatus = "PASS";
    if (errorCount > 0) overallStatus = "ERROR";
    else if (warningCount > 0) overallStatus = "WARNING";
    else if (passCount === 0 && unavailableCount > 0) overallStatus = "NOT_AVAILABLE";

    return {
        overallStatus,
        passCount,
        warningCount,
        errorCount,
        unavailableCount,
        checks
    };
}

export type ScreeningStatus = "NORMAL" | "REVIEW" | "PRIORITY REVIEW";

export interface BuildingScreeningResult {
    status: ScreeningStatus;
    reasons: string[];
}

export function computeBuildingScreening(
    validationResult: ValidationResult,
    mlProfile: NZBuildingMLProfile | null | undefined
): BuildingScreeningResult {
    const reasons: string[] = [];
    let isPriority = false;
    let isReview = false;

    // Evaluate ML
    if (mlProfile) {
        if (mlProfile.classification === "Highly unusual") {
            isPriority = true;
            reasons.push(`Highly unusual structural profile (${(mlProfile.normalized_deviation * 100).toFixed(1)}% deviation)`);
        } else if (mlProfile.classification === "Moderately unusual") {
            isReview = true;
            reasons.push(`Moderately unusual structural profile (${(mlProfile.normalized_deviation * 100).toFixed(1)}% deviation)`);
        }
    }

    // Evaluate Validation
    if (validationResult.overallStatus === "ERROR") {
        isPriority = true;
        reasons.push("Meaningful geometry/identity consistency failure.");
    } else if (validationResult.overallStatus === "WARNING") {
        isReview = true;
        reasons.push("Deterministic validation contains a non-critical warning.");
    }

    let status: ScreeningStatus = "NORMAL";
    if (isPriority) {
        status = "PRIORITY REVIEW";
    } else if (isReview) {
        status = "REVIEW";
    }

    return {
        status,
        reasons
    };
}


