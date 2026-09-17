import re

with open("src/components/NZDigitalTwin/NZDigitalTwin.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    '<div className="nz-prop-section-title">DATA SOURCES & PROVENANCE</div>',
    '<div className="nz-prop-section-title" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>DATA SOURCES & PROVENANCE</div>'
)

with open("src/components/NZDigitalTwin/NZDigitalTwin.tsx", "w", encoding="utf-8") as f:
    f.write(content)
