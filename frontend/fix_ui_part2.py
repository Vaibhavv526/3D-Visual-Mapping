import sys
import re

filepath = 'c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

def replace_regex(pattern, replacement, name):
    global content
    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)
        print(f"Success: {name}")
    else:
        print(f"Failed to find: {name}")

# Review State Building Subheader 2
replace_regex(
    r'<div style=\{\{\s*display:\s*"flex",\s*justifyContent:\s*"space-between",\s*alignItems:\s*"center",\s*marginBottom:\s*"8px"\s*\}\}>.*?<span>Review State</span>',
    '<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>\n                                <span className="nz-sub-header" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>Review State</span>',
    'Review State Building Subheader 2'
)

# Review Notes Subheader
replace_regex(
    r'<div style=\{\{\s*fontSize:\s*"11px",\s*color:\s*"var\(--text-secondary\)",\s*marginBottom:\s*"4px",\s*display:\s*"flex",\s*justifyContent:\s*"space-between"\s*\}\}>.*?<span>Review Notes \(optional\)</span>',
    '<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>\n                                    <span className="nz-sub-header" style={{ marginTop: 0, borderTop: "none", paddingTop: 0, marginBottom: 0 }}>Review Notes (optional)</span>',
    'Review Notes Subheader'
)

# Review Card List
replace_regex(
    r'<div key=\{item\.id\} className="nz-prop-item nz-prop-full" style=\{\{\s*padding:\s*"6px",\s*backgroundColor:\s*"rgba\(0,0,0,0\.2\)",\s*border:\s*item\.status === "PRIORITY REVIEW" \? "1px solid rgba\(248, 113, 113, 0\.3\)" : "1px solid rgba\(251, 191, 36, 0\.3\)"\s*\}\}>.*?<div style=\{\{\s*display:\s*"flex",\s*justifyContent:\s*"space-between",\s*alignItems:\s*"center",\s*marginBottom:\s*"4px"\s*\}\}>.*?<strong style=\{\{\s*color:\s*item\.status === "PRIORITY REVIEW" \? "#f87171" : "#fbbf24"\s*\}\}>\{item\.status\}</strong>.*?<div style=\{\{\s*display:\s*"flex",\s*gap:\s*"8px",\s*alignItems:\s*"center"\s*\}\}>.*?<span style=\{\{\s*fontSize:\s*"11px",\s*color:\s*item\.reviewState === "REVIEWED" \? "#4ade80" : item\.reviewState === "IN REVIEW" \? "#fbbf24" : "var\(--text-secondary\)"\s*\}\}>\{item\.reviewState\}</span>.*?<button.*?className="nz-btn-link".*?onClick=\{.*?onFocusBuilding\(item\.building\).*?\}.*?Focus.*?<\/button>.*?<\/div>.*?<\/div>.*?<div style=\{\{\s*fontSize:\s*"12px",\s*color:\s*"#e2e8f0",\s*fontWeight:\s*600\s*\}\}>\{item\.id\}<\/div>.*?<div style=\{\{\s*fontSize:\s*"11px",\s*color:\s*"var\(--text-secondary\)"\s*\}\}>.*?\{item\.mlClass\} &middot; \{\(item\.deviation \* 100\)\.toFixed\(1\)\}% deviation.*?<\/div>.*?<\/div>',
    '''<div key={item.id} className={`nz-prop-item nz-prop-full nz-review-card ${item.status === "PRIORITY REVIEW" ? "priority" : "review"}`}>
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
                            </div>''',
    'Review Card Item'
)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
