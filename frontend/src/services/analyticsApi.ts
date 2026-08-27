import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface TerrainAnalytics {
    vertices: number;
    faces: number;

    elevation_min_m: number;
    elevation_max_m: number;
    elevation_mean_m: number;
    elevation_range_m: number;

    width_m: number;
    height_m: number;

    planar_area_m2: number;
    surface_area_m2: number;
}

export interface SlopeAnalytics {
    minimum_degrees: number;
    maximum_degrees: number;
    mean_degrees: number;
    stddev_degrees: number;
}

export interface NDVIAnalytics {
    minimum: number;
    maximum: number;
    mean: number;
    stddev: number;

    pixels: number;

    very_low_count: number;
    low_count: number;
    moderate_count: number;
    high_count: number;

    very_low_percent: number;
    low_percent: number;
    moderate_percent: number;
    high_percent: number;
}

export interface AnalyticsData {
    terrain: TerrainAnalytics;
    slope: SlopeAnalytics;
    ndvi: NDVIAnalytics;

    bounds: {
        x_min: number;
        x_max: number;
        y_min: number;
        y_max: number;
    };
}

export async function getAnalytics(): Promise<AnalyticsData> {

    const response =
        await axios.get<AnalyticsData>(
            `${API_BASE_URL}/api/analytics`
        );

    return response.data;
}
