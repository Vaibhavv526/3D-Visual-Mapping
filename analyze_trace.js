const fs = require('fs');

const data = JSON.parse(fs.readFileSync('trace_detailed.json', 'utf8'));
const events = data.traceEvents || data;

let fetchCount = 0;
let jsonParseCount = 0;
let geometryCount = 0;
let longestFrame = 0;
let updateMatrixWorldTime = 0;
let computeBoundingSphereTime = 0;
let bufferDataTime = 0;
let compileShaderTime = 0;
let mountDuration = 0;

for (const e of events) {
    if (e.name === 'ResourceSendRequest' && e.args?.data?.url?.includes('/api/nz/terrain')) {
        fetchCount++;
    }
    if (e.name === 'RunTask' || e.name === 'Task') {
        const dur = (e.dur || 0) / 1000;
        if (dur > longestFrame) {
            longestFrame = dur;
        }
    }
    
    // Check args.data.functionName for times or e.name
    if (e.ph === 'X' || e.ph === 'B' || e.ph === 'E') {
        const dur = (e.dur || 0) / 1000;
        const name = e.name;
        const fnName = e.args?.data?.functionName;
        
        if (name === 'updateMatrixWorld' || fnName === 'updateMatrixWorld') updateMatrixWorldTime += dur;
        if (name === 'computeBoundingSphere' || fnName === 'computeBoundingSphere') computeBoundingSphereTime += dur;
        if (name === 'bufferData' || fnName === 'bufferData' || name === 'WebGLRenderingContext.bufferData') bufferDataTime += dur;
        if (name === 'compileShader' || fnName === 'compileShader' || name === 'WebGLRenderingContext.compileShader') compileShaderTime += dur;
    }
}

let startMount = 0;
let endMount = 0;

for (const e of events) {
    if ((e.name === 'ConsoleTime' || e.name === 'v8.console' || e.name === 'EvaluateScript') && e.args?.data?.message?.includes('Initiating NZ Digital Twin load...')) {
        startMount = e.ts;
    }
    if ((e.name === 'ConsoleTime' || e.name === 'v8.console' || e.name === 'EvaluateScript') && e.args?.data?.message?.includes('All datasets received')) {
        endMount = e.ts;
    }
    
    if (e.name === 'ConsoleTime' || e.name === 'v8.console') {
        if (e.args?.data?.message?.includes('[PERF:API_TERRAIN]')) {
            jsonParseCount++;
        }
        if (e.args?.data?.message?.includes('[PERF:TERRAIN_GEO]')) {
            geometryCount++;
        }
    }
}

if (startMount && endMount) {
    mountDuration = (endMount - startMount) / 1000;
}

console.log('1. Terrain fetch count: ' + fetchCount);
console.log('2. Terrain geometry creation count: ' + geometryCount);
console.log('3. Terrain JSON parse count: ' + jsonParseCount);
console.log('4. Longest transition frame: ' + longestFrame.toFixed(2) + 'ms');
console.log('5. Main-thread time of the transition frame: ' + longestFrame.toFixed(2) + 'ms');
console.log('6. updateMatrixWorld duration: ' + updateMatrixWorldTime.toFixed(2) + 'ms');
console.log('7. boundingSphere calculation duration: ' + computeBoundingSphereTime.toFixed(2) + 'ms');
console.log('8. bufferData duration: ' + bufferDataTime.toFixed(2) + 'ms');
console.log('9. shader compilation duration: ' + compileShaderTime.toFixed(2) + 'ms');
console.log('12. Digital Twin mount duration: ' + mountDuration.toFixed(2) + 'ms');
