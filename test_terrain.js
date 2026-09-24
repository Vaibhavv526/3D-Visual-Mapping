const fs = require('fs');

async function test() {
    try {
        const res = await fetch('http://localhost:8000/api/nz/terrain');
        const terrain = await res.json();
        const vertices = terrain.vertices;
        console.log("Vertices length:", vertices.length);
        
        // Find bounds
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < vertices.length; i++) {
            if (vertices[i][0] < minX) minX = vertices[i][0];
            if (vertices[i][0] > maxX) maxX = vertices[i][0];
            if (vertices[i][1] < minY) minY = vertices[i][1];
            if (vertices[i][1] > maxY) maxY = vertices[i][1];
        }
        console.log(`Bounds: X:[${minX}, ${maxX}], Y:[${minY}, ${maxY}]`);
        
        // Check grid layout. Look at first 10 vertices
        for(let i=0; i<10; i++) {
            console.log(`v[${i}] = [${vertices[i][0]}, ${vertices[i][1]}]`);
        }
        
        // Try to find columns/rows
        let firstRowY = vertices[0][1];
        let colCount = 0;
        for (let i = 0; i < vertices.length; i++) {
            if (vertices[i][1] !== firstRowY) {
                colCount = i;
                break;
            }
        }
        console.log(`Deduced colCount (same Y): ${colCount}`);
        
        let firstColX = vertices[0][0];
        let rowCount = 0;
        for (let i = 0; i < vertices.length; i++) {
            if (vertices[i][0] !== firstColX) {
                rowCount = i;
                break;
            }
        }
        console.log(`Deduced rowCount (same X): ${rowCount}`);
        
        // Let's test checking grid dimensions dynamically
        // Since X changes every vertex, it's row-major (varying X first).
        const expectedCols = rowCount; // Wait, if X changes every time, it means rowCount=1 (X changes immediately).
        
    } catch(e) {
        console.error(e);
    }
}
test();
