import re

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the 3 occurrences of `let nearestIndex = 0; ... }` with the lookup.
# Since the code is formatted with lots of newlines, we'll find `let nearestIndex = 0;` and its matching `}`.
# BUT we won't inject buildingTerrainIndices until AFTER we've removed the old ones, so we don't accidentally remove the new one!

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
            
        # determine replacement based on whether it's in NZBuildingMesh or not.
        # Actually, in NZBuildingMesh we want `terrainIndex`, elsewhere `buildingTerrainIndices.get(building.id) ?? 0`
        # But how to know? We can just use `buildingTerrainIndices.get(building.id) ?? 0` everywhere if `building` is available.
        # Wait, in NZBuildingMesh `building` IS available! `building.id` is available!
        # So we can just use `buildingTerrainIndices.get(building.id) ?? 0` in NZBuildingMesh TOO, if we pass `buildingTerrainIndices` down as a prop, or we just pass `terrainIndex`.
        # Let's pass `terrainIndex`.
        # To distinguish, if we are inside `function NZBuildingMesh`, we use `terrainIndex`.
        # `start` position tells us.
        
        if text.rfind('function NZBuildingMesh', 0, start) > text.rfind('function NZTerrainMesh', 0, start) and text.rfind('function NZBuildingMesh', 0, start) > text.rfind('export default function NZDigitalTwin', 0, start):
            replacement = "const nearestIndex = terrainIndex;"
        else:
            replacement = "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;"
            
        text = text[:start] + replacement + text[idx:]
    return text

content = remove_loops(content)

# Now inject `buildingTerrainIndices`
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

# Fix Props for NZBuildingMesh
content = re.sub(r"onMeasureSelect\?: \(building: NZBuilding\) => void;\s*\}", r"onMeasureSelect?: (building: NZBuilding) => void;\n    terrainIndex: number;\n}", content)
content = re.sub(r"onMeasureSelect\s*\}", r"onMeasureSelect,\n    terrainIndex\n}", content)

# Inject terrainIndex when instantiating NZBuildingMesh
content = re.sub(r"(<NZBuildingMesh\s*key=\{[^\}]+\}\s*building=\{[^\}]+\})", r"\1 terrainIndex={buildingTerrainIndices.get(building.id) ?? 0}", content)

# Fix unused variables (the ones removed that throw TS errors)
content = re.sub(r"const terrainVertices = terrain\.vertices;", "", content)
content = re.sub(r"const buildingCenterX =[\s\S]*?\/\ points\.length;", "", content)
content = re.sub(r"const buildingCenterY =[\s\S]*?\/\ points\.length;", "", content)
content = re.sub(r"const points = building\.vertices;\s*(const nearestIndex =)", r"\1", content)

# Memory leaks
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
