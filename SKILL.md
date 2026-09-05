# 3D Digital Twin Development Skill

## Skill Identity

Name: 3D Digital Twin / Geospatial 3D Visualization Engineer

Purpose:
Build, debug, optimize, and extend the 3D Visual Mapping project without
breaking the existing geospatial pipeline, generated datasets, backend APIs,
or frontend visualization.

Primary project:
3D Visual Mapping / New Zealand Digital Twin

Primary objective:
Convert LiDAR + satellite imagery into a georeferenced interactive 3D
digital twin containing:

- Terrain
- Buildings
- Building attributes
- Satellite-derived RGB information
- NDVI / vegetation information
- Future vegetation / roads / infrastructure layers
- Interactive 3D visualization
- Geospatial metadata
- API-driven data delivery


# 1. CORE DEVELOPMENT PRINCIPLE

DO NOT rebuild the project from scratch.

The repository already contains:

- Working LiDAR processing
- Working terrain generation
- Working building extraction
- Working Sentinel-2 processing
- Building/satellite fusion
- FastAPI backend
- React + Three.js frontend
- Generated NZ datasets

Before modifying anything:

1. Inspect the existing implementation.
2. Understand the data flow.
3. Identify the smallest required change.
4. Modify only the required files.
5. Run validation.
6. Verify that existing functionality still works.


# 2. PROJECT ARCHITECTURE

The project follows this high-level pipeline:

LiDAR
  ↓
Point Cloud Processing
  ↓
Terrain Generation
  ↓
Building Detection
  ↓
Building Mesh Generation
  ↓
Sentinel-2 Processing
  ↓
Satellite Feature Extraction
  ↓
Building + Satellite Fusion
  ↓
FastAPI Backend
  ↓
React + Three.js Frontend
  ↓
Interactive 3D Digital Twin


Main components:

backend/
    API and server-side processing

frontend/
    React + Three.js visualization

pipeline/
    Geospatial processing and data generation

data/
    Raw and generated project data

ml/
    Machine-learning experiments/datasets/models


# 3. TECHNOLOGY STACK

## Backend

Python
FastAPI
Uvicorn
NumPy
SciPy
PyVista
VTK
LasPy
LAZRS
PyProj
Rasterio
Shapely

## Frontend

React
TypeScript
Vite
Three.js
@react-three/fiber
@react-three/drei
Axios

## Geospatial

CRS:
EPSG:2193

New Zealand Transverse Mercator 2000

Vertical datum:
NZVD2016

Important:
Never silently change CRS.

Any new spatial dataset must have its CRS explicitly identified.


# 4. NEW ZEALAND DATASET

The current primary dataset is a New Zealand LiDAR + Sentinel-2
digital twin.

LiDAR:

Total points:
21,138,016

AOI:

X:
1774720 – 1775680

Y:
5882640 – 5884080

CRS:
EPSG:2193

Vertical datum:
NZVD2016


Terrain:

Vertices:
346,801

Triangles:
691,200

Grid resolution:
2 metres


Buildings:

Detected buildings:
56

Current stable building mesh:

Points:
12,852

Cells:
21,634


Sentinel-2:

Tile:
T60HUD

Scene:
S2C_MSIL2A_20260805T222541_N0512_R029_T60HUD_20260806T022813

Cloud cover:
0.01%

Bands currently used:

B02
B03
B04
B08

Native resolution:
10 m

Original Sentinel CRS:
EPSG:32760

Target project CRS:
EPSG:2193


# 5. TERRAIN PROCESSING RULES

Terrain is currently generated using a 2 m grid.

Current terrain size:

346,801 vertices
691,200 triangles

IMPORTANT:

The terrain is already computationally expensive.

Do not increase terrain resolution unless explicitly requested.

Do not regenerate the terrain merely to solve frontend rendering problems.

Frontend optimization should be attempted first.


# 6. BUILDING PROCESSING RULES

Current building extraction is stable.

The building pipeline uses:

