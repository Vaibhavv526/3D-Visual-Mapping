const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

// Fix the props type definition
const target = ") => void;\n\n\n\n}) {";
const replacement = ") => void;\n\n\n\n    terrainIndex: number;\n\n\n\n}) {";

if (code.includes(target)) {
    code = code.replace(target, replacement);
} else {
    // try different crlf
    code = code.replace(/\) => void;[\s\S]*?\}\) \{/, ") => void;\n    terrainIndex: number;\n}) {");
}

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', code);
console.log('done fixing type');
