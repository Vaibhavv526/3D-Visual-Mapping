import type { PropertyEvidence } from '../../services/evidence';

export function EvidenceLedger({ evidence }: { evidence: PropertyEvidence | null }) {
    if (!evidence || !evidence.items || evidence.items.length === 0) return null;

    const getSourceTypeColor = (type: string) => {
        switch (type) {
            case "SOURCE": return "#4ade80";
            case "DERIVED": return "#f97316";
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
        <details className="nz-accordion" open>
            <summary className="nz-accordion-header">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="nz-accordion-title">PROPERTY EVIDENCE</span>
                </div>
                <svg className="nz-accordion-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </summary>
            <div className="nz-accordion-content" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {evidence.items.map((item, idx) => (
                    <div key={idx} style={{ 
                        borderBottom: idx !== evidence.items.length - 1 ? "1px solid var(--border-subtle)" : "none",
                        paddingBottom: idx !== evidence.items.length - 1 ? "12px" : "0",
                        marginBottom: idx !== evidence.items.length - 1 ? "12px" : "0"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 500, color: "#8a8a8a", letterSpacing: "0.08em", textTransform: "uppercase" }}>{item.category}</span>
                            <div style={{ 
                                fontSize: "8.5px",
                                fontWeight: 600,
                                padding: "1px 4px",
                                borderRadius: "3px", 
                                color: getSourceTypeColor(item.source_type),
                                background: "rgba(255,255,255,0.05)",
                                border: `1px solid ${getSourceTypeColor(item.source_type)}40`,
                                letterSpacing: "0.06em",
                                whiteSpace: "nowrap"
                            }}>
                                {getSourceTypeLabel(item.source_type)}
                            </div>
                        </div>
                        
                        <div className="nz-property-grid" style={{ marginBottom: "0" }}>
                            <div className="nz-prop-item nz-prop-evidence">
                                <span>Value</span>
                                <strong>{item.value}</strong>
                            </div>
                            <div className="nz-prop-item nz-prop-evidence">
                                <span>Source</span>
                                <strong>{item.source}</strong>
                            </div>
                            <div className="nz-prop-item nz-prop-evidence" style={{ borderBottom: item.disclaimer ? "1px solid var(--border-subtle)" : "none" }}>
                                <span>Method</span>
                                <strong>{item.method}</strong>
                            </div>
                        </div>
                        {item.disclaimer && (
                            <div style={{ marginTop: "6px", fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", lineHeight: "1.4" }}>
                                {item.disclaimer}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </details>
    );
}



