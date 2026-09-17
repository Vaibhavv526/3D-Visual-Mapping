const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'utf-8');

// 1. Remove the extra grid wrapper in 3D PROPERTY IDENTITY
content = content.replace(
    /<div style=\{\{\s*display:\s*"grid",\s*gridTemplateColumns:\s*"1fr 1fr",\s*gap:\s*"8px"\s*\}\}>\s*<div className="nz-prop-2col" style=\{\{\s*marginBottom:\s*0\s*\}\}>/,
    '<div className="nz-prop-2col" style={{ marginBottom: 0 }}>'
);
content = content.replace(
    /<strong>\{building\.id\}<\/strong>\s*<\/div>\s*<\/div>\s*<\/div>/,
    '<strong>{building.id}</strong>\n                            </div>\n                        </div>'
);

// 2. Area Panel Section Titles
content = content.replace('<div className="nz-prop-section-title">1. SURVEY SCOPE</div>', '<div className="nz-prop-section-title">01 &nbsp;&nbsp; SURVEY SCOPE</div>');
content = content.replace('<div className="nz-prop-section-title">2. PROPERTY IDENTITY (PROJECT-DEFINED)</div>', '<div className="nz-prop-section-title">02 &nbsp;&nbsp; PROPERTY IDENTITY</div>');
content = content.replace('<div className="nz-prop-section-title">3. BUILT ENVIRONMENT</div>', '<div className="nz-prop-section-title">03 &nbsp;&nbsp; BUILT ENVIRONMENT</div>');

// 3. Remove emerald class from metrics
content = content.replace(/<strong className="nz-text-emerald">(\{idStats\.generatedPropertyIds\})<\/strong>/, '<strong>$1</strong>');
content = content.replace(/<strong className="nz-text-emerald">(\{idStats\.generatedVerticalUnits\})<\/strong>/, '<strong>$1</strong>');

// 4. Fix items with notes to use nz-prop-full
content = content.replace(
    /<div className="nz-prop-item">\s*<span>Identity Unavailable<\/span>\s*<strong>\{idStats\.unavailableIdentities\}<\/strong>\s*<div className="nz-prop-note">Unassociated \/ Vacant<\/div>\s*<\/div>/,
    '<div className="nz-prop-item nz-prop-full">\n                        <span>Identity Unavailable</span>\n                        <strong>{idStats.unavailableIdentities}</strong>\n                        <div className="nz-prop-note">Unassociated / Vacant</div>\n                    </div>'
);
content = content.replace(
    /<div className="nz-prop-item">\s*<span>Tallest Structure<\/span>\s*<strong>\{data\.tallestHeight\.toFixed\(1\)\} m<\/strong>\s*<div className="nz-prop-note">\{data\.tallestBuildingId\}<\/div>\s*<\/div>/,
    '<div className="nz-prop-item nz-prop-full">\n                        <span>Tallest Structure</span>\n                        <strong>{data.tallestHeight.toFixed(1)} m</strong>\n                        <div className="nz-prop-note">{data.tallestBuildingId}</div>\n                    </div>'
);

// 5. Make LiDAR etc use muted instead of orange
content = content.replace('<span style={{ color: "var(--orange)" }}>LiDAR</span>', '<span style={{ color: "var(--text-muted)" }}>LiDAR</span>');
content = content.replace('<span style={{ color: "var(--orange)" }}>Terrain</span>', '<span style={{ color: "var(--text-muted)" }}>Terrain</span>');
content = content.replace('<span style={{ color: "var(--orange)" }}>Imagery</span>', '<span style={{ color: "var(--text-muted)" }}>Imagery</span>');
content = content.replace('<span style={{ color: "var(--orange)" }}>Cadastral</span>', '<span style={{ color: "var(--text-muted)" }}>Cadastral</span>');
content = content.replace('<span style={{ color: "var(--orange)" }}>Buildings</span>', '<span style={{ color: "var(--text-muted)" }}>Buildings</span>');

// 6. Add scroll bodies:
// Property Panel (main)
content = content.replace(
    /\{parcelsAvailable && cadastralAssoc\?\.property_id_3d && \(/,
    '<div className="nz-property-scroll-body">\n            {parcelsAvailable && cadastralAssoc?.property_id_3d && ('
);
content = content.replace(
    /<div style=\{\{\s*height:\s*"24px"\s*\}\}\s*\/>\s*<\/div>\s*\)\s*;/g,
    '<div style={{ height: "24px" }} />\n            </div>\n        </div>\n    );\n'
);

// Vertical Exploration Panel
content = content.replace(
    /<div className="nz-back-building-wrap" style=\{\{\s*marginBottom:\s*"16px"\s*\}\}>/,
    '<div className="nz-property-scroll-body">\n                <div className="nz-back-building-wrap" style={{ marginBottom: "16px" }}>'
);
content = content.replace(
    /Vertical Unit IDs.*?<\/div>\s*<\/>\s*\)\}\s*<\/div>\s*\)\s*;/s,
    'Vertical Unit IDs are project-defined identifiers for LiDAR-derived estimated levels. They are not official ULPINs or legal cadastral unit identifiers.\n                        </div>\n                    </>\n                )}\n            </div>\n        </div>\n    );\n'
);

// Parcel Inspector
content = content.replace(
    /<div className="nz-property-header".*?>\s*<h3>.*?<\/h3>.*?<\/div>/s,
    (match) => match + '\n\n            <div className="nz-property-scroll-body">'
);
content = content.replace(
    /<div className="nz-disclaimer" style=\{\{\s*marginTop:\s*"10px"\s*\}\}>.*?<\/div>\s*<\/div>\s*\)\s*;/s,
    (match) => match.replace('</div>\n    );\n}', '</div>\n            </div>\n        </div>\n    );\n}')
);
// Wait, the Parcel Inspector replacement might match the wrong div or fail. 
// Let's explicitly do this:
let parcelHeaderIdx = content.indexOf('<div className="nz-kicker">CADASTRAL PARCEL INSPECTOR</div>');
if (parcelHeaderIdx !== -1) {
    let headerEndIdx = content.indexOf('</div>', content.indexOf('<div className="nz-property-header"', parcelHeaderIdx));
    if (headerEndIdx !== -1) {
        content = content.substring(0, headerEndIdx + 6) + '\n\n            <div className="nz-property-scroll-body">' + content.substring(headerEndIdx + 6);
    }
    
    let disclaimerIdx = content.indexOf('<div className="nz-disclaimer" style={{ marginTop: "10px" }}>', parcelHeaderIdx);
    if (disclaimerIdx !== -1) {
        let endOfDisclaimer = content.indexOf('</div>', disclaimerIdx);
        let endOfWrapper = content.indexOf('</div>', endOfDisclaimer + 6);
        content = content.substring(0, endOfWrapper) + '</div>\n' + content.substring(endOfWrapper);
    }
}

fs.writeFileSync('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', content);
console.log('Fixed');
