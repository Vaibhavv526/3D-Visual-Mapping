
import os
import re

file_path = "components/NZDigitalTwin/NZDigitalTwin.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I will replace nz-stats, nz-legend, nz-footer-info blocks with the new nz-hud block

hud_jsx = """
            {/* BOTTOM HUD */}
            <div className="nz-hud">
                <div className="nz-hud-crs">EPSG:2193 &middot; NZTM2000</div>
                
                <div className="nz-hud-item">
                    <span className="nz-hud-label">ELEVATION RANGE</span>
                    <span className="nz-hud-value">{elevationMin.toFixed(1)} &ndash; {elevationMax.toFixed(1)} m</span>
                </div>
                
                <div className="nz-hud-item">
                    <span className="nz-hud-label">MAX SLOPE</span>
                    <span className="nz-hud-value accent">{slopeMax.toFixed(1)}&deg;</span>
                </div>
                
                <div className="nz-hud-item">
                    <span className="nz-hud-label">BUILDINGS</span>
                    <span className="nz-hud-value">{buildings.length}</span>
                </div>
                
                <div className="nz-hud-item">
                    <span className="nz-hud-label">TERRAIN POINTS</span>
                    <span className="nz-hud-value">{(terrain?.vertex_count ?? 0).toLocaleString()}</span>
                </div>
            </div>
"""

# Find and remove nz-stats block
content = re.sub(r"\{\/\* TOP RIGHT \*\/.*?<\/div>\s*\{\/\* LEFT LAYER PANEL \*\/", "{/* LEFT LAYER PANEL */", content, flags=re.DOTALL)

# Find and remove nz-legend block
content = re.sub(r"\{\/\* BOTTOM LEFT \*\/.*?<\/div>\s*\{\/\* PROPERTY INTELLIGENCE", "{/* PROPERTY INTELLIGENCE", content, flags=re.DOTALL)

# Find and replace nz-footer-info with hud_jsx
content = re.sub(r"<div className=\"nz-footer-info\">.*?<\/div>", hud_jsx, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

