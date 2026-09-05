import axios from "axios";

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

    const response =
        await axios.get<NZTerrainData>(
            `${API_BASE_URL}/api/nz/terrain`
        );

    return response.data;
}


export async function getNZBuildings(): Promise<NZBuildingsData> {

    const response =
        await axios.get<NZBuildingsData>(
            `${API_BASE_URL}/api/nz/buildings`
        );

    return response.data;
}
