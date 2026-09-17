import sys

filepath = 'c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

def replace(old_str, new_str, name):
    global content
    if old_str in content:
        content = content.replace(old_str, new_str)
        print(f"Success: {name}")
    else:
        print(f"Failed to find: {name}")

# Fix 3: Sub-headers
replace(
    '<span style={{ fontSize: "10px", color: "rgba(255,255,255,0.38)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Review State</span>',
    '<span className="nz-sub-header" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>Review State</span>',
    'Review State List Subheader'
)
replace(
    '<div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Automated Screening</div>',
    '<div className="nz-sub-header" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>Automated Screening</div>',
    'Automated Screening Subheader'
)
replace(
    '<div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "4px" }}>Why Flagged</div>',
    '<div className="nz-sub-header">Why Flagged</div>',
    'Why Flagged Subheader'
)
replace(
    '<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>\n                                <span>Review State</span>',
    '<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>\n                                <span className="nz-sub-header" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>Review State</span>',
    'Review State Building Subheader 2'
)
replace(
    '<div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "flex", justifyContent: "space-between" }}>\n                                    <span>Review Notes (optional)</span>',
    '<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>\n                                    <span className="nz-sub-header" style={{ marginTop: 0, borderTop: "none", paddingTop: 0, marginBottom: 0 }}>Review Notes (optional)</span>',
    'Review Notes Subheader'
)

# Wait, let's fix the Review Tags for the individual building
replace(
    '<strong style={{ color: screeningResult.status === "PRIORITY REVIEW" ? "#f87171" : "#fbbf24", fontSize: "13px" }}>',
    '<strong className={`nz-review-tag ${screeningResult.status === "PRIORITY REVIEW" ? "priority" : "review"}`}>',
    'Human Review Tag'
)

replace(
    '<strong style={{ color: (reviewStore[building.id]?.review_state || "UNREVIEWED") === "REVIEWED" ? "#4ade80" : (reviewStore[building.id]?.review_state || "UNREVIEWED") === "IN REVIEW" ? "#fbbf24" : "var(--text-secondary)" }}>',
    '<strong className={`nz-review-tag ${(reviewStore[building.id]?.review_state || "UNREVIEWED") === "REVIEWED" ? "reviewed" : (reviewStore[building.id]?.review_state || "UNREVIEWED") === "IN REVIEW" ? "in-review" : "unreviewed"}`}>',
    'Review State Tag'
)


# Fix 2 & 5: Review card list items
old_card = '''<div key={item.id} className="nz-prop-item nz-prop-full" style={{ padding: "6px", backgroundColor: "rgba(0,0,0,0.2)", border: item.status === "PRIORITY REVIEW" ? "1px solid rgba(248, 113, 113, 0.3)" : "1px solid rgba(251, 191, 36, 0.3)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                    <strong style={{ color: item.status === "PRIORITY REVIEW" ? "#f87171" : "#fbbf24" }}>{item.status}</strong>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                        <span style={{ fontSize: "11px", color: item.reviewState === "REVIEWED" ? "#4ade80" : item.reviewState === "IN REVIEW" ? "#fbbf24" : "var(--text-secondary)" }}>{item.reviewState}</span>
                                        <button 
                                            className="nz-btn-link"
                                            onClick={() => onFocusBuilding(item.building)}
                                            style={{ background: "none", border: "none", color: "var(--orange)", cursor: "pointer", fontSize: "11px", padding: 0 }}
                                        >
                                            Focus
                                        </button>
                                    </div>
                                </div>
                                <div style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: 600 }}>{item.id}</div>
                                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                                    {item.mlClass} &middot; {(item.deviation * 100).toFixed(1)}% deviation
                                </div>
                            </div>'''

new_card = '''<div key={item.id} className={`nz-prop-item nz-prop-full nz-review-card ${item.status === "PRIORITY REVIEW" ? "priority" : "review"}`}>
                                <div className="nz-review-card-header">
                                    <strong className={`nz-review-tag ${item.status === "PRIORITY REVIEW" ? "priority" : "review"}`}>{item.status}</strong>
                                    <div className="nz-review-card-actions">
                                        <span className={`nz-review-tag ${item.reviewState === "REVIEWED" ? "reviewed" : item.reviewState === "IN REVIEW" ? "in-review" : "unreviewed"}`}>{item.reviewState}</span>
                                        <button 
                                            className="nz-btn-link"
                                            onClick={() => onFocusBuilding(item.building)}
                                            style={{ background: "rgba(249, 115, 22, 0.15)", border: "1px solid rgba(249, 115, 22, 0.3)", borderRadius: "4px", color: "var(--orange)", cursor: "pointer", fontSize: "10px", fontWeight: 700, padding: "3px 8px" }}
                                        >
                                            Focus
                                        </button>
                                    </div>
                                </div>
                                <div style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: 600 }}>{item.id}</div>
                                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                                    {item.mlClass} &middot; {(item.deviation * 100).toFixed(1)}% deviation
                                </div>
                            </div>'''

replace(old_card, new_card, "Review Card Item")


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
