import { jsPDF } from "jspdf";
import type { NZBuilding } from "./nzApi";

export interface BuildingSiteAnalysis {
    groundElevation: number;
    localSlope: number;
    terrainClass: "Flat" | "Moderate" | "Steep";
    relativeElevation: number;
    elevationClass: "Low" | "Moderate" | "High";
    nearbyCount50m: number;
    nearestBuildingId: string;
    nearestDistance: number;
    proximityClass: "Low" | "Moderate" | "High";
    meanNdvi: number;
    vegetationClass: "Low vegetation" | "Moderate vegetation" | "High vegetation";
    spatialContext: "Low" | "Moderate" | "High";
    contextScore: number;
    overallAttention?: "Low" | "Moderate" | "High";
    attentionScore?: number;
    comparison: BuildingLocalComparison;
}

export interface BuildingLocalComparison {
    baselineLabel: string;
    isFallback: boolean;
    nearbyCount100m: number;
    heightDelta: number;
    nearbyHeightAvg: number;
    heightRank: number;
    heightPercentile: number;
    areaDelta: number;
    nearbyAreaAvg: number;
    areaRatio: number;
    groundDelta: number;
    nearbyGroundAvg: number;
    nearestBuildingId: string;
    nearestDistance: number;
    nearestHeightDelta: number;
    nearestRelativeText: string;
}

export interface PairwiseMeasurementData {
    targetId: string;
    targetHeight: number;
    targetGroundElevation: number;
    horizontalDistance: number;
    distance3D: number;
    baseElevationDiff: number;
    heightDiff: number;
}

export interface BuildingDossierPdfOptions {
    building: NZBuilding;
    analysis?: BuildingSiteAnalysis;
    pairwise?: PairwiseMeasurementData | null;
    datasetName?: string;
    crsName?: string;
}

export interface AreaSummaryPdfOptions {
    areaData: {
        tileWidth: number;
        tileHeight: number;
        surveyAreaHa: number;
        totalFootprintM2: number;
        coveragePct: number;
        totalBuildings: number;
        avgHeight: number;
        tallestHeight: number;
        tallestBuildingId: string;
        tallCount10m: number;
        slopeFlatCount: number;
        slopeModerateCount: number;
        slopeSteepCount: number;
        contextLowCount: number;
        contextModerateCount: number;
        contextHighCount: number;
        isolatedCount: number;
        ndviMean: number;
        ndviLowPct: number;
        ndviModPct: number;
        ndviHighPct: number;
    };
    terrainMeta?: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        width: number;
        height: number;
        areaM2: number;
        areaHa: number;
        elevationMean: number;
    } | null;
    elevationMin?: number;
    elevationMax?: number;
    activeFilter?: string;
    matchedBuildingsCount?: number;
}

// Helpers for drawing grid cards and sections
interface MetricItem {
    label: string;
    value: string;
    note?: string;
    highlight?: boolean;
    valRgb?: [number, number, number];
}

function drawSectionHeader(doc: jsPDF, y: number, title: string, tag?: string): number {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.roundedRect(14, y, 182, 6.2, 1, 1, "FD");

    // Cyan/blue left indicator bar
    doc.setFillColor(2, 132, 199); // #0284c7
    doc.rect(14, y, 2.5, 6.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(title.toUpperCase(), 19, y + 4.3);

    if (tag) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(tag, 192, y + 4.3, { align: "right" });
    }

    return y + 7.8;
}

function drawMetricRow(
    doc: jsPDF,
    startY: number,
    items: MetricItem[],
    cols = 4,
    cardHeight = 11.5
): number {
    const gap = 2.5;
    const colWidth = (182 - (cols - 1) * gap) / cols;

    for (let j = 0; j < items.length; j++) {
        const item = items[j];
        const x = 14 + j * (colWidth + gap);

        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.roundedRect(x, startY, colWidth, cardHeight, 1, 1, "FD");

        // Label
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(item.label.toUpperCase(), x + 2.5, startY + 3.4);

        // Value
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.2);
        if (item.valRgb) {
            doc.setTextColor(item.valRgb[0], item.valRgb[1], item.valRgb[2]);
        } else if (item.highlight) {
            doc.setTextColor(2, 132, 199); // #0284c7 cyan
        } else {
            doc.setTextColor(15, 23, 42); // slate-900
        }
        doc.text(item.value, x + 2.5, startY + 7.2);

        // Note
        if (item.note) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(5.5);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text(item.note, x + 2.5, startY + 10.2);
        }
    }

    return startY + cardHeight + 2.4;
}

