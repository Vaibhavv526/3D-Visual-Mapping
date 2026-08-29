import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export interface BuildResult {
    success: boolean;
    status?: string;
    vertices?: number;
    triangles?: number;
    crs?: string;
    resolution_m?: number;
    output?: string;
    error?: string;
}

export async function buildDigitalTwin(): Promise<BuildResult> {
    const response =
        await axios.post<BuildResult>(
            `${API_BASE_URL}/api/pipeline/build`
        );

    return response.data;
}
