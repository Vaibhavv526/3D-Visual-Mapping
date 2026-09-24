const fs = require('fs');
let code = fs.readFileSync('frontend/tsconfig.app.json', 'utf-8');
code = code.replace(/"noUnusedLocals":\s*false/g, '"noUnusedLocals": true');
code = code.replace(/"noUnusedParameters":\s*false/g, '"noUnusedParameters": true');
fs.writeFileSync('frontend/tsconfig.app.json', code);
console.log('reverted tsconfig');
