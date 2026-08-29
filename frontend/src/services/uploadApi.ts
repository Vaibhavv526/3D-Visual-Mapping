import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export interface UploadResult {
    success: boolean;
    type?: string;
    filename?: string;
    path?: string;
    error?: string;
}

export async function uploadLidar(
    file: File
): Promise<UploadResult> {

    const formData = new FormData();

    formData.append("file", file);

    const response =
        await axios.post<UploadResult>(
            `${API_BASE_URL}/api/upload/lidar`,
            formData
        );

    return response.data;
}


export async function uploadSatellite(
    files: File[]
): Promise<UploadResult[]> {

    const results: UploadResult[] = [];

    for (const file of files) {

        const formData = new FormData();

        formData.append("file", file);

        const response =
            await axios.post<UploadResult>(
                `${API_BASE_URL}/api/upload/satellite`,
                formData
            );

        results.push(response.data);
    }

    return results;
}


export async function runPipeline() {

    const response =
        await axios.post(
            `${API_BASE_URL}/api/pipeline/run`
        );

    return response.data;
}
