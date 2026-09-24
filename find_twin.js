const fs = require('fs');
const content = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

const matches = [...content.matchAll(/const [a-zA-Z]+ = useMemo[\s\S]*?terrainVertices\[i\]\[0\] - (?:cx|buildingCenterX)/g)];
console.log(matches.length + " nearestIndex searches found");
