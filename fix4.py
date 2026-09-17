import re

path = r"c:\Users\igpat\Downloads\SIH\3D-Visual-Mapping\frontend\src\components\NZDigitalTwin\NZDigitalTwin.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract block
start_marker = "    // --- PROPERTY REGISTRY LOGIC ---"
end_marker = "    // --- END REGISTRY LOGIC ---"
start_idx = content.find(start_marker)
end_idx = content.find(end_marker) + len(end_marker)

if start_idx != -1 and end_idx != -1:
    block = content[start_idx:end_idx]
    content = content[:start_idx] + content[end_idx:]
    
    # 2. Insert block at line 6285 (before `useEffect(() => {`)
    insert_marker = "    useEffect(() => {\n        (window as any).__nzTwinState = {"
    insert_idx = content.find(insert_marker)
    
    if insert_idx != -1:
        content = content[:insert_idx] + block + "\n\n" + content[insert_idx:]
    else:
        print("Could not find insert marker")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixes applied")
