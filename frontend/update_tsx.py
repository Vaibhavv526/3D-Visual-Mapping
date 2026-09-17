import re

with open("src/components/NZDigitalTwin/NZDigitalTwin.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove inline color="#a3a3a3" from span tags in NZDigitalTwin.tsx
content = re.sub(r'<span style={{ color: "#a3a3a3" }}>', '<span>', content)

# Fix typo "Survey Are" -> "Survey Area"
content = content.replace('<span>Survey Are</span>', '<span>Survey Area</span>')
content = content.replace('% of tile are</span>', '% of tile area</span>')

# Add nz-metric-large to important metrics
# 1. Tile Dimensions
content = content.replace('<strong>{data.tileWidth.toLocaleString()} × {data.tileHeight.toLocaleString()} m</strong>', 
                          '<strong className="nz-metric-large">{data.tileWidth.toLocaleString()} × {data.tileHeight.toLocaleString()} m</strong>')

# 2. Survey Area
content = content.replace('<strong>{data.surveyAreaHa.toFixed(1)} ha</strong>', 
                          '<strong className="nz-metric-large">{data.surveyAreaHa.toFixed(1)} ha</strong>')

# 3. Estimated Built Coverage (totalFootprintM2)
content = content.replace('{data.totalFootprintM2.toLocaleString()} m²',
                          '<span className="nz-metric-large">{data.totalFootprintM2.toLocaleString()} m²</span>')

# 4. Generated 3DP IDs
content = content.replace('<strong>{idStats.generatedPropertyIds}</strong>',
                          '<strong className="nz-metric-large">{idStats.generatedPropertyIds}</strong>')

# 5. Generated Vertical Units
content = content.replace('<strong>{idStats.generatedVerticalUnits}</strong>',
                          '<strong className="nz-metric-large">{idStats.generatedVerticalUnits}</strong>')

# 6. Valid Identities
# Is valid identities 56 an important metric? Yes, in the example: 
# "56" and "104" are important.
content = content.replace('<strong>{idStats.validIdentities}</strong>',
                          '<strong className="nz-metric-large">{idStats.validIdentities}</strong>')


with open("src/components/NZDigitalTwin/NZDigitalTwin.tsx", "w", encoding="utf-8") as f:
    f.write(content)
