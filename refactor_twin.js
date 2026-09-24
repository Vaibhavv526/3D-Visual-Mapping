const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

// 1. Inject buildingTerrainIndices
const injection = `
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
`;

const cameraBoundsIdx = content.indexOf('const cameraBounds = useMemo');
const endOfCameraBounds = content.indexOf('}, [terrainMeta, terrain]);', cameraBoundsIdx) + '}, [terrainMeta, terrain]);'.length;
content = content.substring(0, endOfCameraBounds) + '\n' + injection + '\n' + content.substring(endOfCameraBounds);

// 2. Fix O(N*M) loops safely
// There are three identical loops finding nearest terrain index.
// I will just replace the inner code block using AST-like replacements or strictly exact regex.

const loop1 = /let nearestIndex = 0;\s*let nearestDistSq = Infinity;\s*for \(let i = 0; i < terrainVertices\.length; i\+\+\) \{\s*const dx = terrainVertices\[i\]\[0\] - cx;\s*const dy = terrainVertices\[i\]\[1\] - cy;\s*const distSq = dx \* dx \+ dy \* dy;\s*if \(distSq < nearestDistSq\) \{\s*nearestDistSq = distSq;\s*nearestIndex = i;\s*\}\s*\}/g;

const loop2 = /let nearestIndex = 0;\s*let nearestDistance = Infinity;\s*for \(\s*let i = 0;\s*i < terrainVertices\.length;\s*i\+\+\s*\) \{\s*const dx =\s*terrainVertices\[i\]\[0\] -\s*buildingCenterX;\s*const dy =\s*terrainVertices\[i\]\[1\] -\s*buildingCenterY;\s*const distance = dx \* dx \+ dy \* dy;\s*if \(distance < nearestDistance\) \{\s*nearestDistance = distance;\s*nearestIndex = i;\s*\}\s*\}/g;

content = content.replace(loop1, "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;");
content = content.replace(loop2, "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;");

// 3. Fix unused variable errors that arise from removing the loop
content = content.replace(/const terrainVertices = terrain\.vertices;/g, "");
content = content.replace(/const buildingCenterX =[\s\S]*?\/\ points\.length;/g, "");
content = content.replace(/const buildingCenterY =[\s\S]*?\/\ points\.length;/g, "");

// 4. Fix memory leaks in NZTerrainMesh and NZBuildingMesh
const cleanupCode = `
    useEffect(() => {
        return () => {
            if (geometry) {
                geometry.dispose();
            }
        };
    }, [geometry]);
`;

let startTerrain = content.indexOf('function NZTerrainMesh');
let returnIdx = content.indexOf('return (', startTerrain);
if (returnIdx !== -1) {
    content = content.substring(0, returnIdx) + cleanupCode + '\n    ' + content.substring(returnIdx);
}

let startBuilding = content.indexOf('function NZBuildingMesh');
let returnIdxBuilding = content.indexOf('return (', startBuilding);
if (returnIdxBuilding !== -1) {
    content = content.substring(0, returnIdxBuilding) + cleanupCode + '\n    ' + content.substring(returnIdxBuilding);
}

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', content);
console.log('done safe twin refactor');
