import re

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

injection = """
    // OPTIMIZATION: Compute nearest terrain vertex index for each building ONCE.
    // This avoids O(N*M) loop (250 * 350k = 87 million iterations) being run multiple times.
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

# There are 3 loops finding nearest terrain index.
# To be absolutely safe, we will find `let nearestIndex = 0;` and then count brackets to delete the loop.

def remove_loop(text):
    start = text.find('let nearestIndex = 0;')
    if start == -1: return text, False
    
    # find the start of the for loop
    for_start = text.find('for (', start)
    if for_start == -1: return text, False
    
    # find the open bracket of the for loop
    open_bracket = text.find('{', for_start)
    if open_bracket == -1: return text, False
    
    # find matching close bracket
    count = 1
    idx = open_bracket + 1
    while count > 0 and idx < len(text):
        if text[idx] == '{': count += 1
        elif text[idx] == '}': count -= 1
        idx += 1
        
    end_idx = idx
    
    # find let nearestDistance = Infinity; or let nearestDistSq = Infinity;
    # It should be between start and for_start
    
    replacement = "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;"
    new_text = text[:start] + replacement + text[end_idx:]
    return new_text, True

changed = True
while changed:
    # Do this only if 'terrainVertices.length' is in the loop to be sure
    # Actually `let nearestIndex = 0;` is very specific, but let's be careful.
    
    # check if 'terrainVertices.length' is near 'let nearestIndex = 0;'
    idx = content.find('let nearestIndex = 0;')
    if idx != -1 and content.find('terrainVertices.length', idx, idx+500) != -1:
        content, changed = remove_loop(content)
    else:
        # If there's another let nearestIndex = 0 that doesn't have terrainVertices.length near it, skip it and search next.
        # But for our case, they all do.
        # Wait, if we can't find it, we break.
        break

# Fix memory leaks
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

# fix unused variables
content = re.sub(r"const terrainVertices = terrain\.vertices;", "", content)
content = re.sub(r"const buildingCenterX =[\s\S]*?\/\ points\.length;", "", content)
content = re.sub(r"const buildingCenterY =[\s\S]*?\/\ points\.length;", "", content)
content = re.sub(r"const points = building\.vertices;\s*const nearestIndex =", "const nearestIndex =", content)

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("done safe twin refactor 3")