1. LiDAR point extraction
2. Building detection
3. XY regular grid
4. Inverse-distance roof elevation interpolation
5. Clean triangulation
6. Building walls
7. Building bottom
8. Mesh generation

IMPORTANT:

Do not replace the current building mesh algorithm with raw-point
Delaunay triangulation unless there is a demonstrated technical reason.

Previous raw-point Delaunay approaches produced unstable / problematic
building geometry.

Preserve the current stable implementation.


# 7. SENTINEL-2 RULES

Current valid Sentinel-2 tile:

T60HUD

Current scene:

S2C_MSIL2A_20260805T222541_N0512_R029_T60HUD_20260806T022813

Current useful bands:

B02
B03
B04
B08

RGB:

B04 = Red
B03 = Green
B02 = Blue

NDVI:

NDVI = (B08 - B04) / (B08 + B04)

Handle zero denominators safely.

Sentinel-2 source CRS:

EPSG:32760

Project CRS:

EPSG:2193

Always reproject spatial data before spatial fusion.


# 8. SENTINEL PROCESSING WARNING

DO NOT run:

pipeline/process_sentinel2.py

unless explicitly required.

The current Sentinel-2 outputs are already correctly generated.

Reprocessing Sentinel-2 can:

- waste time
- consume storage
- overwrite valid outputs
- introduce unnecessary changes

Use existing outputs whenever possible.


# 9. BUILDING-SATELLITE FUSION

Fusion script:

pipeline/fuse_sentinel_buildings.py

Current fused output:

building_fused.vtp

The fused building data contains:

BuildingID
GroundElevation
Height
RoofElevation
RGB
NDVI

Any future building-level feature should preserve this structure unless
there is a clear architectural reason to change it.


# 10. GEOSPATIAL COORDINATE RULES

This project uses real-world projected coordinates.

Do not assume:

latitude = X
longitude = Y

The project uses:

EPSG:2193

Therefore coordinates are projected Easting/Northing.

When sending data to Three.js:

1. Preserve geospatial accuracy.
2. Avoid unnecessary precision loss.
3. Consider local-origin normalization for rendering.

Recommended rendering strategy:

world coordinate
    ↓
subtract local origin
    ↓
Three.js coordinate


Example:

render_x = x - origin_x
render_y = z
render_z = y - origin_y

The exact mapping must follow the existing frontend convention.

DO NOT change coordinate orientation without checking the current renderer.


# 11. FRONTEND PERFORMANCE SKILL

CURRENT MAJOR PROBLEM:

The frontend 3D viewer has performance/memory issues when loading the full
terrain mesh.

Terrain:

346,801 vertices
691,200 triangles

Potential problems:

- high GPU memory usage
- large JavaScript arrays
- excessive React state
- unnecessary object creation
- large geometry construction
- browser freezes
- slow initial render
- excessive garbage collection

DO NOT solve this by deleting or reducing the source dataset.

Optimize the visualization layer.


# 12. THREE.JS PERFORMANCE RULES

Avoid:

- React state for large geometry buffers
- per-vertex React components
- thousands of individual mesh objects
- recreating BufferGeometry every render
- recreating materials every render
- unnecessary useMemo misuse
- unnecessary cloning
- unnecessary conversion between arrays

Prefer:

- BufferGeometry
- typed arrays
- Float32Array
- indexed geometry
- reusable materials
- memoized geometry
- direct Three.js object manipulation when appropriate
- frustum culling
- level of detail
- tiled/chunked terrain
- progressive loading
- lazy loading
- Web Workers for expensive CPU processing

For large meshes:

Prefer a single optimized geometry or manageable chunks over thousands of
small React components.


# 13. TERRAIN OPTIMIZATION STRATEGY

When optimizing terrain, investigate in this order:

1. Measure current browser memory usage.
2. Inspect geometry creation.
3. Check duplicate data copies.
4. Check React state usage.
5. Check whether vertices are duplicated.
6. Check whether indexed geometry can be used.
7. Check chunking.
8. Check progressive loading.
9. Check Level of Detail.
10. Consider Web Workers if CPU processing blocks the UI.

