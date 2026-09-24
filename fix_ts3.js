const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/LandingPage/LandingPage.tsx', 'utf-8');

code = code.replace("const dist = Math.abs(elCenter - yCenter);", "const dist = Math.abs(elCenter - (window.scrollY + window.innerHeight / 2));");

fs.writeFileSync('frontend/src/components/LandingPage/LandingPage.tsx', code);
console.log('done');
