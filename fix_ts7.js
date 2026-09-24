const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

// For terrainVertices
const tVRegex = /const terrainVertices =\s*terrain\.vertices;/g;
code = code.replace(tVRegex, "/* const terrainVertices = terrain.vertices; */");

// For points (line 22832)
const pointsRegex = /const points =\s*building\.vertices;/g;
code = code.replace(pointsRegex, "/* const points = building.vertices; */");

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', code);
console.log('done fixing unused');