Do not implement all optimizations at once.

Make one controlled change at a time.


# 14. RECOMMENDED TERRAIN CHUNKING

For large terrain:

Split terrain into spatial tiles/chunks.

Example:

Terrain
 ├── Chunk 0
 ├── Chunk 1
 ├── Chunk 2
 ├── Chunk 3
 └── ...

Benefits:

- lower memory pressure
- frustum culling
- progressive loading
- easier LOD
- better interaction
- easier future streaming


# 15. BACKEND API

Current API endpoints include:

GET /api/nz/metadata

GET /api/nz/terrain

GET /api/nz/buildings


Before adding a new endpoint:

1. Inspect existing router structure.
2. Follow existing naming conventions.
3. Reuse existing data-loading logic where possible.
4. Do not duplicate processing logic inside API routes.


# 16. API DESIGN RULES

API responses should be:

- predictable
- JSON serializable
- reasonably compact
- geospatially explicit
- backward compatible where possible

Do not send unnecessarily large raw datasets through JSON.

For large geometry:

Prefer binary or file-based formats such as:

VTP
GLB
PLY
NPZ

depending on the existing architecture.


# 17. PYVISTA / VTK RULES

PyVista and VTK are primarily used for:

- mesh generation
- geometry processing
- mesh export
- spatial visualization
- VTP generation

When modifying mesh generation:

Always verify:

- number of points
- number of cells
- bounds
- CRS metadata if applicable
- NaN/Inf values
- degenerate triangles
- empty meshes


# 18. MESH VALIDATION

Every generated mesh should be checked for:

- zero points
- zero cells
- NaN coordinates
- infinite coordinates
- unexpected bounds
- degenerate geometry

Recommended validation concepts:

points > 0
cells > 0
all coordinates finite
bounds reasonable
triangle count reasonable

Never assume a mesh is valid merely because the file was generated.


# 19. DATA SAFETY

The repository uses Git LFS.

Tracked large-file types include:

*.laz
*.las
*.jp2
*.tif
*.tiff
*.vtp
*.ply
*.npz
*.pth
*.pt
*.h5
*.keras
*.zip
*.npy

Do not remove Git LFS configuration.

Do not convert large files into normal Git blobs.


# 20. FORBIDDEN DATA

The ML dataset is intentionally excluded:

ml/dataset/

It is approximately 27 GB.

DO NOT add it to Git.

DO NOT remove the exclusion from .gitignore.

DO NOT run commands that stage it accidentally.


# 21. VIRTUAL ENVIRONMENT

The Python environment:

myvenv/

must NOT be committed.

Use:

python3 -m venv myvenv

Activate:

source myvenv/bin/activate

Install:

pip install -r requirements.txt


# 22. FRONTEND DEPENDENCIES

Frontend setup:

cd frontend
npm install

Development:

npm run dev

Production build:

npm run build

Lint:

npm run lint


# 23. BACKEND DEVELOPMENT

Before changing backend code:

1. Activate myvenv.
2. Inspect existing FastAPI application.
3. Inspect routers.
4. Inspect data loading.
5. Make minimal changes.
6. Start the backend.
7. Test affected endpoints.


Typical development command:

uvicorn backend.app.main:app --reload

However:

ALWAYS inspect the actual repository structure before assuming the module path.


# 24. CODE MODIFICATION WORKFLOW

For every task:

STEP 1:
Understand the request.

STEP 2:
Inspect the relevant files.

STEP 3:
Trace the data flow.

STEP 4:
Identify the root cause.

STEP 5:
Plan the smallest safe change.

STEP 6:
Modify only necessary files.

STEP 7:
Run syntax/type/build validation.

STEP 8:
Run the affected component.

STEP 9:
Check for regressions.

STEP 10:
Report:

- what changed
- why
- files changed
- tests performed
- remaining problems


# 25. DO NOT MAKE BLIND CHANGES

Never:

- rewrite entire files unnecessarily
- replace working pipelines without testing
- regenerate large datasets without need
- change CRS casually
- change API contracts casually
- upgrade every dependency just because an update exists
- delete existing generated data to solve a software problem
- optimize without measuring the bottleneck


