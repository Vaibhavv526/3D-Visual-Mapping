const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

// The remaining loop is probably inside NZBuildingMesh.
const regex = /let nearestIndex = 0;[\s\S]*?i < terrainVertices\.length;[\s\S]*?nearestIndex = i;[\s\S]*?\}[\s\S]*?\}/;
code = code.replace(regex, "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;");

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', code);
console.log('done');
