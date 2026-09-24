const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

code = code.replace(/const points = building\.vertices;\s*const nearestIndex =/g, "const nearestIndex =");

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', code);
console.log('done points');
