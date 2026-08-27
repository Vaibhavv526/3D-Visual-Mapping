import { useEffect, useState } from "react";

import {
    getAnalytics,
    type AnalyticsData
} from "../../services/analyticsApi";


export default function AnalyticsCards() {

    const [
        analytics,
        setAnalytics
    ] =
        useState<AnalyticsData | null>(
            null
        );

    const [
        error,
        setError
    ] =
        useState<string | null>(
            null
        );


    useEffect(() => {

        getAnalytics()
            .then((data) => {

                console.log(
                    "Analytics loaded:",
                    data
                );

                setAnalytics(data);
            })
            .catch((err) => {

                console.error(
                    "Analytics loading failed:",
                    err
                );

                setError(
                    "Failed to load analytics"
                );
            });

    }, []);


    if (error) {

        return (
            <section className="analytics-cards-state">
                {error}
            </section>
        );
    }


    if (!analytics) {

        return (
            <section className="analytics-cards-state">
                Loading analytics...
            </section>
        );
    }


    const {
        terrain,
        slope,
        ndvi
    } = analytics;


    return (
        <section className="analytics-cards">

            <div className="analytics-card">

                <h3>
                    MEAN ELEVATION
                </h3>

                <strong>
                    {terrain.elevation_mean_m.toFixed(2)}
                </strong>

                <span>
                    meters
                </span>

            </div>


            <div className="analytics-card">

                <h3>
                    MEAN SLOPE
                </h3>

                <strong>
                    {slope.mean_degrees.toFixed(2)}
                </strong>

                <span>
                    degrees
                </span>

            </div>


            <div className="analytics-card">

                <h3>
                    MEAN NDVI
                </h3>

                <strong>
                    {ndvi.mean.toFixed(3)}
                </strong>

                <span>
                    vegetation index
                </span>

            </div>


            <div className="analytics-card">

                <h3>
                    TERRAIN AREA
                </h3>

                <strong>
                    {terrain.planar_area_m2.toLocaleString()}
                </strong>

                <span>
                    m²
                </span>

            </div>

        </section>
    );
}