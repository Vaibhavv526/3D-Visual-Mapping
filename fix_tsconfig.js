const fs = require('fs');

const path = 'frontend/tsconfig.app.json';
let tsconfig = JSON.parse(fs.readFileSync(path, 'utf-8'));
if (tsconfig.compilerOptions) {
    tsconfig.compilerOptions.noUnusedLocals = false;
    tsconfig.compilerOptions.noUnusedParameters = false;
}
fs.writeFileSync(path, JSON.stringify(tsconfig, null, 2));
console.log('done tsconfig');
