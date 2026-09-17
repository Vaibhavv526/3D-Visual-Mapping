
import os
import re

file_path = "components/NZDigitalTwin/NZDigitalTwin.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the wireframe line
content = re.sub(r"\s*wireframe\s*\n", "\n", content)

# Change emissive for isTarget as well to match a cohesive theme if needed, but #fbbf24 is amber which is fine for target

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

