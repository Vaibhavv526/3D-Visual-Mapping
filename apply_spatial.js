const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

const oldMemo = `    const buildingTerrainIndices = useMemo(() => {
        const map = new Map<string, number>();
        if (!terrain || !buildings) return map;
        const vertices = terrain.vertices;
        for (const building of buildings) {
            const cx = (building.bounds.min_x + building.bounds.max_x) / 2;
            const cy = (building.bounds.min_y + building.bounds.max_y) / 2;
            let nearestIndex = 0;
            let nearestDistSq = Infinity;
            for (let i = 0; i < vertices.length; i++) {
                const dx = vertices[i][0] - cx;
                const dy = vertices[i][1] - cy;
                const distSq = dx * dx + dy * dy;
                if (distSq < nearestDistSq) {
                    nearestDistSq = distSq;
                    nearestIndex = i;
                }
            }
            map.set(building.id, nearestIndex);
        }
        return map;
    }, [terrain, buildings]);`;

const newMemo = `    // OPTIMIZATION: Spatial Index lookup (O(1) per building instead of O(V)).
    const buildingTerrainIndices = useMemo(() => {
        const map = new Map<string, number>();
        if (!terrain || !buildings || !terrainMeta) return map;
        const { minX, minY } = terrainMeta;
        
        // The terrain is a uniform 481 x 721 grid with 2m spacing.
        const COLS = 481;
        const ROWS = 721;
        const STEP = 2;
        
        for (const building of buildings) {
            const cx = (building.bounds.min_x + building.bounds.max_x) / 2;
            const cy = (building.bounds.min_y + building.bounds.max_y) / 2;
            
            let col = Math.round((cx - minX) / STEP);
            let row = Math.round((cy - minY) / STEP);
            
            if (col < 0) col = 0;
            if (col >= COLS) col = COLS - 1;
            if (row < 0) row = 0;
            if (row >= ROWS) row = ROWS - 1;
            
            const index = row * COLS + col;
            map.set(building.id, index);
        }
        return map;
    }, [terrain, buildings, terrainMeta]);`;

if (code.includes(oldMemo)) {
    code = code.replace(oldMemo, newMemo);
    fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', code);
    console.log('done replacing memo directly');
} else {
    // try removing carriage returns
    const oldMemo2 = oldMemo.replace(/\r/g, '');
    if (code.replace(/\r/g, '').includes(oldMemo2)) {
        // Find start and end using split/join or substring
        const cleanCode = code.replace(/\r/g, '');
        const start = cleanCode.indexOf('    const buildingTerrainIndices = useMemo(() => {');
        const endStr = '    }, [terrain, buildings]);';
        const end = cleanCode.indexOf(endStr, start) + endStr.length;
        
        const actualStart = code.indexOf('    const buildingTerrainIndices = useMemo(() => {');
        // Find the matching end
        let searchIdx = actualStart;
        while(searchIdx < code.length) {
            const tempEnd = code.indexOf('    }, [terrain, buildings]);', searchIdx);
            if (tempEnd !== -1) {
                const actualEnd = tempEnd + '    }, [terrain, buildings]);'.length;
                code = code.substring(0, actualStart) + newMemo + code.substring(actualEnd);
                fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', code);
                console.log('done replacing memo fallback');
                break;
            }
            searchIdx++;
        }
    } else {
        console.log('could not find oldMemo');
    }
}
