import type { NZBuildingCadastralAssociation, NZBuilding } from "./nzApi";

export type IdentityStatus = "GENERATED" | "VALID" | "DUPLICATE" | "UNAVAILABLE";

export interface PropertyIdentityStatistics {
    totalBuildings: number;
    generatedPropertyIds: number;
    generatedVerticalUnits: number;
    validIdentities: number;
    duplicateIdentities: number;
    unavailableIdentities: number;
    duplicateVerticalUnitIds: number;
}

export function generatePropertyId3D(primaryParcelId: string | null | undefined, buildingId: string): string | null {
    if (!primaryParcelId) {
        return null;
    }
    return `3DP-${primaryParcelId}-${buildingId}`;
}

export function generateVerticalUnitId(propertyId3D: string | null | undefined, floorIndex: number): string | null {
    if (!propertyId3D) {
        return null;
    }
    const levelStr = String(floorIndex).padStart(2, "0");
    return `${propertyId3D}-L${levelStr}`;
}

export function validateIdentity(propertyId3D: string | null | undefined, primaryParcelId: string | null | undefined, buildingId: string): boolean {
    if (!propertyId3D || !primaryParcelId) {
        return false;
    }
    return propertyId3D === `3DP-${primaryParcelId}-${buildingId}`;
}

export function calculateIdentityStatistics(associations: NZBuildingCadastralAssociation[], buildings: NZBuilding[]): PropertyIdentityStatistics {
    let generatedPropertyIds = 0;
    let generatedVerticalUnits = 0;
    let validIdentities = 0;
    let duplicateIdentities = 0;
    let unavailableIdentities = 0;
    let duplicateVerticalUnitIds = 0;

    const seenIds = new Set<string>();

    for (const building of buildings) {
        const assoc = associations.find(a => a.building_id === building.id);
        const propId = generatePropertyId3D(assoc?.primary_parcel_id, building.id);

        if (!propId) {
            unavailableIdentities++;
            continue;
        }

        generatedPropertyIds++;

        if (seenIds.has(propId)) {
            duplicateIdentities++;
        } else {
            validIdentities++;
            seenIds.add(propId);
        }

        const vertStruct = assoc?.vertical_structure || building.vertical_structure;
        if (vertStruct && vertStruct.floors) {
            for (const floor of vertStruct.floors) {
                const vId = generateVerticalUnitId(propId, floor.floor_index);
                if (vId) {
                    generatedVerticalUnits++;
                    if (seenIds.has(vId)) {
                        duplicateVerticalUnitIds++;
                    } else {
                        seenIds.add(vId);
                    }
                }
            }
        }
    }

    return {
        totalBuildings: buildings.length,
        generatedPropertyIds,
        generatedVerticalUnits,
        validIdentities,
        duplicateIdentities,
        unavailableIdentities,
        duplicateVerticalUnitIds
    };
}

