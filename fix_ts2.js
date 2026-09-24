const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

code = code.replace(/const terrainVertices = terrain\.vertices;/g, "");
code = code.replace(/const buildingCenterX =[\s\S]*?\/\ points\.length;/g, "");
code = code.replace(/const buildingCenterY =[\s\S]*?\/\ points\.length;/g, "");

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', code);
console.log('done');
