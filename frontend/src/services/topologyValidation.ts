import type { NZBuilding, NZBuildingCadastralAssociation } from "./nzApi";

export type TopologyStatus = "VALID" | "WARNING" | "ERROR" | "UNAVAILABLE";

export interface PropertyTopologyResult {
    building_id: string;
    property_id_3d: string | null;
    primary_parcel_id: string | null;
    cadastral_status: TopologyStatus;
    geometry_status: TopologyStatus;
    identity_status: TopologyStatus;
    vertical_status: TopologyStatus;
    overall_status: TopologyStatus;
    messages: string[];
}

export function validateBuildingTopology(
    building: NZBuilding,
    assoc: NZBuildingCadastralAssociation | undefined
): PropertyTopologyResult {
    const messages: string[] = [];
    let cadastral_status: TopologyStatus = "VALID";
    let geometry_status: TopologyStatus = "VALID";
    let identity_status: TopologyStatus = "VALID";
    let vertical_status: TopologyStatus = "VALID";

    const building_id = building.id;
    const property_id_3d = assoc?.property_id_3d || null;
    const primary_parcel_id = assoc?.primary_parcel_id || null;

    // Geometry Validation
    if (
        building.bounds &&
        building.bounds.max_x > building.bounds.min_x &&
        building.bounds.max_y > building.bounds.min_y
    ) {
        messages.push("Building footprint has valid geometry.");
    } else {
        geometry_status = "ERROR";
        messages.push("Building footprint has invalid geometry.");
    }

    // Cadastral Validation
    if (!assoc) {
        cadastral_status = "UNAVAILABLE";
        messages.push("Cadastral data is unavailable.");
        identity_status = "UNAVAILABLE";
        messages.push("Property identity is unavailable.");
    } else {
        if (assoc.association_type === "Unassociated" || assoc.identity_status === "Unassociated building") {
            cadastral_status = "UNAVAILABLE";
            messages.push("Building footprint is unassociated with any parcel.");
            if (property_id_3d) {
                identity_status = "ERROR";
                messages.push("Unassociated building has an unexpected property identity.");
            } else {
                identity_status = "UNAVAILABLE";
                messages.push("Property identity is unassociated.");
            }
        } else {
            if (primary_parcel_id) {
                messages.push("Building footprint has a valid spatial relationship with the primary LINZ parcel.");
                if (assoc.is_multi_parcel) {
                    messages.push("Building spans multiple parcels, relationship preserved.");
                }
            } else {
                cadastral_status = "WARNING";
                messages.push("Associated building lacks a primary parcel ID.");
            }
            
            if (property_id_3d) {
                const expectedFormat = `3DP-${primary_parcel_id}-${building_id}`;
                if (property_id_3d === expectedFormat) {
                    messages.push("Property identity is project-defined and follows the expected format.");
                } else if (property_id_3d.startsWith("3DP-")) {
                    identity_status = "WARNING";
                    messages.push(`Property identity uses 3DP prefix but deviates from expected strict format: ${expectedFormat}`);
                } else {
                    identity_status = "WARNING";
                    messages.push("Property identity format is unconventional.");
                }
            } else {
                identity_status = "ERROR";
                messages.push("Associated building is missing a 3D property identity.");
            }
        }
    }

    // Vertical Validation
    const vs = building.vertical_structure || assoc?.vertical_structure;
    if (!vs) {
        vertical_status = "UNAVAILABLE";
        if (!property_id_3d) {
            messages.push("Vertical structure is unavailable because no property identity exists.");
        } else {
            messages.push("Vertical structure is unavailable.");
        }
    } else {
        if (!property_id_3d) {
            vertical_status = "ERROR";
            messages.push("Vertical structure present but no property identity exists.");
        } else if (vs.property_id_3d !== property_id_3d) {
            vertical_status = "ERROR";
            messages.push("Vertical structure property ID mismatch.");
        } else {
            let seqValid = true;
            let elevationValid = true;
            let orderValid = true;
            let overlapValid = true;
            let idBelongsValid = true;
            
            if (vs.estimated_floor_height <= 0) {
                vertical_status = "ERROR";
                messages.push("Estimated floor height must be positive.");
            }

            for (let i = 0; i < vs.floors.length; i++) {
                const floor = vs.floors[i];
                if (floor.floor_index !== i) seqValid = false;
                
                const expectedL = `L${String(i + 1).padStart(2, "0")}`;
                if (floor.label !== expectedL) seqValid = false;

                if (isNaN(floor.base_elevation) || isNaN(floor.top_elevation)) elevationValid = false;
                if (floor.base_elevation >= floor.top_elevation) elevationValid = false;

                if (i > 0) {
                    const prevFloor = vs.floors[i - 1];
                    if (floor.base_elevation < prevFloor.base_elevation) orderValid = false;
                    if (floor.base_elevation < prevFloor.top_elevation - 0.01) overlapValid = false; 
                }

                if (floor.vertical_unit_id) {
                    const expectedVUnit = `${property_id_3d}-${expectedL}`;
                    if (floor.vertical_unit_id !== expectedVUnit) {
                        idBelongsValid = false;
                    }
                } else {
                    idBelongsValid = false;
                }
            }

            if (!seqValid) {
                vertical_status = "ERROR";
                messages.push("Vertical unit sequence has gaps or invalid labels.");
            } else {
                messages.push("Vertical unit sequence is continuous.");
            }

            if (!elevationValid) {
                vertical_status = "ERROR";
                messages.push("Invalid base or top elevations detected.");
            }
            if (!orderValid) {
                vertical_status = "ERROR";
                messages.push("Level ranges are not ordered upward.");
            }
            if (!overlapValid) {
                vertical_status = "ERROR";
                messages.push("Adjacent levels have impossible overlap.");
            }
            if (!idBelongsValid) {
                vertical_status = "ERROR";
                messages.push("Some vertical unit IDs do not belong to the 3D Property ID.");
            }

            const roofReach = Math.abs((vs.floors[vs.floors.length - 1]?.top_elevation || 0) - (vs.structural_roof_elevation || vs.roof_elevation));
            if (roofReach > vs.estimated_floor_height * 1.5) { 
                vertical_status = "WARNING";
                messages.push("Final level does not align with structural roof model.");
            }
        }
    }

    const statuses = [cadastral_status, geometry_status, identity_status, vertical_status];
    let overall_status: TopologyStatus = "VALID";
    if (statuses.includes("ERROR")) {
        overall_status = "ERROR";
    } else if (statuses.includes("WARNING")) {
        overall_status = "WARNING";
    } else if (statuses.every(s => s === "UNAVAILABLE")) {
        overall_status = "UNAVAILABLE";
    } else if (statuses.includes("UNAVAILABLE")) {
        // mixed state with valid
        const errorWarn = statuses.find(s => s === "ERROR" || s === "WARNING");
        overall_status = errorWarn ? errorWarn : "WARNING"; 
    }

    return {
        building_id,
        property_id_3d,
        primary_parcel_id,
        cadastral_status,
        geometry_status,
        identity_status,
        vertical_status,
        overall_status,
        messages
    };
}
