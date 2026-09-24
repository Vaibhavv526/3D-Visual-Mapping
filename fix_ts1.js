const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/LandingPage/LandingPage.tsx', 'utf-8');

const targetStr = `      const centerY = window.innerHeight / 2;
      let closestIndex = -1;
      
      let minDistance = Infinity;
      textRefs.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const dist = Math.abs(elCenter - centerY);
        if (dist < minDistance) { minDistance = dist; closestIndex = index; }
      });`;

const replaceStr = `      let closestIndex = -1;
      let minDistance = Infinity;
      cachedMetrics.current.stepCenters.forEach((elCenter, index) => {
        if (elCenter === 0) return;
        const dist = Math.abs(elCenter - yCenter);
        if (dist < minDistance) { minDistance = dist; closestIndex = index; }
      });`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replaceStr);
} else {
    // try removing crlf differences
    code = code.replace(/const centerY = window\.innerHeight \/ 2;[\s\S]*?if \(dist < minDistance\) \{ minDistance = dist; closestIndex = index; \}\s*\}\);/, replaceStr);
}

// Remove the unused centerY I added on line 286
code = code.replace("const yCenter = window.scrollY + window.innerHeight / 2; const centerY = yCenter;", "const yCenter = window.scrollY + window.innerHeight / 2;");

fs.writeFileSync('frontend/src/components/LandingPage/LandingPage.tsx', code);
console.log('done');
