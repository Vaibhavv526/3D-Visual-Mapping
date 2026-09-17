import re

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 3D PROPERTY IDENTITY block - Section Title
content = re.sub(
    r'<div style={{ fontSize: "11px", fontWeight: 600, color: "#a3a3a3", letterSpacing: "0.08em", marginBottom: "8px", textTransform: "uppercase" }}>\s*3D PROPERTY IDENTITY\s*</div>',
    '<div className="nz-prop-section-title">3D PROPERTY IDENTITY</div>',
    content
)

# 2. 3D PROPERTY IDENTITY block - Grid to 2col and labels
content = re.sub(
    r'<div className="nz-property-grid" style={{ marginBottom: 0 }}>\s*<div className="nz-prop-item">\s*<span>LINZ Parcel</span>\s*<strong style={{ color: "var\(--orange\)" }}>\{cadastralAssoc\.primary_parcel_id\}</strong>\s*</div>\s*<div className="nz-prop-item" style={{ borderBottom: "none", paddingBottom: 0 }}>\s*<span>Building</span>\s*<strong style={{ color: "var\(--orange\)" }}>\{building\.id\}</strong>\s*</div>\s*</div>',
    '<div className="nz-prop-2col" style={{ marginBottom: 0 }}>\n                            <div className="nz-prop-item">\n                                <span style={{ textTransform: "uppercase" }}>LINZ Parcel</span>\n                                <strong>{cadastralAssoc.primary_parcel_id}</strong>\n                            </div>\n                            <div className="nz-prop-item">\n                                <span style={{ textTransform: "uppercase" }}>Building</span>\n                                <strong>{building.id}</strong>\n                            </div>\n                        </div>',
    content
)

# 3. Area Panel Section Titles
content = content.replace('<div className="nz-prop-section-title">1. SURVEY SCOPE</div>', '<div className="nz-prop-section-title">01 &nbsp;&nbsp; SURVEY SCOPE</div>')
content = content.replace('<div className="nz-prop-section-title">2. PROPERTY IDENTITY (PROJECT-DEFINED)</div>', '<div className="nz-prop-section-title">02 &nbsp;&nbsp; PROPERTY IDENTITY</div>')
content = content.replace('<div className="nz-prop-section-title">3. BUILT ENVIRONMENT</div>', '<div className="nz-prop-section-title">03 &nbsp;&nbsp; BUILT ENVIRONMENT</div>')

# 4. Remove emerald class from metrics
content = re.sub(r'<strong className="nz-text-emerald">(\{.*?\})</strong>', r'<strong>\1</strong>', content)

# 5. Fix items with notes to use nz-prop-full
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

# 6. Make LiDAR etc use muted instead of orange
content = content.replace('<span style={{ color: "var(--orange)" }}>LiDAR</span>', '<span style={{ color: "var(--text-muted)" }}>LiDAR</span>')
content = content.replace('<span style={{ color: "var(--orange)" }}>Terrain</span>', '<span style={{ color: "var(--text-muted)" }}>Terrain</span>')
content = content.replace('<span style={{ color: "var(--orange)" }}>Imagery</span>', '<span style={{ color: "var(--text-muted)" }}>Imagery</span>')
content = content.replace('<span style={{ color: "var(--orange)" }}>Cadastral</span>', '<span style={{ color: "var(--text-muted)" }}>Cadastral</span>')
content = content.replace('<span style={{ color: "var(--orange)" }}>Buildings</span>', '<span style={{ color: "var(--text-muted)" }}>Buildings</span>')

# 7. Add scroll bodies
# Property Panel (main)
content = re.sub(
    r'(\{parcelsAvailable && cadastralAssoc\?\.property_id_3d && \()',
    r'            <div className="nz-property-scroll-body">\n            \1',
    content,
    count=1
)
content = re.sub(
    r'(\s*<div style={{ height: "24px" }} />\s*</div>\s*\)\s*;)',
    r'\n            </div>\1',
    content
)

# Vertical Exploration Panel
content = re.sub(
    r'(<div className="nz-back-building-wrap" style={{ marginBottom: "16px" }}>)',
    r'<div className="nz-property-scroll-body">\n                \1',
    content,
    count=1
)
content = re.sub(
    r'(<div className="nz-disclaimer">\s*Vertical Unit IDs.*?\s*</div>\s*</>\s*)\s*(}\)\s*</div>\s*\)\s*;)',
    r'\1                </div>\n            \2',
    content
)

# Parcel Inspector
# Look for the kicker, header and then add it
content = re.sub(
    r'(<div className="nz-kicker">CADASTRAL PARCEL INSPECTOR</div>.*?<div className="nz-property-header".*?>\s*<h3>.*?</h3>.*?</div>)',
    r'\1\n\n            <div className="nz-property-scroll-body">',
    content,
    flags=re.DOTALL | re.MULTILINE
)
content = re.sub(
    r'(<div className="nz-disclaimer" style={{ marginTop: "10px" }}>.*?</div>\s*)(</div>\s*\)\s*;)',
    r'\1            </div>\n        \2',
    content,
    flags=re.DOTALL
)

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated NZDigitalTwin.tsx")
