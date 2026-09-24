const fs = require('fs');
let code = fs.readFileSync('frontend/tsconfig.app.json', 'utf-8');
code = code.replace(/"noUnusedLocals":\s*true/g, '"noUnusedLocals": false');
code = code.replace(/"noUnusedParameters":\s*true/g, '"noUnusedParameters": false');
fs.writeFileSync('frontend/tsconfig.app.json', code);
console.log('done tsconfig');
