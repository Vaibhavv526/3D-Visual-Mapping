import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

body_match = re.search(r'<body[^>]*>(.*?)</body>', content, re.DOTALL | re.IGNORECASE)
body_content = body_match.group(1) if body_match else ""

# Remove scripts
body_content = re.sub(r'<script.*?</script>', '', body_content, flags=re.DOTALL)
body_content = re.sub(r'<div id="root"></div>', '', body_content)

# We have the string. Let's create the JSX carefully.
escaped_html = body_content.replace('`', '\\`').replace('$', '\\$')

jsx = """import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const OLD_HTML = `""" + escaped_html + """`;

interface OldMapPageProps {
    children?: React.ReactNode;
    onBack?: () => void;
}

export const OldMapPage: React.FC<OldMapPageProps> = ({ children, onBack }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [target, setTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (containerRef.current) {
            const mapContainer = containerRef.current.querySelector('#map-container');
            if (mapContainer) {
                setTarget(mapContainer as HTMLElement);
            }
        }
    }, []);

    return (
        <div className="landing-page" style={{width: '100%', height: '100%'}}>
            <button 
                onClick={onBack} 
                style={{
                    position: 'fixed', top: '16px', left: '16px', zIndex: 99999, 
                    background: '#1a1a1a', color: '#f5f5f5', border: '1px solid #333', 
                    padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Inter'
                }}
            >
                &larr; Back to BhuVista
            </button>
            <div ref={containerRef} dangerouslySetInnerHTML={{ __html: OLD_HTML }} />
            {target && createPortal(children, target)}
        </div>
    );
};
"""

with open('src/OldMapPage.tsx', 'w', encoding='utf-8') as f:
    f.write(jsx)

# Now safely rewrite index.html
new_index = re.sub(
    r'<body[^>]*>(.*?)</body>',
    '<body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>',
    content,
    flags=re.DOTALL | re.IGNORECASE
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_index)

print("Done properly!")
