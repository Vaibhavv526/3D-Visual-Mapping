import type { NZBuilding, NZBuildingCadastralAssociation, NZBuildingMLProfile, ReviewRecord, NZParcel } from "./nzApi";
import type { PropertyTopologyResult } from "./topologyValidation";

export type SourceType = "SOURCE" | "DERIVED" | "ESTIMATED" | "AUTOMATED" | "HUMAN_REVIEW";

export interface EvidenceItem {
    category: string;
    label: string;
    value: string;
    source_type: SourceType;
    source: string;
    method: string;
    status: string;
    disclaimer?: string;
}

export interface PropertyEvidence {
    building_id: string | null;
    parcel_id: string | null;
    items: EvidenceItem[];
}

export function buildPropertyEvidence(
    building: NZBuilding | null,
    parcel: NZParcel | null,
    cadastralAssoc: NZBuildingCadastralAssociation | null | undefined,
    topology: PropertyTopologyResult | null,
    mlProfile: NZBuildingMLProfile | null | undefined,
    review: ReviewRecord | null | undefined
): PropertyEvidence {
    const items: EvidenceItem[] = [];

    // A. CADASTRAL
    if (parcel) {
        items.push({
            category: "CADASTRAL",
            label: "LINZ Primary Parcels",
            value: parcel.parcel_id,
            source_type: "SOURCE",
            source: "LINZ Primary Parcels",
            method: "Layer 50772",
            status: "Available",
            disclaimer: "Parcel geometry is sourced from LINZ Primary Parcels."
        });
    } else if (cadastralAssoc?.primary_parcel_id) {
        let val = cadastralAssoc.primary_parcel_id;
        if (cadastralAssoc.is_multi_parcel && cadastralAssoc.intersecting_parcels) {
            val += " + " + cadastralAssoc.intersecting_parcels.filter(p => p.parcel_id !== cadastralAssoc.primary_parcel_id).map(p => p.parcel_id).join(", ");
        }
        items.push({
            category: "CADASTRAL",
            label: "LINZ Primary Parcels",
            value: val,
            source_type: "DERIVED",
            source: "LINZ Primary Parcels",
            method: cadastralAssoc.association_type || "Derived association",
            status: "Available",
            disclaimer: "Parcel geometry is sourced from LINZ Primary Parcels."
        });
    } else {
        items.push({
            category: "CADASTRAL",
            label: "LINZ Primary Parcels",
            value: "No associated LINZ parcel",
            source_type: "SOURCE",
            source: "LINZ Primary Parcels",
            method: "Not applicable",
            status: "Unavailable",
            disclaimer: "Parcel geometry is sourced from LINZ Primary Parcels."
        });
    }

    // B. BUILDING GEOMETRY
    if (building) {
        items.push({
            category: "BUILDING",
            label: "NZ LiDAR",
            value: building.id,
            source_type: "SOURCE",
            source: "NZ LiDAR-derived building geometry",
            method: "Source geometry",
            status: "Available",
            disclaimer: "Building geometry is derived from the available LiDAR dataset."
        });
    } else {
        items.push({
            category: "BUILDING",
            label: "NZ LiDAR",
            value: "No associated LiDAR building",
            source_type: "SOURCE",
            source: "NZ LiDAR-derived building geometry",
            method: "Not applicable",
            status: "Unavailable",
            disclaimer: "Building geometry is derived from the available LiDAR dataset."
        });
    }

    // D. VERTICAL STRUCTURE
    if (building?.vertical_structure) {
        items.push({
            category: "VERTICAL",
            label: "Estimated",
            value: `${building.vertical_structure?.floors?.length ?? 1} levels`,
            source_type: "ESTIMATED",
            source: "LiDAR-derived terrain/building elevations",
            method: "LiDAR structural model",
            status: "Available",
            disclaimer: "Vertical levels are estimated from the LiDAR structural model and are not architectural floor plans."
        });
    } else {
        items.push({
            category: "VERTICAL",
            label: "Estimated",
            value: "Not applicable",
            source_type: "ESTIMATED",
            source: "LiDAR-derived terrain/building elevations",
            method: "Not applicable",
            status: "Unavailable"
        });
    }

    // E. 3D PROPERTY IDENTITY
    const propId = cadastralAssoc?.property_id_3d || building?.vertical_structure?.property_id_3d;
    if (propId) {
        items.push({
            category: "IDENTITY",
            label: "Project Identity",
            value: propId,
            source_type: "DERIVED",
            source: "LINZ parcel identity + LiDAR building identity",
            method: "Project-defined deterministic rule",
            status: "Available",
            disclaimer: "3D Property IDs are project-defined identifiers and are not official ULPINs."
        });
    } else {
        items.push({
            category: "IDENTITY",
            label: "Project Identity",
            value: "Not applicable",
            source_type: "DERIVED",
            source: "LINZ parcel identity + LiDAR building identity",
            method: "Not applicable",
            status: "Unavailable"
        });
    }

    // F. TOPOLOGY
    if (topology) {
        items.push({
            category: "TOPOLOGY",
            label: "Automated",
            value: topology.overall_status,
            source_type: "AUTOMATED",
            source: "Geometry, Vertical, Identity, Cadastral",
            method: "Internal 3D checks",
            status: topology.overall_status,
            disclaimer: "Topology results represent internal project validation checks and are not legal cadastral validation."
        });
    } else {
        items.push({
            category: "TOPOLOGY",
            label: "Automated",
            value: "Not applicable",
            source_type: "AUTOMATED",
            source: "Geometry, Vertical, Identity, Cadastral",
            method: "Not applicable",
            status: "Unavailable"
        });
    }

    // G. ML
    if (mlProfile) {
        items.push({
            category: "ML",
            label: "Automated",
            value: mlProfile.classification,
            source_type: "AUTOMATED",
            source: "Mahalanobis structural anomaly screening",
            method: "Mahalanobis screening",
            status: mlProfile.classification,
            disclaimer: "ML screening identifies structural patterns relative to the available dataset and does not establish error, safety, legality, or regulatory compliance."
        });
    } else {
        items.push({
            category: "ML",
            label: "Automated",
            value: "Not applicable",
            source_type: "AUTOMATED",
            source: "Mahalanobis structural anomaly screening",
            method: "Not applicable",
            status: "Unavailable"
        });
    }

    // H. HUMAN REVIEW
    if (review) {
        items.push({
            category: "HUMAN REVIEW",
            label: "Human decision",
            value: review.review_state,
            source_type: "HUMAN_REVIEW",
            source: "Persistent review backend",
            method: "Human decision",
            status: review.review_state
        });
    } else if (building) {
        items.push({
            category: "HUMAN REVIEW",
            label: "Human decision",
            value: "UNREVIEWED",
            source_type: "HUMAN_REVIEW",
            source: "Persistent review backend",
            method: "Human decision",
            status: "UNREVIEWED"
        });
    } else {
        items.push({
            category: "HUMAN REVIEW",
            label: "Human decision",
            value: "Not applicable",
            source_type: "HUMAN_REVIEW",
            source: "Persistent review backend",
            method: "Not applicable",
            status: "Unavailable"
        });
    }

    // I. TEMPORAL INTELLIGENCE
    if (building) {
        items.push({
            category: "TEMPORAL",
            label: "Current Observation",
            value: "Current available observation",
            source_type: "SOURCE",
            source: "Active LiDAR dataset",
            method: "Current dataset",
            status: "Available",
            disclaimer: "Only one LiDAR observation is currently available in the dataset."
        });
        
        items.push({
            category: "TEMPORAL",
            label: "Historical Comparison",
            value: "COMPARISON UNAVAILABLE",
            source_type: "DERIVED",
            source: "No historical dataset",
            method: "Change detection",
            status: "Unavailable",
            disclaimer: "Historical comparison unavailable because only one LiDAR observation is currently available."
        });
    } else {
        items.push({
            category: "TEMPORAL",
            label: "Historical Comparison",
            value: "Not applicable",
            source_type: "DERIVED",
            source: "No historical dataset",
            method: "Not applicable",
            status: "Unavailable"
        });
    }

    return {
        building_id: building?.id || null,
        parcel_id: parcel?.parcel_id || cadastralAssoc?.primary_parcel_id || null,
        items
    };
}
