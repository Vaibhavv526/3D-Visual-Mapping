
const fs = require('fs');
const file = 'src/components/NZDigitalTwin/NZDigitalTwin.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('{slopeMax.toFixed(1)}</span>', '{slopeMax.toFixed(1)}°</span>');
content = content.replace('0 - {slopeMax.toFixed(1)}</span>', '0 - {slopeMax.toFixed(1)}°</span>');
fs.writeFileSync(file, content, 'utf8');

