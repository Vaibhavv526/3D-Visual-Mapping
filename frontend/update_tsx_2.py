import re

with open("src/components/NZDigitalTwin/NZDigitalTwin.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the specific block
# It looks like:
# <div className="nz-prop-item nz-prop-span2">
#     <span>Buildings</span>
#     <strong>56 LiDAR-derived footprints</strong>
# </div>

pattern = re.compile(r'<div className="nz-prop-item nz-prop-span2">\s*<span>Buildings</span>\s*<strong>56 LiDAR-derived footprints</strong>\s*</div>', re.MULTILINE)
content = pattern.sub(r'<div className="nz-prop-item">\n    <span>Buildings</span>\n    <strong>56 LiDAR-derived footprints</strong>\n</div>', content)


# Also ensure that totalBuildings is large.
content = content.replace('<strong>{data.totalBuildings}</strong>', '<strong className="nz-metric-large">{data.totalBuildings}</strong>')
# Ensure validIdentities is also large (it is currently "56").
# Wait, I already updated validIdentities in the first python script. 

with open("src/components/NZDigitalTwin/NZDigitalTwin.tsx", "w", encoding="utf-8") as f:
    f.write(content)
