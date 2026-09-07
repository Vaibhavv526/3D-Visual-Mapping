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

export interface NZFloorLevel {
    floor_index: number;
    label: string;
    base_elevation: number;
    top_elevation: number;
    height: number;
    vertical_unit_id: string | null;
}

export interface NZVerticalStructure {
    building_id: string;
    property_id_3d: string | null;
    building_height: number;
    ground_elevation: number;
    roof_elevation: number;
    estimated_floor_height: number;
    estimated_floor_count: number;
    description?: string;
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

