import { useMemo } from "react";
import type { NZBuilding, NZBuildingCadastralAssociation, NZBuildingMLSummary, ReviewRecord } from "../../services/nzApi";
import { computeBuildingScreening, validate3DProperty } from "../../services/nzApi";
import { generatePropertyId3D } from "../../services/propertyIdentity";
import { validateBuildingTopology } from "../../services/topologyValidation";
import { buildPropertyEvidence } from "../../services/evidence";
import { EvidenceLedger } from "./EvidenceLedger";
import { computeTemporalRecord } from "../../services/temporalChange";

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
            const temporalRecord = computeTemporalRecord(b, assoc);
            
            return {
                building: b,
                assoc,
                valRes,
                mlProfile,
                screening,
                rState,
                propIdForLevel,
                topologyResult,
                temporalRecord
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
        <div className="nz-review-queue-container">
            <div className="nz-section-subtitle">REVIEW PROGRESS</div>
            <div className="nz-progress-card">
                <div className="nz-progress-header">
                    <span>Reviewed / Total (Flagged)</span>
                    <strong>{flaggedReviewedCount} / {flaggedTotal}</strong>
                </div>
                <div className="nz-progress-track">
                    <div className="nz-progress-fill" style={{ width: `${progressPct}%` }}></div>
                </div>
            </div>

            <div className="nz-section-subtitle" style={{ marginTop: "24px" }}>QUEUE ({queueItems.length})</div>
            <div className="nz-queue-list">
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
                        <div key={b.id} className={`nz-queue-item nz-queue-${item.screening.status.replace(/\s+/g, '-').toLowerCase()}`}>
                            <div className="nz-queue-header">
                                <div className="nz-queue-meta">
                                    <strong className={`nz-queue-status nz-text-${item.screening.status === "PRIORITY REVIEW" ? "rose" : item.screening.status === "REVIEW" ? "amber" : "emerald"}`}>
                                        {item.screening.status}
                                    </strong>
                                    <div className="nz-queue-ids">
                                        Building: <span>{b.id}</span> &middot; LINZ Primary Parcel: <span>{primaryParcel}</span>
                                    </div>
                                    <div className="nz-queue-ids">
                                        3D Property ID: <span>{propertyId3D}</span>
                                    </div>
                                    {assoc?.is_multi_parcel && assoc.intersecting_parcels && (
                                        <div className="nz-queue-alert">
                                            Secondary/intersecting parcel: {assoc.intersecting_parcels.map(p => p.parcel_id).join(", ")}
                                        </div>
                                    )}
                                    <div className="nz-queue-ids">
                                        Temporal change: <span className={item.temporalRecord.comparisonStatus === "COMPARISON_UNAVAILABLE" ? "nz-text-slate" : (item.temporalRecord.comparisonStatus === "CHANGED" ? "nz-text-amber" : "nz-text-emerald")}>
                                            {item.temporalRecord.comparisonStatus === "COMPARISON_UNAVAILABLE" ? "Comparison unavailable" : (item.temporalRecord.comparisonStatus === "CHANGED" ? "Changed" : "Unchanged")}
                                        </span>
                                    </div>
                                </div>
                                <div className="nz-queue-badges">
                                    <span className={`nz-badge nz-badge-${item.rState.replace(/\s+/g, '-').toLowerCase()}`}>
                                        {item.rState}
                                    </span>
                                    <span className={`nz-badge nz-badge-${item.topologyResult.overall_status.toLowerCase()}`}>
                                        Topology: {item.topologyResult.overall_status}
                                    </span>
                                </div>
                            </div>

                            {isFlagged && explanation && (
                                <div className="nz-queue-explanation">
                                    <div className="nz-queue-expl-title">{item.mlProfile?.classification}</div>
                                    <div>Primary driver: <span>{topContributor}</span></div>
                                    <div>Secondary driver: <span>{secContributor}</span></div>
                                </div>
                            )}
                            {!isFlagged && (
                                <div className="nz-queue-explanation-empty">
                                    Typical property.
                                </div>
                            )}

                            <div className="nz-queue-actions">
                                <button onClick={() => onFocusBuildingOnly(b)} className="nz-btn-action nz-btn-primary">Focus in 3D</button>
                                <button onClick={() => onOpenBuilding(b)} className="nz-btn-action">Open Property</button>
                                {b.vertical_structure?.floors?.map(f => (
                                    <button 
                                        key={f.floor_index}
                                        onClick={() => onOpenVerticalUnit(b, f.floor_index)} 
                                        className="nz-btn-action" 
                                    >
                                        Open Level {f.floor_index}
                                    </button>
                                ))}
                            </div>

                            <div className="nz-queue-evidence-wrap">
                                <EvidenceLedger evidence={evidence} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
