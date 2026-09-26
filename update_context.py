import re

with open('PROJECT_CONTEXT.md', 'r', encoding='utf-8') as f:
    context = f.read()

with open('README.md', 'r', encoding='utf-8') as f:
    readme = f.read()

# Replace Project identity
new_identity = """# 2. Project identity

## Project name

**BhuVista**

## Core concept

BhuVista is an interactive 3D geospatial platform that combines LiDAR point-cloud data, terrain modelling, Sentinel-2 satellite imagery, building reconstruction, cadastral integration, 3D property identity, vertical property mapping, spatial analytics, machine learning, topology validation, human review, evidence tracking, and property reporting.

The platform connects:
- LiDAR-derived terrain
- 3D building geometry
- Sentinel-2 RGB imagery
- NDVI
- Cadastral parcels
- Property identity
- Vertical property structure
- Spatial relationships
- ML-based property screening
- Explainable analysis
- 3D topology validation
- Human review
- Evidence and provenance
- Property dossiers

The current implementation is focused on a **New Zealand AOI** (Franklin District, Bombay Hills, and Ramarama area of South Auckland).
"""
context = re.sub(r'# 2\. Project identity.*?---', new_identity + '\n---\n', context, flags=re.DOTALL)

# Add new sections from README before Architecture
# Extract from "# 🏠 Property Intelligence" to the end of the sections before temporal intelligence or just capture everything up to Property Dossier
readme_features = re.search(r'(# 🏠 Property Intelligence.*?\n# 📄 Property Dossier.*?)(?=\n---\n#)', readme, flags=re.DOTALL)
if readme_features:
    features_text = readme_features.group(1)
    
    # We will insert this after "# 11. LiDAR \+ Sentinel-2 fusion" block
    fusion_end = context.find('# 12. Backend architecture')
    if fusion_end != -1:
        context = context[:fusion_end] + features_text + "\n\n---\n\n" + context[fusion_end:]

# Update frontend issue
frontend_issue_update = """# 14. CURRENT MAJOR FRONTEND ISSUE

**Update:** The massive frame freeze (~223ms) during the Earth -> Digital Twin transition has been successfully resolved using `WebGLRenderer.compileAsync()`. This moved the shader precompilation off the main thread, resulting in a smooth 16ms transition frame.

However, the core scalability challenge remains: The full terrain contains approximately:

```text
346,801 vertices
691,200 triangles
```

While the transition is now smooth, loading/rendering the full mesh directly in the browser still causes significant memory/performance pressure.

Therefore, **frontend 3D rendering optimization** and memory management is still a high priority.

Potential directions to investigate:
- geometry simplification
- level of detail (LOD)
- tiled terrain
- frustum-based loading
- chunked VTP/data serving
- instancing where applicable
- disposing unused Three.js geometries/materials
"""
context = re.sub(r'# 14\. CURRENT MAJOR FRONTEND ISSUE.*?(?=\n---\n)', frontend_issue_update, context, flags=re.DOTALL)

# Update Next task
next_task_update = """# 27. Immediate next task

**Do not start by rebuilding the pipeline.**

First:
1. Review the new BhuVista property intelligence, ML screening, and property registry features.
2. Review the new `profiling_report.md` regarding the async precompilation fix.
3. Determine the next step in improving the Digital Twin interaction (e.g., building selection, property dossier rendering, memory optimization).
4. Implement the smallest safe improvement.
5. Run `npm run build` / `npm run lint`.
6. Test the application.
"""
context = re.sub(r'# 27\. Immediate next task.*?(?=\n---\n)', next_task_update, context, flags=re.DOTALL)


with open('PROJECT_CONTEXT_NEW.md', 'w', encoding='utf-8') as f:
    f.write(context)
