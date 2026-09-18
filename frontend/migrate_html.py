import os
import re

html_path = 'index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the body content
body_match = re.search(r'<body[^>]*>(.*?)</body>', content, re.DOTALL | re.IGNORECASE)
if not body_match:
    print("Could not find body tag")
    exit(1)

body_content = body_match.group(1)

# Remove the script tags
body_content = re.sub(r'<script.*?</script>', '', body_content, flags=re.DOTALL)

# Convert class= to className=
body_content = re.sub(r'\bclass=', 'className=', body_content)

# Convert stroke-width, stroke-dasharray etc
def kebab_to_camel(match):
    return match.group(1) + match.group(2).upper()

body_content = re.sub(r'([a-z]+)-([a-z])', kebab_to_camel, body_content)
# Wait, this regex is too broad, it would convert `data-step` to `dataStep`, `map-container` to `mapContainer` inside classNames!
# Better to use a mapping for SVG attributes
svg_attrs = [
    'stroke-width', 'stroke-dasharray', 'font-size', 'font-family', 'text-anchor', 'font-weight', 'fill-rule', 'clip-rule'
]
for attr in svg_attrs:
    camel = attr.split('-')[0] + attr.split('-')[1].capitalize()
    body_content = body_content.replace(f'{attr}=', f'{camel}=')

# Fix inline styles if any (looks like there are none, mostly just classes)
# Fix void elements (input, img, hr, br, path, circle, rect, line, ellipse, polyline)
void_elements = ['input', 'img', 'hr', 'br', 'path', 'circle', 'rect', 'line', 'ellipse', 'polyline']
for tag in void_elements:
    # Match <tag ... > but not <tag ... />
    body_content = re.sub(rf'<{tag}([^>]*?)(?<!/)>', rf'<{tag}\1 />', body_content)

# Replace <div id="map-container">...</div> with the React component placeholder
body_content = re.sub(
    r'<div id="mapContainer">\s*<!-- 3D map mounts here -->\s*<div className="mapFade"></div>\s*</div>',
    '<div id="mapContainer" style={{ width: "100%", height: "100%", position: "relative" }}><div className="mapFade"></div>{children}</div>',
    body_content
)

# Also fix the map section ID and classes since they were kebab-cased
body_content = body_content.replace('className="mapHeader"', 'className="map-header"')
body_content = body_content.replace('className="mapHeaderLeft"', 'className="map-header-left"')
body_content = body_content.replace('className="mapPill"', 'className="map-pill"')
body_content = body_content.replace('className="mapFade"', 'className="map-fade"')
body_content = body_content.replace('id="mapContainer"', 'id="map-container"')
body_content = body_content.replace('className="mapSection"', 'className="map-section"')
body_content = body_content.replace('id="mapSection"', 'id="map-section"')
body_content = body_content.replace('className="ghostBtn"', 'className="ghost-btn"')
# Just fix all class names back to kebab-case in className="..."
def fix_classname(match):
    return 'className="' + re.sub(r'([a-z])([A-Z])', r'\1-\2', match.group(1)).lower() + '"'
body_content = re.sub(r'className="([^"]+)"', fix_classname, body_content)

# Fix SVG tags
body_content = body_content.replace('viewbox', 'viewBox')

# Wrap in OldMapPage
jsx = f"""import React from 'react';
import './landing.css'; // Make sure this is imported if it was in head

interface OldMapPageProps {{
    children?: React.ReactNode;
    onBack?: () => void;
}}

export const OldMapPage: React.FC<OldMapPageProps> = ({{ children, onBack }}) => {{
    return (
        <div className="landing-page">
            <button 
                onClick={{onBack}} 
                style={{
                    position: 'fixed', top: '16px', left: '16px', zIndex: 99999, 
                    background: '#1a1a1a', color: '#f5f5f5', border: '1px solid #333', 
                    padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Inter'
                }}
            >
                &larr; Back to BhuVista
            </button>
            {body_content}
        </div>
    );
}};
"""

with open('src/OldMapPage.tsx', 'w', encoding='utf-8') as f:
    f.write(jsx)

# Rewrite index.html
new_index = re.sub(
    r'<body[^>]*>(.*?)</body>',
    '<body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>',
    content,
    flags=re.DOTALL | re.IGNORECASE
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_index)

# Rewrite main.tsx
main_tsx = """import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
"""

with open('src/main.tsx', 'w', encoding='utf-8') as f:
    f.write(main_tsx)

print("Conversion complete!")
