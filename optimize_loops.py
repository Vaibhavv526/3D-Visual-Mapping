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

if 'const cameraBounds = useMemo' in content:
    idx = content.find('}, [terrainMeta, terrain]);') + len('}, [terrainMeta, terrain]);')
    content = content[:idx] + injection + content[idx:]
else:
    print("Could not find cameraBounds")

# Replace instances
pattern1 = r"""let nearestIndex = 0;\s*let nearestDistSq = Infinity;\s*for \(let i = 0; i < terrainVertices\.length; i\+\+\) \{\s*const dx = terrainVertices\[i\]\[0\] - cx;\s*const dy = terrainVertices\[i\]\[1\] - cy;\s*const distSq = dx \* dx \+ dy \* dy;\s*if \(distSq < nearestDistSq\) \{\s*nearestDistSq = distSq;\s*nearestIndex = i;\s*\}\s*\}"""
content = re.sub(pattern1, "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;", content)

pattern2 = r"""let nearestIndex = 0;\s*let nearestDistance = Infinity;\s*for \(let i = 0; i < terrainVertices\.length; i\+\+\) \{\s*const dx = terrainVertices\[i\]\[0\] - buildingCenterX;\s*const dy = terrainVertices\[i\]\[1\] - buildingCenterY;\s*const distance = dx \* dx \+ dy \* dy;\s*if \(distance < nearestDistance\) \{\s*nearestDistance = distance;\s*nearestIndex = i;\s*\}\s*\}"""
content = re.sub(pattern2, "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;", content)

pattern3 = r"""let nearestIndex = 0;\s*let nearestDistance = Infinity;\s*for \(\s*let i = 0;\s*i < terrainVertices\.length;\s*i\+\+\s*\) \{\s*const dx = terrainVertices\[i\]\[0\] - buildingCenterX;\s*const dy = terrainVertices\[i\]\[1\] - buildingCenterY;\s*const distance = dx \* dx \+ dy \* dy;\s*if \(distance < nearestDistance\) \{\s*nearestDistance = distance;\s*nearestIndex = i;\s*\}\s*\}"""
content = re.sub(pattern3, "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;", content)

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("done")
