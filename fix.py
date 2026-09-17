import re

path = r"c:\Users\igpat\Downloads\SIH\3D-Visual-Mapping\frontend\src\components\NZDigitalTwin\NZDigitalTwin.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove from AreaIntelligencePanelProps
content = re.sub(r"    // Phase 16 additions\n    parcelsData: NZParcelsData \| null;\n    onFocusBuildingOnly: \(building: NZBuilding\) => void;\n    onOpenBuilding: \(building: NZBuilding\) => void;\n    onOpenVerticalUnit: \(building: NZBuilding, floorIndex: number\) => void;\n", "", content)

# 2. Remove from AreaIntelligencePanel signature
content = re.sub(r"    parcelsData,\n    onFocusBuildingOnly,\n    onOpenBuilding,\n    onOpenVerticalUnit\n}: AreaIntelligencePanelProps\) {", r"    parcelsData\n}: AreaIntelligencePanelProps) {", content)

# 3. Remove from <AreaIntelligencePanel ... />
content = re.sub(r"                    onFocusBuildingOnly={handleFocusBuildingOnly}\n                    onOpenBuilding={handleSelectBuilding}\n                    onOpenVerticalUnit={handleOpenVerticalUnit}\n", "", content)

# 4. Fix setRegFilter
content = re.sub(r"    const \[regFilter, setRegFilter\] = useState", r"    const [regFilter] = useState", content)

# 5. Fix parcelsAvailable in registryRecords
content = re.sub(r"const res = validate3DProperty\(b, assoc, !!parcelsAvailable\);", r"const res = validate3DProperty(b, assoc, !!(parcelsData?.available));", content)
content = re.sub(r"\[buildings, parcelsData, buildingAssociationMap, mlSummary, reviewStore, parcelsAvailable\]\);", r"[buildings, parcelsData, buildingAssociationMap, mlSummary, reviewStore]);", content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixes applied")