# 26. DEBUGGING METHOD

When something fails:

Do NOT immediately patch the error.

First determine:

1. Where does the error originate?
2. Is the input valid?
3. Is the data format correct?
4. Is CRS correct?
5. Is the failure backend, pipeline, or frontend?
6. Is memory the issue?
7. Is the issue CPU/GPU?
8. Did a recent change introduce the problem?


Use:

logs
stack traces
file sizes
mesh statistics
API responses
browser console
network tab
performance profiler


# 27. GEOSPATIAL DEBUGGING

If spatial output looks incorrect:

Check in this order:

1. CRS
2. axis order
3. coordinate ranges
4. reprojection
5. raster transform
6. raster resolution
7. AOI bounds
8. vertical datum
9. geometry orientation


Never fix geospatial problems using arbitrary offsets until the CRS and
coordinate system have been verified.


# 28. MEMORY DEBUGGING

If the application crashes or browser freezes:

Determine whether memory is being consumed by:

Backend:
- NumPy arrays
- PyVista meshes
- raster data
- point clouds

Frontend:
- typed arrays
- duplicated arrays
- Three.js geometry
- textures
- React state
- multiple copies of API responses

Do not assume the backend is the problem when the browser is freezing.


# 29. LARGE DATA RULE

Before loading a large dataset, estimate:

number_of_elements × bytes_per_element

Example:

Float32:
4 bytes

Float64:
8 bytes

Index buffers may require:

Uint16
Uint32

Avoid accidental Float64 → Float32 → Float64 conversions.


# 30. REACT RULES

Large geospatial data must NOT be stored in normal React state unless necessary.

Avoid:

setState(hugeArray)

Prefer:

refs
memoized buffers
external data structures
Three.js BufferGeometry

React should manage UI state, not millions of geometry values.


# 31. THREE.JS SCENE ARCHITECTURE

Maintain clear scene layers:

Scene
 ├── Terrain
 ├── Buildings
 ├── Vegetation
 ├── Roads
 ├── Infrastructure
 ├── Satellite overlays
 └── UI / helpers

Future features should be added as isolated layers.

Do not tightly couple every layer together.


# 32. FUTURE FEATURES

The architecture should allow:

- vegetation detection
- tree models
- roads
- infrastructure
- water bodies
- building classification
- building height visualization
- NDVI visualization
- RGB satellite textures
- measurement tools
- distance measurement
- elevation inspection
- building selection
- metadata panels
- search
- layer visibility controls
- time-based imagery
- 3D tiles / streaming
- LOD
- spatial indexing


# 33. BUILDING INTERACTION

Buildings should eventually support:

Click/select building
    ↓
BuildingID
    ↓
Metadata
    ↓
Display:

Height
Ground elevation
Roof elevation
RGB
NDVI
Location
Classification


Keep BuildingID stable across processing stages whenever possible.


# 34. DIGITAL TWIN UI PRINCIPLES

The interface should feel like a professional GIS + 3D digital twin platform.

Prioritize:

- clean 3D viewport
- layer controls
- metadata panels
- spatial navigation
- performance
- useful visualization
- clear geographic context

Avoid unnecessary decorative UI that reduces viewport space or performance.


# 35. VISUALIZATION MODES

Potential terrain visualization modes:

1. Natural terrain
2. Elevation
3. Satellite RGB
4. NDVI
5. Building height
6. Building classification

These should be implemented as visualization modes rather than duplicating
entire datasets.


# 36. ERROR HANDLING

Backend:

Return meaningful HTTP errors.

Frontend:

Display useful user-facing errors.

Never silently fail.

For missing datasets:

Clearly identify:

- missing file
- expected path
- required processing step

Do not automatically regenerate huge datasets unless explicitly requested.


# 37. TESTING REQUIREMENTS

After backend modifications:

Test:

GET /api/nz/metadata

GET /api/nz/terrain

GET /api/nz/buildings

After frontend modifications:

