import { useState } from "react";

import {
    uploadLidar,
    uploadSatellite,
    runPipeline,
} from "../../services/uploadApi";


interface DataInputProps {
    onBuildComplete?: () => void;
}


export default function DataInput({
    onBuildComplete,
}: DataInputProps) {

    const [lidarFile, setLidarFile] =
        useState<File | null>(null);

    const [satelliteFiles, setSatelliteFiles] =
        useState<File[]>([]);

    const [uploading, setUploading] =
        useState(false);

    const [building, setBuilding] =
        useState(false);

    const [status, setStatus] =
        useState<string>("");

    const [error, setError] =
        useState<string>("");


    const handleBuild = async () => {

        if (!lidarFile) {
            setError(
                "Please select a LiDAR LAS/LAZ file."
            );
            return;
        }

        if (satelliteFiles.length === 0) {
            setError(
                "Please select satellite data."
            );
            return;
        }

        setError("");
        setUploading(true);
        setStatus(
            "Uploading geospatial data..."
        );

        try {

            await uploadLidar(
                lidarFile
            );

            await uploadSatellite(
                satelliteFiles
            );

            setUploading(false);
            setBuilding(true);

            setStatus(
                "Generating 3D Digital Twin..."
            );

            const result =
                await runPipeline();

            if (!result.success) {

                throw new Error(
                    result.error ||
                    "Digital Twin generation failed."
                );
            }

            setStatus(
                `3D Digital Twin generated successfully • ${
                    result.mesh?.vertices?.toLocaleString()
                } vertices • ${
                    result.mesh?.triangles?.toLocaleString()
                } triangles`
            );

            if (onBuildComplete) {
                onBuildComplete();
            }

        } catch (err) {

            console.error(
                "Digital Twin build failed:",
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "Digital Twin build failed."
            );

            setStatus("");

        } finally {

            setUploading(false);
            setBuilding(false);
        }
    };


    return (
        <div
            style={{
                padding: "18px",
                marginBottom: "16px",
                background: "#111827",
                border: "1px solid #334155",
                borderRadius: "12px",
                color: "#e5e7eb",
            }}
        >

            <div
                style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    marginBottom: "4px",
                }}
            >
                Generate 3D Digital Twin
            </div>

            <div
                style={{
                    fontSize: "12px",
                    color: "#94a3b8",
                    marginBottom: "16px",
                }}
            >
                Upload LiDAR elevation data and
                satellite imagery to generate the
                terrain mesh.
            </div>


            {/* LiDAR */}

            <div
                style={{
                    marginBottom: "14px",
                }}
            >

                <div
                    style={{
                        fontWeight: 600,
                        marginBottom: "6px",
                    }}
                >
                    LiDAR Data
                </div>

                <input
                    type="file"
                    accept=".las,.laz"
                    onChange={(event) => {

                        const file =
                            event.target.files?.[0];

                        setLidarFile(
                            file ?? null
                        );

                        setError("");
                    }}
                />

                {lidarFile && (
                    <div
                        style={{
                            marginTop: "6px",
                            fontSize: "12px",
                            color: "#86efac",
                        }}
                    >
                        ✓ {lidarFile.name}
                    </div>
                )}

            </div>


            {/* Satellite */}

            <div
                style={{
                    marginBottom: "16px",
                }}
            >

                <div
                    style={{
                        fontWeight: 600,
                        marginBottom: "6px",
                    }}
                >
                    Satellite Data
                </div>

                <input
                    type="file"
                    multiple
                    accept=".jp2,.tif,.tiff"
                    onChange={(event) => {

                        const files =
                            Array.from(
                                event.target.files ?? []
                            );

                        setSatelliteFiles(
                            files
                        );

                        setError("");
                    }}
                />

                {satelliteFiles.length > 0 && (
                    <div
                        style={{
                            marginTop: "6px",
                            fontSize: "12px",
                            color: "#86efac",
                        }}
                    >
                        ✓ {satelliteFiles.length}
                        {" "}
                        satellite file(s) selected
                    </div>
                )}

            </div>


            <button
                onClick={handleBuild}
                disabled={
                    uploading ||
                    building
                }
                style={{
                    padding: "10px 18px",
                    border: "none",
                    borderRadius: "7px",
                    background:
                        uploading || building
                            ? "#475569"
                            : "#16a34a",
                    color: "white",
                    fontWeight: 700,
                    cursor:
                        uploading || building
                            ? "wait"
                            : "pointer",
                }}
            >
                {uploading
                    ? "Uploading..."
                    : building
                        ? "Generating 3D Mesh..."
                        : "Generate 3D Digital Twin"}
            </button>


            {status && (
                <div
                    style={{
                        marginTop: "12px",
                        padding: "8px 10px",
                        background: "#0f172a",
                        borderRadius: "6px",
                        border: "1px solid #334155",
                        color: "#86efac",
                        fontSize: "12px",
                    }}
                >
                    {status}
                </div>
            )}


            {error && (
                <div
                    style={{
                        marginTop: "12px",
                        padding: "8px 10px",
                        background: "#450a0a",
                        borderRadius: "6px",
                        border: "1px solid #7f1d1d",
                        color: "#fca5a5",
                        fontSize: "12px",
                    }}
                >
                    {error}
                </div>
            )}

        </div>
    );
}
