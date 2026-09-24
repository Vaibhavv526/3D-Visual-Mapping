const fs = require('fs');

async function validate() {
    try {
        const resTerrain = await fetch('http://localhost:8000/api/nz/terrain');
        const terrain = await resTerrain.json();
        const vertices = terrain.vertices;
        
        const resBuildings = await fetch('http://localhost:8000/api/nz/buildings');
        const buildingsResp = await resBuildings.json();
        
        // Let's print out what buildings is
        console.log("BuildingsResp type:", typeof buildingsResp);
        console.log("Keys if object:", Object.keys(buildingsResp));
        
        let buildings = buildingsResp;
        if (!Array.isArray(buildings) && buildings.buildings) {
            buildings = buildings.buildings;
        } else if (!Array.isArray(buildings) && buildings.features) {
            buildings = buildings.features;
        }
        
        console.log("Found buildings:", buildings.length);
        
        // Find bounds from terrain
        let minX = Infinity, minY = Infinity;
        for (let i = 0; i < vertices.length; i++) {
            if (vertices[i][0] < minX) minX = vertices[i][0];
            if (vertices[i][1] < minY) minY = vertices[i][1];
        }
        
        const cols = 481;
        const rows = 721;
        const step = 2; // derived from 1774720 to 1774722
        
        let matchCount = 0;
        let mismatchCount = 0;
        
        for (let b = 0; b < buildings.length; b++) {
            const building = buildings[b];
            
            // cx, cy as used in the frontend
            const cx = (building.bounds.min_x + building.bounds.max_x) / 2;
            const cy = (building.bounds.min_y + building.bounds.max_y) / 2;
            
            // 1. Brute-force
            let bruteIndex = 0;
            let nearestDistSq = Infinity;
            for (let i = 0; i < vertices.length; i++) {
                const dx = vertices[i][0] - cx;
                const dy = vertices[i][1] - cy;
                const distSq = dx * dx + dy * dy;
                if (distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    bruteIndex = i;
                }
            }
            
            // 2. O(1) Grid Index
            let col = Math.round((cx - minX) / step);
            let row = Math.round((cy - minY) / step);
            
            // Clamp just in case
            if (col < 0) col = 0;
            if (col >= cols) col = cols - 1;
            if (row < 0) row = 0;
            if (row >= rows) row = rows - 1;
            
            const gridIndex = row * cols + col;
            
            if (bruteIndex === gridIndex) {
                matchCount++;
            } else {
                // If it mismatches, check distance difference
                const bfDist = Math.pow(vertices[bruteIndex][0] - cx, 2) + Math.pow(vertices[bruteIndex][1] - cy, 2);
                const gdDist = Math.pow(vertices[gridIndex][0] - cx, 2) + Math.pow(vertices[gridIndex][1] - cy, 2);
                
                if (Math.abs(bfDist - gdDist) < 1e-6) {
                    // Tie-breaker difference (e.g. exactly between two vertices).
                    matchCount++;
                } else {
                    mismatchCount++;
                    console.log(`Mismatch building ${building.id}: Brute=${bruteIndex} Grid=${gridIndex} | cx=${cx} cy=${cy}`);
                }
            }
        }
        
        console.log(`Validation Complete. Checked ${buildings.length} buildings.`);
        console.log(`Matches: ${matchCount}`);
        console.log(`Mismatches: ${mismatchCount}`);
        
    } catch(e) {
        console.error(e);
    }
}
validate();
