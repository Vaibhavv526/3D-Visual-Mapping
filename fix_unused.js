const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

// I will just use string replacement on the exact blocks
const target1 = "const terrainVertices =\n\n\n\n                terrain.vertices;";
const target2 = "const terrainVertices =\r\n\r\n\r\n\r\n                terrain.vertices;";

code = code.replace(target1, "");
code = code.replace(target2, "");
code = code.replace(/const terrainVertices =[\s\S]*?terrain\.vertices;/g, "");

// For points
code = code.replace(/const points =[\s\S]*?building\.vertices;/g, "");

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', code);
console.log('done fixing unused properly');
