const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/LandingPage/LandingPage.tsx', 'utf-8');

code = code.replace("const points = [heroCenter, ...stepCenters];", 
"const points = [heroCenter, stepCenters[0], stepCenters[1], stepCenters[2], stepCenters[3], stepCenters[4]];");

fs.writeFileSync('frontend/src/components/LandingPage/LandingPage.tsx', code);
console.log('done alloc');
