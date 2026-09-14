import type { PropertyEvidence } from '../../services/evidence';

export function EvidenceLedger({ evidence }: { evidence: PropertyEvidence | null }) {
    if (!evidence || !evidence.items || evidence.items.length === 0) return null;

    const getSourceTypeColor = (type: string) => {
        switch (type) {
            case "SOURCE": return "#4ade80";
            case "DERIVED": return "#38bdf8";
            case "ESTIMATED": return "#a78bfa";
            case "AUTOMATED": return "#f472b6";
            case "HUMAN_REVIEW": return "#fbbf24";
            default: return "#94a3b8";
        }
    };
    const getSourceTypeLabel = (type: string) => {
        switch (type) {
            case "SOURCE": return "Source data";
            case "DERIVED": return "Derived data";
            case "ESTIMATED": return "Estimated data";
            case "AUTOMATED": return "Automated analysis";
            case "HUMAN_REVIEW": return "Human review";
            default: return type;
        }
    };

    return (
        <div style={{ marginBottom: "20px" }}>
            <div className="nz-prop-section-title">PROPERTY EVIDENCE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {evidence.items.map((item, idx) => (
                    <div key={idx} style={{ background: "rgba(15, 23, 42, 0.4)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)", padding: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8" }}>{item.category}</span>
                            </div>
                            <div style={{ 
                                fontSize: "9px", 
                                fontWeight: 700, 
                                padding: "2px 6px", 
                                borderRadius: "4px", 
                                color: getSourceTypeColor(item.source_type),
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid ${getSourceTypeColor(item.source_type)}40"
                            }}>
                                {getSourceTypeLabel(item.source_type)}
                            </div>
                        </div>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "6px" }}>
                            <div>
                                <div style={{ fontSize: "9px", color: "#64748b" }}>Value</div>
                                <div style={{ fontSize: "12px", color: "#f8fafc", fontWeight: 600 }}>{item.value}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: "9px", color: "#64748b" }}>Source</div>
                                <div style={{ fontSize: "11px", color: "#e2e8f0" }}>{item.source}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: "9px", color: "#64748b" }}>Method</div>
                                <div style={{ fontSize: "11px", color: "#cbd5e1" }}>{item.method}</div>
                            </div>
                        </div>
                        {item.disclaimer && (
                            <div style={{ marginTop: "8px", fontSize: "10px", color: "#94a3b8", fontStyle: "italic", borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: "6px" }}>
                                {item.disclaimer}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
