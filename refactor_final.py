import re

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject buildingTerrainIndices in NZDigitalTwin
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

# 2. Add `terrainIndex` prop to NZBuildingMesh Props interface
# It's called `BuildingMeshProps`
props_match = re.search(r"interface BuildingMeshProps \{[\s\S]*?\}", content)
if props_match:
    props_str = props_match.group(0)
    new_props_str = props_str.replace("}", "    terrainIndex: number;\n}")
    content = content.replace(props_str, new_props_str)

# 3. Add `terrainIndex` to NZBuildingMesh parameters
func_match = re.search(r"function NZBuildingMesh\(\{[\s\S]*?\}\s*:\s*BuildingMeshProps\)\s*\{", content)
if func_match:
    func_str = func_match.group(0)
    new_func_str = func_str.replace("layer,", "layer,\n    terrainIndex,")
    content = content.replace(func_str, new_func_str)

# 4. Pass `terrainIndex` when rendering NZBuildingMesh
content = re.sub(r"(<NZBuildingMesh\s*key=\{[^\}]+\}\s*building=\{[^\}]+\})", r"\1 terrainIndex={buildingTerrainIndices.get(building.id) ?? 0}", content)

# 5. Remove loops!
def replace_loop(text, start_search, replacement):
    start = text.find(start_search)
    if start == -1: return text
    for_start = text.find('for (', start)
    open_bracket = text.find('{', for_start)
    count = 1
    idx = open_bracket + 1
    while count > 0 and idx < len(text):
        if text[idx] == '{': count += 1
        elif text[idx] == '}': count -= 1
        idx += 1
    return text[:start] + replacement + text[idx:]

# Loop 1 (in NZBuildingMesh)
# We replace it with `const nearestIndex = terrainIndex;`
content = replace_loop(content, "let nearestIndex = 0;", "const nearestIndex = terrainIndex;")

# Loop 2 (in buildingMap)
content = replace_loop(content, "let nearestIndex = 0;", "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;")

# Loop 3 (in siteAnalysisMap)
content = replace_loop(content, "let nearestIndex = 0;", "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;")

# 6. Fix unused variables
content = re.sub(r"const terrainVertices = terrain\.vertices;", "", content)
content = re.sub(r"const buildingCenterX =[\s\S]*?\/\ points\.length;", "", content)
content = re.sub(r"const buildingCenterY =[\s\S]*?\/\ points\.length;", "", content)
content = re.sub(r"const points = building\.vertices;\s*(const nearestIndex =)", r"\1", content)

# 7. Memory leak cleanup
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
print("done final refactor")
