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
