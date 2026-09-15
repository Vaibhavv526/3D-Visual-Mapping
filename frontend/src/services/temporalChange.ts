export type TemporalComparisonStatus = "UNCHANGED" | "CHANGED" | "COMPARISON_UNAVAILABLE";

export interface TemporalMetric {
    current: number | string | null;
    reference: number | string | null;
    absoluteDelta: number | null;
    percentageChange: number | null;
}

export interface TemporalPropertyRecord {
    buildingId: string;
    propertyId3d: string | null;
    parcelId: string | null;
    
    currentObservationLabel: string;
    referenceObservationLabel: string | null;
    
    comparisonStatus: TemporalComparisonStatus;
    
    metrics: {
        height: TemporalMetric;
        structuralRoofElevation: TemporalMetric;
        groundElevation: TemporalMetric;
        footprintArea: TemporalMetric;
        footprintWidth: TemporalMetric;
        footprintDepth: TemporalMetric;
        estimatedFloorCount: TemporalMetric;
        verticalUnitCount: TemporalMetric;
    };
    
    topologyStatusChange: "NO_CHANGE" | "CHANGED" | "UNAVAILABLE";
    cadastralRelationshipChange: "NO_CHANGE" | "CHANGED" | "UNAVAILABLE";
}

import type { NZBuilding, NZBuildingCadastralAssociation } from "./nzApi";

export function computeTemporalRecord(
    building: NZBuilding, 
    cadastralAssoc: NZBuildingCadastralAssociation | null | undefined, 
    datasetMetadata: any = null
): TemporalPropertyRecord {
    // In Phase 23, we only have one observation. 
    // We treat the current dataset as the current observation.
    
    const currentObsLabel = datasetMetadata?.acquisitionDate || "Current available observation";
    
    const vs = building.vertical_structure;
    const baseFloor = vs?.floors && vs.floors.length > 0 ? vs.floors[0] : null;
    
    const currentHeight = building.height ?? null;
    const currentStructRoof = building.structural_roof_elevation ?? vs?.structural_roof_elevation ?? null;
    const currentGround = building.ground_elevation ?? null;
    
    const currentArea = baseFloor?.footprint_area ?? null;
    const currentWidth = baseFloor?.footprint_width ?? null;
    const currentDepth = baseFloor?.footprint_depth ?? null;
    
    const currentFloors = vs?.estimated_floor_count ?? null;
    
    // Vertical unit count
    let verticalUnits = 0;
    if (vs?.floors) {
        verticalUnits = vs.floors.filter(f => f.vertical_unit_id).length;
    }

    const createUnavailableMetric = (currentValue: number | string | null): TemporalMetric => ({
        current: currentValue,
        reference: null,
        absoluteDelta: null,
        percentageChange: null
    });

    return {
        buildingId: building.id,
        propertyId3d: cadastralAssoc?.property_id_3d ?? null,
        parcelId: cadastralAssoc?.primary_parcel_id ?? null,
        
        currentObservationLabel: currentObsLabel,
        referenceObservationLabel: null, // No historical data available
        
        comparisonStatus: "COMPARISON_UNAVAILABLE",
        
        metrics: {
            height: createUnavailableMetric(currentHeight),
            structuralRoofElevation: createUnavailableMetric(currentStructRoof),
            groundElevation: createUnavailableMetric(currentGround),
            footprintArea: createUnavailableMetric(currentArea),
            footprintWidth: createUnavailableMetric(currentWidth),
            footprintDepth: createUnavailableMetric(currentDepth),
            estimatedFloorCount: createUnavailableMetric(currentFloors),
            verticalUnitCount: createUnavailableMetric(verticalUnits)
        },
        
        topologyStatusChange: "UNAVAILABLE",
        cadastralRelationshipChange: "UNAVAILABLE"
    };
}

export interface TemporalAreaSummary {
    currentObservations: number;
    historicalObservations: number;
    comparableProperties: number;
    changeDetection: "AVAILABLE" | "UNAVAILABLE";
}

export function computeTemporalAreaSummary(buildings: any[]): TemporalAreaSummary {
    return {
        currentObservations: buildings.length,
        historicalObservations: 0,
        comparableProperties: 0,
        changeDetection: "UNAVAILABLE"
    };
}
