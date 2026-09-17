import re

with open("src/components/NZDigitalTwin/NZDigitalTwin.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. meanNdvi color change
content = content.replace('<strong>{meanNdvi.toFixed(3)}</strong>', '<strong className="nz-text-emerald">{meanNdvi.toFixed(3)}</strong>')

# 2. areaData.ndviMean color change
content = content.replace('<strong>{areaData.ndviMean.toFixed(3)}</strong>', '<strong className="nz-text-emerald">{areaData.ndviMean.toFixed(3)}</strong>')

# 3. areaData.ndviHighPct color change
content = content.replace('<strong>{areaData.ndviHighPct.toFixed(1)}%</strong>', '<strong className="nz-text-emerald">{areaData.ndviHighPct.toFixed(1)}%</strong>')

# 4. areaData.topologyValidCount color change
content = content.replace('<strong>{areaData.topologyValidCount}</strong>', '<strong className="nz-text-emerald">{areaData.topologyValidCount}</strong>')

# 5. Survey Area typo correction in DossierModal
# The snippet is:
# <div className="nz-dossier-item">\n\n\n\n                                        <span>Survey Area</span>\n\n\n\n                                        <strong >{areaData.surveyAreaHa.toFixed(2)} ha</strong>
# We want to change '<span>Survey Area</span>' to '<span>Survey Are</span>' but only in this context.

pattern = re.compile(r'(<div className="nz-dossier-item">\s*?<span)>(Survey Area)(</span>\s*?<strong >\{areaData\.surveyAreaHa\.toFixed\(2\)\} ha</strong>)')
content = pattern.sub(r'\1>Survey Are\3', content)

with open("src/components/NZDigitalTwin/NZDigitalTwin.tsx", "w", encoding="utf-8") as f:
    f.write(content)
