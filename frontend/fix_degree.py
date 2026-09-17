
import os

file_path = "src/components/NZDigitalTwin/NZDigitalTwin.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("{slopeMax.toFixed(1)}</span>", "{slopeMax.toFixed(1)}°</span>")
content = content.replace("0 - {slopeMax.toFixed(1)}</span>", "0 - {slopeMax.toFixed(1)}°</span>")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

