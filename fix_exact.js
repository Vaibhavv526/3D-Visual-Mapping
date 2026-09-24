const fs = require('fs');
const lines = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8').split('\n');

// Empty out line 5078 and 5079 and 5080 (where terrainVertices was)
lines[5077] = ''; // index 5077 is line 5078
lines[5078] = '';
lines[5079] = '';

// Same for line 22832 (where points was)
lines[22831] = '';
lines[22832] = '';
lines[22833] = '';
lines[22834] = '';

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', lines.join('\n'));
console.log('done fixing specifically');
