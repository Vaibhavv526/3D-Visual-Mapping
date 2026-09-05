import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export interface TerrainData {
    vertices: number[][];
    faces: number[][];
    elevation: number[];
    ndvi: number[];
    slope: number[];
    rgb: number[][];
    vertex_count: number;
    triangle_count: number;
    crs: string;
}

export async function getTerrain(): Promise<TerrainData> {
    const response = await axios.get<TerrainData>(
        `${API_BASE_URL}/api/nz/terrain`
    );

    return response.data;
}