Run:

npm run build

Also verify the application in the browser.


# 38. DATA PIPELINE VALIDATION

After pipeline changes:

Check:

Input files
↓
Point count
↓
CRS
↓
Bounds
↓
Generated geometry
↓
Output file
↓
Backend loading
↓
Frontend visualization


A pipeline is not considered successful merely because the Python script
completed without an exception.


# 39. GIT RULES

Before committing:

git status

Review:

git diff

Check large files:

git lfs status

Check LFS files:

git lfs ls-files


Never commit:

myvenv/
ml/dataset/
.env
node_modules/


# 40. COMMIT STYLE

Use focused commits.

Examples:

Add terrain chunk loading

Optimize Three.js terrain rendering

Fix building coordinate transformation

Add NDVI visualization

Improve NZ metadata API

Avoid vague commits:

update
changes
fix stuff
final


# 41. AGENT BEHAVIOR

The AI coding agent must behave as a senior:

- Python engineer
- GIS engineer
- 3D graphics engineer
- React/TypeScript engineer
- FastAPI engineer

It must understand the interaction between:

geospatial data
↓
geometry
↓
API
↓
browser memory
↓
GPU rendering


Do not treat these as isolated components.


# 42. PRIORITY ORDER

When making decisions, prioritize:

1. Correctness
2. Geospatial accuracy
3. Existing functionality
4. Performance
5. Maintainability
6. Visual quality
7. New features


Never sacrifice coordinate correctness for visual appearance.


# 43. CURRENT PROJECT PRIORITY

The highest-priority technical issue is:

FRONTEND 3D PERFORMANCE / MEMORY

The terrain contains:

346,801 vertices
691,200 triangles

The next developer should investigate and optimize the existing frontend
terrain rendering before adding large new datasets.


Recommended sequence:

1. Inspect terrain API response.
2. Inspect frontend terrain loader.
3. Determine how geometry is constructed.
4. Determine how many copies of terrain data exist.
5. Check React state usage.
6. Check Three.js geometry allocation.
7. Profile browser memory.
8. Implement one optimization.
9. Build.
10. Test.
11. Measure improvement.


# 44. DEFINITION OF DONE

A change is complete only when:

- implementation works
- existing functionality remains intact
- no unexpected CRS changes occurred
- no unnecessary large data was regenerated
- frontend builds successfully
- backend starts successfully
- affected APIs work
- generated geometry is valid
- performance did not regress
- changes are documented when appropriate


# 45. MOST IMPORTANT RULE

DO NOT DESTROY WORKING DATA OR PIPELINES TO MAKE DEVELOPMENT EASIER.

The project already contains valuable generated NZ LiDAR,
Sentinel-2, terrain, building, and fusion outputs.

Treat these datasets as production-like assets.

Inspect first.

Measure first.

Modify minimally.

Validate everything.


# 46. FIRST ACTION FOR A NEW AI AGENT

When starting work on this repository:

1. Read README.md.
2. Read PROJECT_CONTEXT.md.
3. Read this SKILL.md.
4. Inspect git status.
5. Inspect repository structure.
6. Identify the current implementation state.
7. Run the relevant application.
8. Reproduce the current issue.
9. Only then begin modifying code.

Do not immediately generate new code.


# 47. CURRENT HANDOFF TASK

The immediate engineering objective is:

Optimize the frontend 3D terrain rendering so the existing New Zealand
digital twin can load and interact smoothly without browser memory crashes.

Do not:

- regenerate the LiDAR
- regenerate the terrain
- reduce the source dataset
- delete buildings
- delete Sentinel-2 data
- remove generated outputs

Instead optimize:

- data transfer
- geometry construction
- typed arrays
- React rendering
- Three.js memory
- terrain chunking
- LOD
- progressive loading


# 48. FINAL AGENT PRINCIPLE

Think of this repository as an existing production prototype.

The task is:

UNDERSTAND → MEASURE → MODIFY → VALIDATE → IMPROVE

Not:

REWRITE → HOPE → BREAK EXISTING WORK