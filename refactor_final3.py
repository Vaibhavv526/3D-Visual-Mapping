import re

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. buildingTerrainIndices
injection = """
    // OPTIMIZATION: Compute nearest terrain vertex index for each building ONCE.
    const buildingTerrainIndices = useMemo(() => {
        const map = new Map<string, number>();
        if (!terrain || !buildings) return map;
        const vertices = terrain.vertices;
        for (const building of buildings) {
            const cx = (building.bounds.min_x + building.bounds.max_x) / 2;
            const cy = (building.bounds.min_y + building.bounds.max_y) / 2;
            let nearestIndex = 0;
            let nearestDistSq = Infinity;
            for (let i = 0; i < vertices.length; i++) {
                const dx = vertices[i][0] - cx;
                const dy = vertices[i][1] - cy;
                const distSq = dx * dx + dy * dy;
                if (distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    nearestIndex = i;
                }
            }
            map.set(building.id, nearestIndex);
        }
        return map;
    }, [terrain, buildings]);
"""
cameraBoundsIdx = content.find('const cameraBounds = useMemo')
endOfCameraBounds = content.find('}, [terrainMeta, terrain]);', cameraBoundsIdx) + len('}, [terrainMeta, terrain]);')
content = content[:endOfCameraBounds] + '\n' + injection + '\n' + content[endOfCameraBounds:]

# 2. Fix Props for NZBuildingMesh
# Add `terrainIndex` to the destructured arguments
# Find `onMeasureSelect\n\n\n\n}: {` (might have more newlines)
content = re.sub(r"(onMeasureSelect\s*\}: \{)", r"onMeasureSelect,\n    terrainIndex\n}: {", content)

# Add `terrainIndex: number;` to the inline type
# Find `onMeasureSelect?: (\n        building: NZBuilding\n    ) => void;\n}) {`
content = re.sub(r"(\)\s*=>\s*void;\s*\}\)\s*\{)", r") => void;\n    terrainIndex: number;\n}) {", content)

# 3. Inject terrainIndex when instantiating NZBuildingMesh
content = re.sub(r"(<NZBuildingMesh\s*key=\{[^\}]+\}\s*building=\{[^\}]+\})", r"\1 terrainIndex={buildingTerrainIndices.get(building.id) ?? 0}", content)

# 4. Remove loops
def remove_loops(text):
    while True:
        start = text.find('let nearestIndex = 0;')
        if start == -1: break
        
        for_start = text.find('for (', start)
        open_bracket = text.find('{', for_start)
        count = 1
        idx = open_bracket + 1
        while count > 0 and idx < len(text):
            if text[idx] == '{': count += 1
            elif text[idx] == '}': count -= 1
            idx += 1
            
        if text.rfind('function NZBuildingMesh', 0, start) > text.rfind('function NZTerrainMesh', 0, start) and text.rfind('function NZBuildingMesh', 0, start) > text.rfind('export default function NZDigitalTwin', 0, start):
            replacement = "const nearestIndex = terrainIndex;"
        else:
            replacement = "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;"
            
        text = text[:start] + replacement + text[idx:]
    return text

content = remove_loops(content)

# 5. Fix unused variables
content = re.sub(r"const terrainVertices = terrain\.vertices;", "", content)
content = re.sub(r"const buildingCenterX =[\s\S]*?\/\ points\.length;", "", content)
content = re.sub(r"const buildingCenterY =[\s\S]*?\/\ points\.length;", "", content)
content = re.sub(r"const points = building\.vertices;\s*(const nearestIndex =)", r"\1", content)

# 6. Memory leaks
cleanupCode = """
    useEffect(() => {
        return () => {
            if (geometry) {
                geometry.dispose();
            }
        };
    }, [geometry]);
"""
startTerrain = content.find('function NZTerrainMesh')
returnIdx = content.find('return (', startTerrain)
if returnIdx != -1:
    content = content[:returnIdx] + cleanupCode + '\n    ' + content[returnIdx:]

startBuilding = content.find('function NZBuildingMesh')
returnIdxBuilding = content.find('return (', startBuilding)
if returnIdxBuilding != -1:
    content = content[:returnIdxBuilding] + cleanupCode + '\n    ' + content[returnIdxBuilding:]

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("done final perfect")
