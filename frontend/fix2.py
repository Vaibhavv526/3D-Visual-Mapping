import re

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

orig_grid = """                        <div className="nz-property-grid" style={{ marginBottom: 0 }}>
                            <div className="nz-prop-item">
                                <span>LINZ Parcel</span>
                                <strong style={{ color: "var(--orange)" }}>{cadastralAssoc.primary_parcel_id}</strong>
                            </div>
                            <div className="nz-prop-item" style={{ borderBottom: "none", paddingBottom: 0 }}>
                                <span>Building</span>
                                <strong style={{ color: "var(--orange)" }}>{building.id}</strong>
                            </div>
                        </div>"""

new_grid = """                        <div className="nz-prop-2col" style={{ marginBottom: 0 }}>
                            <div className="nz-prop-item">
                                <span style={{ textTransform: "uppercase" }}>LINZ Parcel</span>
                                <strong>{cadastralAssoc.primary_parcel_id}</strong>
                            </div>
                            <div className="nz-prop-item">
                                <span style={{ textTransform: "uppercase" }}>Building</span>
                                <strong>{building.id}</strong>
                            </div>
                        </div>"""

content = content.replace(orig_grid, new_grid)

orig_title = """                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#a3a3a3", letterSpacing: "0.08em", marginBottom: "8px", textTransform: "uppercase" }}>
                            3D PROPERTY IDENTITY
                        </div>"""
new_title = """                        <div className="nz-prop-section-title">
                            3D PROPERTY IDENTITY
                        </div>"""

content = content.replace(orig_title, new_title)


with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated!")
