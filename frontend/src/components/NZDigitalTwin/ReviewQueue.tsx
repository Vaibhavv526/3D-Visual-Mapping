import { useMemo } from "react";
import type { NZBuilding, NZBuildingCadastralAssociation, NZBuildingMLSummary, ReviewRecord } from "../../services/nzApi";
import { computeBuildingScreening, validate3DProperty } from "../../services/nzApi";
import { generatePropertyId3D } from "../../services/propertyIdentity";
import { validateBuildingTopology } from "../../services/topologyValidation";
import { buildPropertyEvidence } from "../../services/evidence";
import { EvidenceLedger } from "./EvidenceLedger";

interface ReviewQueueProps {
    buildings: NZBuilding[];
    buildingAssociationMap?: Map<string, NZBuildingCadastralAssociation>;
    mlSummary?: NZBuildingMLSummary | null;
    reviewStore: Record<string, ReviewRecord>;
    parcelsAvailable: boolean;
    onFocusBuildingOnly: (building: NZBuilding) => void;
    onOpenBuilding: (building: NZBuilding) => void;
    onOpenVerticalUnit: (building: NZBuilding, floorIndex: number) => void;
}

export function ReviewQueuePanel({
    buildings,
    buildingAssociationMap,
    mlSummary,
    reviewStore,
    parcelsAvailable,
    onFocusBuildingOnly,
    onOpenBuilding,
    onOpenVerticalUnit
}: ReviewQueueProps) {
    const queueItems = useMemo(() => {
        // Build items
        const list = buildings.map(b => {
            const assoc = buildingAssociationMap?.get(b.id);
            const valRes = validate3DProperty(b, assoc, parcelsAvailable);
            const mlProfile = mlSummary?.profiles.find(p => p.building_id === b.id);
            const screening = computeBuildingScreening(valRes, mlProfile);
            const rState = reviewStore[b.id]?.review_state || "UNREVIEWED";
            const propIdForLevel = generatePropertyId3D(assoc?.primary_parcel_id, b.id);
            const topologyResult = validateBuildingTopology(b, assoc);
            
            return {
                building: b,
                assoc,
                valRes,
                mlProfile,
                screening,
                rState,
                propIdForLevel,
                topologyResult
            };
        });
        
        list.sort((a, b) => {
            const getPriority = (s: string) => {
                if (s === "PRIORITY REVIEW") return 1;
                if (s === "REVIEW") return 2;
                return 3;
            };
            const pa = getPriority(a.screening.status);
            const pb = getPriority(b.screening.status);
            if (pa !== pb) return pa - pb;
            
            const devA = a.mlProfile?.normalized_deviation || 0;
            const devB = b.mlProfile?.normalized_deviation || 0;
            return devB - devA;
        });
        
        return list;
    }, [buildings, buildingAssociationMap, parcelsAvailable, mlSummary, reviewStore]);

    const flaggedItems = queueItems.filter(item => item.screening.status !== "NORMAL");
    const flaggedReviewedCount = flaggedItems.filter(item => item.rState === "REVIEWED").length;
    const flaggedTotal = flaggedItems.length;
    const progressPct = flaggedTotal > 0 ? (flaggedReviewedCount / flaggedTotal) * 100 : 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "10px 0" }}>
            <div className="nz-prop-section-title">REVIEW PROGRESS</div>
            <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "6px", padding: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>Reviewed / Total (Flagged)</span>
                    <strong style={{ fontSize: "12px", color: "#f8fafc" }}>{flaggedReviewedCount} / {flaggedTotal}</strong>
                </div>
                <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progressPct}%`, background: "#38bdf8", transition: "width 0.3s ease" }}></div>
                </div>
            </div>

            <div className="nz-prop-section-title">QUEUE ({queueItems.length})</div>
            {queueItems.map(item => {
                const b = item.building;
                const assoc = item.assoc;
                const primaryParcel = assoc?.primary_parcel_id || "Unassociated";
                const propertyId3D = item.propIdForLevel || "Not applicable";
                
                const isFlagged = item.screening.status !== "NORMAL";
                const explanation = item.mlProfile?.explanation;
                
                const topContributor = explanation?.top_contributors?.[0] || "None";
                const secContributor = explanation?.top_contributors?.[1] || "None";
                
                const evidence = buildPropertyEvidence(item.building, null, item.assoc, item.topologyResult, item.mlProfile, reviewStore[b.id]);

                return (
                    <div key={b.id} style={{ 
                        background: "rgba(0,0,0,0.2)", 
                        borderRadius: "6px", 
                        padding: "12px", 
                        border: item.screening.status === "PRIORITY REVIEW" ? "1px solid rgba(248, 113, 113, 0.3)" : 
                                item.screening.status === "REVIEW" ? "1px solid rgba(251, 191, 36, 0.3)" : 
                                "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <strong style={{ 
                                    color: item.screening.status === "PRIORITY REVIEW" ? "#f87171" : 
                                           item.screening.status === "REVIEW" ? "#fbbf24" : "#4ade80",
                                    fontSize: "14px"
                                }}>{item.screening.status}</strong>
                                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                                    Building: <span style={{ color: "#e2e8f0" }}>{b.id}</span> &middot; LINZ Primary Parcel: <span style={{ color: "#e2e8f0" }}>{primaryParcel}</span>
                                </div>
                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                                    3D Property ID: <span style={{ color: "#e2e8f0" }}>{propertyId3D}</span>
                                </div>
                                {assoc?.is_multi_parcel && assoc.intersecting_parcels && (
                                    <div style={{ fontSize: "11px", color: "#f87171", marginTop: "2px" }}>
                                        Secondary/intersecting parcel: {assoc.intersecting_parcels.map(p => p.parcel_id).join(", ")}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                <span style={{ 
                                    fontSize: "11px", 
                                    padding: "2px 6px", 
                                    borderRadius: "4px",
                                    background: item.rState === "REVIEWED" ? "rgba(74, 222, 128, 0.1)" : item.rState === "IN REVIEW" ? "rgba(251, 191, 36, 0.1)" : "rgba(255, 255, 255, 0.1)",
                                    color: item.rState === "REVIEWED" ? "#4ade80" : item.rState === "IN REVIEW" ? "#fbbf24" : "#94a3b8",
                                    fontWeight: 600
                                }}>
                                    {item.rState}
                                </span>
                                <span style={{ fontSize: "11px", color: item.topologyResult.overall_status === "VALID" ? "#4ade80" : "#fbbf24" }}>
                                    Topology: {item.topologyResult.overall_status}
                                </span>
                            </div>
                        </div>

                        {isFlagged && explanation && (
                            <div style={{ background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "4px", fontSize: "11px", color: "#cbd5e1" }}>
                                <div style={{ fontWeight: 600, color: "#f8fafc", marginBottom: "4px" }}>{item.mlProfile?.classification}</div>
                                <div>Primary driver: <span style={{ color: "#38bdf8" }}>{topContributor}</span></div>
                                <div>Secondary driver: <span style={{ color: "#38bdf8" }}>{secContributor}</span></div>
                            </div>
                        )}
                        {!isFlagged && (
                            <div style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>
                                Typical property.
                            </div>
                        )}

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                            <button onClick={() => onFocusBuildingOnly(b)} className="nz-btn-link" style={{ fontSize: "11px", padding: "4px 8px", background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "4px", cursor: "pointer" }}>Focus in 3D</button>
                            <button onClick={() => onOpenBuilding(b)} className="nz-btn-link" style={{ fontSize: "11px", padding: "4px 8px", background: "rgba(255, 255, 255, 0.1)", color: "#e2e8f0", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "4px", cursor: "pointer" }}>Open Property</button>
                            {b.vertical_structure?.floors?.map(f => (
                                <button 
                                    key={f.floor_index}
                                    onClick={() => onOpenVerticalUnit(b, f.floor_index)} 
                                    className="nz-btn-link" 
                                    style={{ fontSize: "11px", padding: "4px 8px", background: "rgba(255, 255, 255, 0.1)", color: "#e2e8f0", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "4px", cursor: "pointer" }}
                                >
                                    Open Level {f.floor_index}
                                </button>
                            ))}
                        </div>

                        <div style={{ marginTop: "4px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px" }}>
                            <EvidenceLedger evidence={evidence} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
