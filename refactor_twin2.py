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

# Replace loops safely by matching exactly "let nearestIndex = 0;" to "nearestIndex = i;\n\n\n\n                }\n\n\n\n            }"
pattern = r"let nearestIndex = 0;[\s\S]*?nearestIndex = i;\s*\}\s*\}"
content = re.sub(pattern, "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;", content)

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

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("done safe twin refactor")