export function exportBuildingDossierPdf(options: BuildingDossierPdfOptions): jsPDF {
    const { building, analysis, pairwise } = options;
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
    });

    const datasetName = options.datasetName || "New Zealand LiDAR + Sentinel-2";
    const crsName = options.crsName || "EPSG:2193 (NZTM2000 / NZGD2000)";

    // Computations
    const width = building.bounds.max_x - building.bounds.min_x;
    const depth = building.bounds.max_y - building.bounds.min_y;
    const centroidX = (building.bounds.min_x + building.bounds.max_x) / 2;
    const centroidY = (building.bounds.min_y + building.bounds.max_y) / 2;
    const bboxArea = width * depth;
    const estimatedStoreys = Math.max(1, Math.round(building.height / 3.2));

    const meanNdvi =
        building.ndvi && building.ndvi.length > 0
            ? building.ndvi.reduce((sum, v) => sum + v, 0) / building.ndvi.length
            : 0;

    let ndviInterpretation = "Impervious Surface";
    if (meanNdvi >= 0.35) ndviInterpretation = "Vegetated Surface";
    else if (meanNdvi >= 0.22) ndviInterpretation = "Mixed / Canopy Overhang";
    else if (meanNdvi >= 0.12) ndviInterpretation = "Built / Low Canopy";

    const meanRgb =
        building.rgb && building.rgb.length > 0
            ? [
                building.rgb.reduce((s, c) => s + c[0], 0) / building.rgb.length,
                building.rgb.reduce((s, c) => s + c[1], 0) / building.rgb.length,
                building.rgb.reduce((s, c) => s + c[2], 0) / building.rgb.length
            ]
            : [0.5, 0.5, 0.5];

    const rgb255 = [
        Math.round(meanRgb[0] * 255),
        Math.round(meanRgb[1] * 255),
        Math.round(meanRgb[2] * 255)
    ];

    const dateStr = new Date().toLocaleDateString("en-NZ", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });

    // =========================================================================
    // 1. TOP HEADER BANNER (Deep Navy #0f172a)
    // =========================================================================
    let y = 12;

    // Header container
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(14, y, 182, 25, 2, 2, "F");

    // Top Kicker
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(56, 189, 248); // sky-400
    doc.text("MUNICIPAL SURVEY DOSSIER · NEW ZEALAND DIGITAL TWIN", 20, y + 6);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(248, 250, 252); // slate-50
    doc.text("3D Visual Mapping · Geospatial Structure Audit", 20, y + 13.5);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Airborne LiDAR Elevation & Sentinel-2 Surface Reflectance Analytics", 20, y + 19);

    // Right Structure ID Badge
    doc.setFillColor(30, 41, 59); // slate-800
    doc.setDrawColor(56, 189, 248); // sky-400
    doc.setLineWidth(0.3);
    doc.roundedRect(146, y + 3.5, 44, 17.5, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(56, 189, 248);
    doc.text("STRUCTURE ID", 168, y + 7.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(building.id, 168, y + 13.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text("CLASS 6 · STRUCTURE", 168, y + 18, { align: "center" });

    y += 28;

    // =========================================================================
    // SECTION A: PROPERTY IDENTIFICATION
    // =========================================================================
    y = drawSectionHeader(doc, y, "A. Property Identification", crsName);
    y = drawMetricRow(doc, y, [
        {
            label: "Building ID",
            value: building.id,
            note: "New Zealand tile model",
            highlight: true
        },
        {
            label: "Dataset",
            value: datasetName,
            note: "Aerial LiDAR + MSI"
        },
        {
            label: "Centroid Easting",
            value: `${centroidX.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m E`,
            note: "NZTM2000 Easting"
        },
        {
            label: "Centroid Northing",
            value: `${centroidY.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m N`,
            note: "NZTM2000 Northing"
        }
    ]);

    // =========================================================================
    // SECTION B: BUILDING GEOMETRY
    // =========================================================================
    y = drawSectionHeader(doc, y, "B. Building Geometry", "Estimated Footprint");
    y = drawMetricRow(doc, y, [
        {
            label: "Estimated Footprint (BBox)",
            value: `${Math.round(bboxArea).toLocaleString()} m²`,
            note: "Bounding-box estimate",
            highlight: true
        },
        {
            label: "Footprint Dimensions",
            value: `${width.toFixed(1)}m W × ${depth.toFixed(1)}m L`,
            note: "Oriented bounding extents"
        },
        {
            label: "Building Height",
            value: `${building.height.toFixed(2)} m`,
            note: "Ground-to-apex delta",
            valRgb: [180, 83, 9] // amber
        },
        {
            label: "Estimated Storeys",
            value: `~${estimatedStoreys} Storey${estimatedStoreys > 1 ? "s" : ""}`,
            note: "Nominal 3.2m / storey"
        }
    ]);

    // =========================================================================
    // SECTION C: ELEVATION PROFILE
    // =========================================================================
    const groundElev = analysis?.groundElevation ?? building.ground_elevation;
    const heightRange = building.height_range ?? (building.max_elevation - building.min_elevation);
    y = drawSectionHeader(doc, y, "C. Elevation Profile", "AMSL (m)");
    y = drawMetricRow(doc, y, [
        {
            label: "Ground Elevation",
            value: `${groundElev.toFixed(2)} m`,
            note: "Terrain foundation level"
        },
        {
            label: "Roof / Apex Elevation",
            value: `${building.roof_elevation.toFixed(2)} m`,
            note: "Maximum LiDAR roof apex"
        },
        {
            label: "Min / Max Elevation",
            value: `${building.min_elevation.toFixed(2)} / ${building.max_elevation.toFixed(2)} m`,
            note: "Absolute elevation range"
        },
        {
            label: "Height Range",
            value: `${heightRange.toFixed(2)} m`,
            note: "Vertical span extent"
        }
    ]);

    // =========================================================================
    // SECTION D: LiDAR DATA & ENVIRONMENTAL CONTEXT
    // =========================================================================
    y = drawSectionHeader(doc, y, "D. LiDAR Data & Environmental Context", "Sentinel-2 MSI");
    y = drawMetricRow(doc, y, [
        {
            label: "LiDAR Point Count",
            value: `${building.point_count.toLocaleString()} pts`,
            note: "Airborne point returns"
        },
        {
            label: "Mesh Triangles",
            value: `${building.triangle_count.toLocaleString()} faces`,
            note: "Reconstructed geometry"
        },
        {
            label: "Mean NDVI",
            value: meanNdvi.toFixed(3),
            note: ndviInterpretation,
            valRgb: [16, 185, 129] // emerald
        },
        {
            label: "Surface Reflectance",
            value: `RGB [${rgb255[0]}, ${rgb255[1]}, ${rgb255[2]}]`,
            note: "Sentinel-2 BOA true-color"
        }
    ]);

    // Draw little true-color swatch inside the 4th card
    doc.setFillColor(rgb255[0], rgb255[1], rgb255[2]);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.15);
    doc.roundedRect(185, y - 11.2, 5.5, 4.2, 0.6, 0.6, "FD");

    // Context summary sub-box
    if (analysis) {
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.15);
        doc.roundedRect(14, y, 182, 6.2, 1, 1, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(2, 132, 199);
        doc.text("SPATIAL CONTEXT CLASSIFICATION:", 18, y + 4.2);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.2);
        doc.setTextColor(30, 41, 59);
        const ctxText = `Rating: ${analysis.spatialContext} (Score: ${analysis.contextScore}/7)  |  Terrain: ${analysis.terrainClass} (${analysis.localSlope.toFixed(1)}°)  |  Catchment: ${analysis.elevationClass}  |  Proximity: ${analysis.proximityClass} (${analysis.nearbyCount50m} nearby ≤50m)  |  Veg: ${analysis.vegetationClass.replace(" vegetation", "")}`;
        doc.text(ctxText, 64, y + 4.2);
        y += 8.2;
    }

    // =========================================================================
    // SECTION E: LOCAL COMPARISON (Phase 5B Baseline)
    // =========================================================================
    y = drawSectionHeader(doc, y, "E. Local Comparison", analysis?.comparison?.baselineLabel || "vs Local Neighborhood");
    if (analysis?.comparison) {
        const comp = analysis.comparison;
        y = drawMetricRow(doc, y, [
            {
                label: "Height vs Local Avg",
                value: `${comp.heightDelta >= 0 ? "+" : ""}${comp.heightDelta.toFixed(1)} m`,
                note: `Local avg: ${comp.nearbyHeightAvg.toFixed(1)} m`,
                valRgb: comp.heightDelta >= 0 ? [2, 132, 199] : [100, 116, 139]
            },
            {
                label: "Footprint vs Avg",
                value: `${comp.areaDelta >= 0 ? "+" : ""}${Math.round(comp.areaDelta)} m²`,
                note: `${comp.areaRatio.toFixed(1)}× neighborhood avg (${Math.round(comp.nearbyAreaAvg)} m²)`,
                valRgb: comp.areaDelta >= 0 ? [2, 132, 199] : [100, 116, 139]
            },
            {
                label: "Ground vs Local Base",
                value: `${comp.groundDelta >= 0 ? "+" : ""}${comp.groundDelta.toFixed(1)} m`,
                note: comp.groundDelta >= 0 ? "Above local ground base" : "Below local ground base"
            },
            {
                label: "Height Standing",
                value: `Rank #${comp.heightRank} of 56`,
                note: comp.heightPercentile <= 50 ? `Top ${comp.heightPercentile}% of structures` : `Bottom ${100 - comp.heightPercentile}% of structures`
            }
        ]);

        // Nearest neighbor summary row
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.15);
        doc.roundedRect(14, y, 182, 5.8, 1, 1, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.2);
        doc.setTextColor(100, 116, 139);
        doc.text("NEAREST STRUCTURE COMPARISON:", 18, y + 3.8);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.2);
        doc.setTextColor(15, 23, 42);
        const nearestText = `${comp.nearestBuildingId}  ·  ${comp.nearestDistance.toFixed(1)} m centroid separation  ·  ${comp.nearestRelativeText}`;
        doc.text(nearestText, 62, y + 3.8);
        y += 7.8;
    } else {
        y = drawMetricRow(doc, y, [
            { label: "Height Comparison", value: "N/A" },
            { label: "Footprint Comparison", value: "N/A" },
            { label: "Ground Comparison", value: "N/A" },
            { label: "Nearest Structure", value: "N/A" }
        ]);
    }

    // =========================================================================
    // SECTION F: SPATIAL MEASUREMENT
    // =========================================================================
    y = drawSectionHeader(doc, y, "F. Spatial Measurement", pairwise ? "Active Measurement Recorded" : "Pairwise Sensor Query");
    if (pairwise) {
        y = drawMetricRow(doc, y, [
            {
                label: "Measurement Pair",
                value: `${building.id} -> ${pairwise.targetId}`,
                note: `Target Height: ${pairwise.targetHeight.toFixed(1)} m`,
                highlight: true
            },
            {
                label: "Horizontal Distance",
                value: `${pairwise.horizontalDistance.toFixed(1)} m`,
                note: "Centroid 2D separation",
                valRgb: [180, 83, 9] // amber
            },
            {
                label: "3D Straight-Line",
                value: `${pairwise.distance3D.toFixed(1)} m`,
                note: "Direct 3D euclidean distance"
            },
            {
                label: "Base ΔZ / Height ΔZ",
                value: `${pairwise.baseElevationDiff >= 0 ? "+" : ""}${pairwise.baseElevationDiff.toFixed(1)}m / ${pairwise.heightDiff >= 0 ? "+" : ""}${pairwise.heightDiff.toFixed(1)}m`,
                note: pairwise.baseElevationDiff > 0.05 ? "Target base is higher" : pairwise.baseElevationDiff < -0.05 ? "Origin base is higher" : "Level ground"
            }
        ]);
    } else {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.roundedRect(14, y, 182, 8.5, 1, 1, "FD");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("No inter-building measurement recorded.", 18, y + 4.2);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text("Use the 3D 'Measure to Structure' tool to calculate horizontal separation, 3D euclidean distance, and elevation differentials.", 18, y + 7.2);
        y += 10.5;
    }

    // =========================================================================
    // SECTION G: DATA NOTES & LIMITATIONS (Mandatory Municipal Governance Notice)
    // =========================================================================
    y = drawSectionHeader(doc, y, "G. Data Notes & Limitations", "Official Governance Notice");

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.roundedRect(14, y, 182, 22, 1, 1, "FD");

    // Left cyan accent rule on disclaimer
    doc.setFillColor(2, 132, 199);
    doc.rect(14, y, 1.5, 22, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.7);
    doc.setTextColor(71, 85, 105); // slate-600

    const disclaimers = [
        "• Derived from the available LiDAR and Sentinel-2 data for the active New Zealand tile.",
        "• Footprint values are bounding-box estimates and are not cadastral boundaries.",
        "• Spatial Context is an indicative contextual index and is not an engineering, flood-risk, structural, zoning, or regulatory assessment.",
        "• Inter-building distances are indicative spatial measurements based on available building geometry and are not certified survey measurements.",
        "• Storey count is an estimation assuming a standard 3.2m floor height. Not a certified architectural survey."
    ];

    let dy = y + 3.8;
    for (const d of disclaimers) {
        doc.text(d, 18, dy);
        dy += 3.6;
    }
    y += 24;

    // =========================================================================
    // FOOTER
    // =========================================================================
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, 284, 196, 284);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text("3D Visual Mapping · New Zealand Digital Twin · Smart India Hackathon", 14, 288);
    doc.text("MUNICIPAL SURVEY DOSSIER · CONFIDENTIAL & TECHNICAL USE", 105, 288, { align: "center" });
    doc.text(`Page 1 of 1 · Exported: ${dateStr}`, 196, 288, { align: "right" });

    // Download the PDF
    const filename = `${building.id}_Municipal_Survey_Dossier.pdf`;
    doc.save(filename);

    return doc;
}

