import re

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 2. Area Panel Section Titles
content = content.replace('<div className="nz-prop-section-title">1. SURVEY SCOPE</div>', '<div className="nz-prop-section-title">01 &nbsp;&nbsp; SURVEY SCOPE</div>')
content = content.replace('<div className="nz-prop-section-title">2. PROPERTY IDENTITY (PROJECT-DEFINED)</div>', '<div className="nz-prop-section-title">02 &nbsp;&nbsp; PROPERTY IDENTITY</div>')
content = content.replace('<div className="nz-prop-section-title">3. BUILT ENVIRONMENT</div>', '<div className="nz-prop-section-title">03 &nbsp;&nbsp; BUILT ENVIRONMENT</div>')

# 3. Remove emerald class from metrics
content = re.sub(r'<strong className="nz-text-emerald">(\{idStats\.generatedPropertyIds\})</strong>', r'<strong>\1</strong>', content)
content = re.sub(r'<strong className="nz-text-emerald">(\{idStats\.generatedVerticalUnits\})</strong>', r'<strong>\1</strong>', content)

# 4. Fix items with notes to use nz-prop-full
content = re.sub(
    r'<div className="nz-prop-item">\s*<span>Identity Unavailable</span>\s*<strong>\{idStats\.unavailableIdentities\}</strong>\s*<div className="nz-prop-note">Unassociated / Vacant</div>\s*</div>',
    '<div className="nz-prop-item nz-prop-full">\n                        <span>Identity Unavailable</span>\n                        <strong>{idStats.unavailableIdentities}</strong>\n                        <div className="nz-prop-note">Unassociated / Vacant</div>\n                    </div>',
    content
)
content = re.sub(
    r'<div className="nz-prop-item">\s*<span>Tallest Structure</span>\s*<strong>\{data\.tallestHeight\.toFixed\(1\)\} m</strong>\s*<div className="nz-prop-note">\{data\.tallestBuildingId\}</div>\s*</div>',
    '<div className="nz-prop-item nz-prop-full">\n                        <span>Tallest Structure</span>\n                        <strong>{data.tallestHeight.toFixed(1)} m</strong>\n                        <div className="nz-prop-note">{data.tallestBuildingId}</div>\n                    </div>',
    content
)

# 5. Make LiDAR etc use muted instead of orange
content = content.replace('<span style={{ color: "var(--orange)" }}>LiDAR</span>', '<span style={{ color: "var(--text-muted)" }}>LiDAR</span>')
content = content.replace('<span style={{ color: "var(--orange)" }}>Terrain</span>', '<span style={{ color: "var(--text-muted)" }}>Terrain</span>')
content = content.replace('<span style={{ color: "var(--orange)" }}>Imagery</span>', '<span style={{ color: "var(--text-muted)" }}>Imagery</span>')
content = content.replace('<span style={{ color: "var(--orange)" }}>Cadastral</span>', '<span style={{ color: "var(--text-muted)" }}>Cadastral</span>')
content = content.replace('<span style={{ color: "var(--orange)" }}>Buildings</span>', '<span style={{ color: "var(--text-muted)" }}>Buildings</span>')


with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated NZDigitalTwin.tsx successfully!")
