const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

const cleanupCode = `
    useEffect(() => {
        return () => {
            if (geometry) {
                geometry.dispose();
            }
        };
    }, [geometry]);
`;

// Insert for NZTerrainMesh
let startTerrain = code.indexOf('function NZTerrainMesh');
let returnIdx = code.indexOf('return (', startTerrain);
if (returnIdx !== -1) {
    code = code.substring(0, returnIdx) + cleanupCode + '\n    ' + code.substring(returnIdx);
}

// Insert for NZBuildingMesh
let startBuilding = code.indexOf('function NZBuildingMesh');
let returnIdxBuilding = code.indexOf('return (', startBuilding);
if (returnIdxBuilding !== -1) {
    code = code.substring(0, returnIdxBuilding) + cleanupCode + '\n    ' + code.substring(returnIdxBuilding);
}

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', code);
console.log('done');
