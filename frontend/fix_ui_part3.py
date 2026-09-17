import sys
import re

filepath = 'c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Review State 2
content = content.replace(
    '<span>Review State</span>',
    '<span className="nz-sub-header" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>Review State</span>'
)

# 2. Review Notes
content = content.replace(
    '<span>Review Notes (optional)</span>',
    '<span className="nz-sub-header" style={{ marginTop: 0, borderTop: "none", paddingTop: 0, marginBottom: 0 }}>Review Notes (optional)</span>'
)

# 3. Review Cards
old_card_pattern = r'<div key=\{item\.id\} className="nz-prop-item nz-prop-full" style=\{\{ padding: "6px", backgroundColor: "rgba\(0,0,0,0\.2\)", border: item\.status === "PRIORITY REVIEW" \? "1px solid rgba\(248, 113, 113, 0\.3\)" : "1px solid rgba\(251, 191, 36, 0\.3\)" \}\}>.*?<div style=\{\{ fontSize: "11px", color: "var\(--text-secondary\)" \}\}>.*?\{item\.mlClass\} &middot; \{\(item\.deviation \* 100\)\.toFixed\(1\)\}% deviation.*?<\/div>.*?<\/div>'

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

content = re.sub(old_card_pattern, new_card, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully")
