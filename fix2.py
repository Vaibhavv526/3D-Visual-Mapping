import re

path = r"c:\Users\igpat\Downloads\SIH\3D-Visual-Mapping\frontend\src\components\NZDigitalTwin\NZDigitalTwin.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove parcelsData from AreaIntelligencePanel
content = re.sub(r"    reviewStore,\n    parcelsData\n}: AreaIntelligencePanelProps\) {", r"    reviewStore\n}: AreaIntelligencePanelProps) {", content)

# 2. Remove parcelsData={parcelsData} from AreaIntelligencePanel JSX
content = re.sub(r"                    reviewStore=\{reviewStore\}\n                    parcelsData=\{parcelsData\}\n                />", r"                    reviewStore={reviewStore}\n                />", content)

# 3. Handle handleFocusBuildingOnly
content = re.sub(r"    const handleFocusBuildingOnly = \(building: NZBuilding\) => \{\n        setIsDossierOpen\(false\);\n        setMeasureMode\(false\);\n        setExplorationMode\(\"building\"\);\n        setSelectedVerticalLevel\(null\);\n        setIsExploded\(true\);\n        handleSelectBuilding\(building\);\n    \};\n", "", content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixes applied")
