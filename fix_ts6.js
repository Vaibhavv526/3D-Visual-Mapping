const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

const startIdx = code.indexOf('let nearestDistance = Infinity;');
const endIdx = code.indexOf('nearestIndex = i;', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const finalEndIdx = code.indexOf('}', endIdx) + 1;
    const finalFinalEndIdx = code.indexOf('}', finalEndIdx) + 1;
    const finalFinalFinalEndIdx = code.indexOf('}', finalFinalEndIdx) + 1;
    
    // Actually, let's just delete the block since we already have nearestIndex = buildingTerrainIndices.get... before it!
    // Wait, let's see what is before `let nearestDistance = Infinity;`
    // I'll just use a regex to nuke the corrupted loop.
    code = code.substring(0, startIdx) + code.substring(finalFinalFinalEndIdx);
}

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', code);
console.log('done fixing loop corpse');
