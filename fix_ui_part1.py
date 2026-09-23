import re

with open('frontend/src/components/LandingPage/LandingPage.tsx', 'r') as f:
    code = f.read()

code = re.sub(
    r"<div style=\{reducedMotion \? \{\} : \{ position: 'sticky', top: 0, minHeight: '100vh', overflow: 'hidden', zIndex: 0 \}\}>",
    "<div style={reducedMotion ? {} : { position: 'sticky', top: 0, minHeight: '100vh', zIndex: 0 }}>",
    code
)

code = re.sub(
    r"<div style=\{reducedMotion \? \{\} : \{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden', zIndex: 0 \}\}>",
    "<div style={reducedMotion ? {} : { position: 'sticky', top: 0, minHeight: '100vh', zIndex: 0 }}>",
    code
)
code = re.sub(
    r"<div style=\{reducedMotion \? \{\} : \{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', zIndex: 0 \}\}>",
    "<div style={reducedMotion ? {} : { position: 'sticky', top: 0, minHeight: '100vh', zIndex: 0 }}>",
    code
)

code = re.sub(
    r"style=\{\{ position: 'relative', opacity: 0, pointerEvents: 'none' \}\}",
    "style={{ position: 'relative', opacity: 0, pointerEvents: 'none' }}",
    code
)
code = re.sub(
    r"style=\{\{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' \}\}",
    "style={{ position: 'relative', opacity: 0, pointerEvents: 'none' }}",
    code
)

code = re.sub(
    r"className=\"map-section\" style=\{\{ minHeight: '100vh', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' \}\}",
    "className=\"map-section\" style={{ minHeight: '100vh', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}",
    code
)
code = re.sub(
    r"className=\"map-section\" style=\{\{ height: '100vh', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' \}\}",
    "className=\"map-section\" style={{ minHeight: '100vh', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}",
    code
)

with open('frontend/src/components/LandingPage/LandingPage.tsx', 'w') as f:
    f.write(code)
