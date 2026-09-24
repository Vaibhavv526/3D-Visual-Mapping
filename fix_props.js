const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

// Add terrainIndex to destructuring
code = code.replace("onMeasureSelect\r\n\r\n\r\n\r\n}", "onMeasureSelect,\r\n\r\n\r\n\r\n    terrainIndex\r\n\r\n\r\n\r\n}");
code = code.replace("onMeasureSelect\n\n\n\n}", "onMeasureSelect,\n\n\n\n    terrainIndex\n\n\n\n}");

// Add terrainIndex to type
code = code.replace("onMeasureSelect?: (building: NZBuilding) => void;\r\n\r\n\r\n\r\n}", "onMeasureSelect?: (building: NZBuilding) => void;\r\n\r\n\r\n\r\n    terrainIndex: number;\r\n\r\n\r\n\r\n}");
code = code.replace("onMeasureSelect?: (building: NZBuilding) => void;\n\n\n\n}", "onMeasureSelect?: (building: NZBuilding) => void;\n\n\n\n    terrainIndex: number;\n\n\n\n}");

// Restore `const terrainVertices = terrain.vertices;` where we removed it incorrectly inside buildingMap and siteAnalysisMap!
// Wait! buildingMap and siteAnalysisMap used `terrainVertices` to compute something else as well?
// Error was: "src/components/NZDigitalTwin/NZDigitalTwin.tsx(22966,33): error TS2304: Cannot find name 'terrainVertices'."
// Let's just restore `const terrainVertices = terrain.vertices;` inside those components!
// We can just find `const cx = ...; const cy = ...;` in the file and put `const terrainVertices = terrain.vertices;` before it.
// Actually, `buildingMap` used `terrainVertices` for `nearestIndex` but that was REPLACED! Wait!
// Where is `terrainVertices` still being used in line 22966?
// Let's check line 22966.

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', code);
console.log('done fixing props');
