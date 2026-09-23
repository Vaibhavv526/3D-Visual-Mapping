const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/LandingPage/LandingPage.tsx', 'utf8');

// Revert overflow Y
code = code.replace(
  "overflowY: 'auto', overflowX: 'hidden'",
  "overflow: 'hidden'"
);

// Change sticky wrapper height: '100vh' to minHeight: '100vh'
code = code.replace(
  "height: '100vh', overflow: 'hidden', zIndex: 0",
  "minHeight: '100vh', overflow: 'hidden', zIndex: 0"
);

// Change mapWrapperRef position from absolute to relative
code = code.replace(
  "style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }}",
  "style={{ position: 'relative', opacity: 0, pointerEvents: 'none' }}"
);

// Change map-section height: '100vh' to minHeight: '100vh'
code = code.replace(
  "className=\"map-section\" style={{ height: '100vh', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}",
  "className=\"map-section\" style={{ minHeight: '100vh', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}"
);

fs.writeFileSync('frontend/src/components/LandingPage/LandingPage.tsx', code);
