
import os

file_path = "components/NZDigitalTwin/NZDigitalTwin.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = {
    "#38bdf8": "var(--orange)",
    "#0ea5e9": "var(--orange)",
    "nz-text-cyan": "nz-text-orange",
    "rgba(56, 189, 248, 0.2)": "var(--orange-border)",
    "rgba(56, 189, 248, 0.05)": "var(--orange-dim)",
    "rgba(15, 23, 42, 0.5)": "var(--bg-panel-raised)",
    "rgba(15, 23, 42, 0.6)": "var(--bg-panel-raised)",
    "rgba(15, 23, 42, 0.4)": "var(--bg-panel-raised)",
    "#0f172a": "var(--bg-panel-solid)",
    "#1e293b": "var(--bg-panel-hover)",
    "#334155": "var(--border-strong)",
    "#94a3b8": "var(--text-secondary)",
    "#cbd5e1": "var(--text-primary)",
    "#f8fafc": "var(--text-primary)",
    "rgba(255, 255, 255, 0.05)": "var(--border-subtle)"
}

for old, new in replacements.items():
    content = content.replace(old, new)

# We also need to remove the wireframe property from the mesh material
# Looking for `color={isOrigin ? "var(--orange)" : "#fbbf24"}\n                          wireframe\n`
content = content.replace("wireframe\\n", "")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done replacing.")

