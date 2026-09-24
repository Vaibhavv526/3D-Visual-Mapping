const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

const targetStr = `            // Find nearest terrain vertex to building centre.



            // This gives us the local terrain elevation instead



            // of using the global terrain mean.



            let nearestIndex = 0;`;

const endIndexStr = `                    nearestIndex = i;



                }



            }`;

let startIdx = code.indexOf(targetStr);
if (startIdx !== -1) {
    let endIdx = code.indexOf(endIndexStr, startIdx);
    if (endIdx !== -1) {
        endIdx += endIndexStr.length;
        const replacement = "const nearestIndex = buildingTerrainIndices.get(building.id) ?? 0;";
        code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
    }
}

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', code);
console.log('done manual replace');
