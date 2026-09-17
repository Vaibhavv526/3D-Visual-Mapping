import re

path = r"c:\Users\igpat\Downloads\SIH\3D-Visual-Mapping\frontend\src\components\NZDigitalTwin\NZDigitalTwin.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

start_idx = content.find("    const handleFocusBuildingOnly = (b: NZBuilding) => {")
if start_idx != -1:
    end_idx = content.find("    };\n", start_idx)
    if end_idx != -1:
        content = content[:start_idx] + content[end_idx+7:]
        
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixes applied")
