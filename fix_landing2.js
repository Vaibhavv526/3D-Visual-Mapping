const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/LandingPage/LandingPage.tsx', 'utf-8');

content = content.replace("const centerY = window.innerHeight / 2;", "const centerY = window.scrollY + window.innerHeight / 2;");

// check handleScroll where yCenter is used
content = content.replace("const yCenter = window.scrollY + window.innerHeight / 2;", "const yCenter = window.scrollY + window.innerHeight / 2; const centerY = yCenter;");

fs.writeFileSync('frontend/src/components/LandingPage/LandingPage.tsx', content);
console.log('done');