export function exportAreaSummaryPdf(options: AreaSummaryPdfOptions): jsPDF {
    const { areaData, terrainMeta, elevationMin = 0, elevationMax = 0 } = options;
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
    });

    const dateStr = new Date().toLocaleDateString("en-NZ", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });

    let y = 12;

    // Header container
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(14, y, 182, 25, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(56, 189, 248);
    doc.text("MUNICIPAL GEOSPATIAL AREA SUMMARY · NEW ZEALAND DIGITAL TWIN", 20, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(248, 250, 252);
    doc.text("Active LiDAR Tile Geospatial Overview", 20, y + 13.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Territorial Multi-Sensor Fusion & Built Environment Aggregates", 20, y + 19);

    doc.setFillColor(30, 41, 59);
    doc.setDrawColor(56, 189, 248);
    doc.setLineWidth(0.3);
    doc.roundedRect(146, y + 3.5, 44, 17.5, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(56, 189, 248);
    doc.text("TILE SURVEY CENSUS", 168, y + 7.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`${areaData.totalBuildings} STRUCTURES`, 168, y + 13.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text("EPSG:2193 · NZTM2000", 168, y + 18, { align: "center" });

    y += 28;

    // 1. Tile Spatial Extents
    y = drawSectionHeader(doc, y, "1. Tile Spatial Extents & Coverage", "NZTM2000");
    y = drawMetricRow(doc, y, [
        {
            label: "Tile Dimensions",
            value: `${areaData.tileWidth.toLocaleString()} m × ${areaData.tileHeight.toLocaleString()} m`,
            note: "Ground footprint bounds"
        },
        {
            label: "Survey Area",
            value: `${areaData.surveyAreaHa.toFixed(2)} ha`,
            note: `${terrainMeta?.areaM2 ? (terrainMeta.areaM2 / 1000000).toFixed(3) : "0"} km² tile area`,
            highlight: true
        },
        {
            label: "Easting Extents",
            value: `${terrainMeta?.minX?.toFixed(0) || "0"} – ${terrainMeta?.maxX?.toFixed(0) || "0"}`,
            note: "EPSG:2193 Easting (m)"
        },
        {
            label: "Northing Extents",
            value: `${terrainMeta?.minY?.toFixed(0) || "0"} – ${terrainMeta?.maxY?.toFixed(0) || "0"}`,
            note: "EPSG:2193 Northing (m)"
        }
    ]);

    // 2. Built Environment
    y = drawSectionHeader(doc, y, "2. Built Environment & Footprint Aggregates", "LiDAR Structural Census");
    y = drawMetricRow(doc, y, [
        {
            label: "Total Structures",
            value: `${areaData.totalBuildings}`,
            note: "Reconstructed 3D models",
            highlight: true
        },
        {
            label: "Total Built Footprint",
            value: `${areaData.totalFootprintM2.toLocaleString()} m²`,
            note: `${areaData.coveragePct.toFixed(1)}% of tile area`
        },
        {
            label: "Average Structure Height",
            value: `${areaData.avgHeight.toFixed(1)} m`,
            note: "Mean tile height"
        },
        {
            label: "Tallest Structure",
            value: `${areaData.tallestHeight.toFixed(1)} m`,
            note: `Structure ${areaData.tallestBuildingId}`,
            valRgb: [180, 83, 9]
        }
    ]);

    // 3. Topography & Elevation
    y = drawSectionHeader(doc, y, "3. Topographic & Elevation Distribution", "LiDAR DEM");
    y = drawMetricRow(doc, y, [
        {
            label: "Elevation Min / Max",
            value: `${elevationMin.toFixed(1)} – ${elevationMax.toFixed(1)} m`,
            note: `Mean: ${terrainMeta?.elevationMean?.toFixed(1) || "0"} m AMSL`
        },
        {
            label: "Flat Slope (<5°)",
            value: `${areaData.slopeFlatCount} structures`,
            note: `${((areaData.slopeFlatCount / areaData.totalBuildings) * 100).toFixed(0)}% of building sites`
        },
        {
            label: "Moderate Slope (5-15°)",
            value: `${areaData.slopeModerateCount} structures`,
            note: `${((areaData.slopeModerateCount / areaData.totalBuildings) * 100).toFixed(0)}% of building sites`
        },
        {
            label: "Steep Slope (≥15°)",
            value: `${areaData.slopeSteepCount} structures`,
            note: `${((areaData.slopeSteepCount / areaData.totalBuildings) * 100).toFixed(0)}% of building sites`
        }
    ]);

    // 4. Multispectral Environmental Profile
    y = drawSectionHeader(doc, y, "4. Multispectral Environmental Profile (NDVI)", "Sentinel-2 Surface Reflectance");
    y = drawMetricRow(doc, y, [
        {
            label: "Tile Mean NDVI",
            value: areaData.ndviMean.toFixed(3),
            note: "Average vegetative greenness",
            valRgb: [16, 185, 129]
        },
        {
            label: "Low NDVI / Impervious",
            value: `${areaData.ndviLowPct.toFixed(1)}%`,
            note: "NDVI < 0.12 (Paved/Bare)"
        },
        {
            label: "Moderate Vegetation",
            value: `${areaData.ndviModPct.toFixed(1)}%`,
            note: "0.12 ≤ NDVI < 0.35"
        },
        {
            label: "High Canopy Coverage",
            value: `${areaData.ndviHighPct.toFixed(1)}%`,
            note: "NDVI ≥ 0.35 (Canopy)"
        }
    ]);

    // 5. Spatial Context & Structural Density
    y = drawSectionHeader(doc, y, "5. Spatial Context & Structural Density", "Neighborhood Analysis");
    y = drawMetricRow(doc, y, [
        {
            label: "Low Spatial Context",
            value: `${areaData.contextLowCount} structures`,
            note: "Benign terrain / density"
        },
        {
            label: "Moderate Context",
            value: `${areaData.contextModerateCount} structures`,
            note: "Intermediate indices"
        },
        {
            label: "High Spatial Context",
            value: `${areaData.contextHighCount} structures`,
            note: "Steep / high density / low base"
        },
        {
            label: "Isolated Structures",
            value: `${areaData.isolatedCount} structures`,
            note: "No neighbors within 50m"
        }
    ]);

    // 6. Governance Disclaimers
    y = drawSectionHeader(doc, y, "6. Data Notes & Limitations", "Official Governance Notice");
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.roundedRect(14, y, 182, 19, 1, 1, "FD");
    doc.setFillColor(2, 132, 199);
    doc.rect(14, y, 1.5, 19, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(71, 85, 105);

    const disclaimers = [
        "• Aggregated geospatial intelligence derived from airborne LiDAR point clouds and Sentinel-2 multispectral imagery.",
        "• Structure counts and footprint values are bounding-box estimates and are not cadastral boundaries or land titles.",
        "• Spatial Context is an indicative contextual index and is not an engineering, flood-risk, structural, zoning, or regulatory assessment.",
        "• Data is prepared under EPSG:2193 (NZTM2000) for municipal spatial intelligence and simulation purposes."
    ];

    let dy = y + 3.8;
    for (const d of disclaimers) {
        doc.text(d, 18, dy);
        dy += 3.8;
    }

    // Footer
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, 284, 196, 284);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text("3D Visual Mapping · New Zealand Digital Twin · Smart India Hackathon", 14, 288);
    doc.text("MUNICIPAL GEOSPATIAL AREA SUMMARY · CONFIDENTIAL & TECHNICAL USE", 105, 288, { align: "center" });
    doc.text(`Page 1 of 1 · Exported: ${dateStr}`, 196, 288, { align: "right" });

    doc.save("NZ_Tile_Geospatial_Area_Summary.pdf");
    return doc;
}
