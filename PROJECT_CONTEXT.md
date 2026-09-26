# 3D Visual Mapping — AI Development Context & Project Handoff

## 1. Purpose of this document

This file is the primary context document for an AI coding agent such as Antigravity.

When this repository is opened, the agent should read this file first, inspect the existing source code, and understand the current implementation before changing anything.

**Do not rebuild the project from scratch.**
The repository contains an existing working implementation, processed geospatial data, generated 3D outputs, backend APIs, and a partially implemented frontend.

The goal is to continue the existing project from its current state.

---

# 2. Project identity

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

---


# 3. IMPORTANT AI AGENT INSTRUCTIONS

Before making changes:

1. Read this file completely.
2. Inspect the repository structure.
3. Inspect the relevant source files before editing them.
4. Understand existing data flow and APIs.
5. Preserve working functionality.
6. Make the smallest change required for the current task.
7. Do not regenerate expensive geospatial datasets unless explicitly required.
8. Do not delete existing generated outputs.
9. Do not replace the current architecture without a strong reason.
10. After major changes, run the relevant syntax/build/test checks.
11. Prefer incremental implementation over large rewrites.

## Data protection rules

Never commit:

```text
myvenv/
ml/dataset/
```

`ml/dataset/` is a very large ML dataset (~27 GB) and is intentionally excluded from Git.

The repository uses **Git LFS** for large geospatial/data files.

Do not remove or bypass the existing Git LFS configuration.

---

# 4. Current repository structure

The exact repository may contain additional files. Inspect the actual tree rather than assuming every file listed below is still present.

Important areas include:

```text
3D-Visual-Mapping/
│
├── backend/
│   └── app/
│       ├── main.py
│       ├── routers/
│       └── ...
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── tsconfig*.json
│   └── vite.config.*
│
├── pipeline/
│   ├── ...
│   ├── process_sentinel2.py
│   └── fuse_sentinel_buildings.py
│
├── data/
│   ├── inputs/
│   │   ├── lidar/
│   │   └── sentinel2/
│   └── outputs/
│       ├── nz_lidar/
│       ├── satellite/
│       └── terrain/
│
├── New Zealand data/
│
├── ml/
│   ├── dataset/              # intentionally NOT in Git
│   └── requirements.txt
│
├── lidar_data/
│
├── requirements.txt
├── .gitignore
├── .gitattributes
└── PROJECT_CONTEXT.md
```

Use `find`, `tree`, or IDE exploration to confirm the current structure before implementing anything.

---

# 5. Technology stack

## Backend / geospatial processing

Python with:

- FastAPI
- Uvicorn
- NumPy
- PyVista
- VTK
- Laspy
- Lazrs
- PyProj
- Rasterio
- SciPy
- Shapely

Main dependency file:

```text
requirements.txt
```

Current main requirements:

```text
fastapi==0.141.1
uvicorn==0.52.4
numpy==2.5.1
pyvista==0.48.4
vtk==9.6.2
laspy
lazrs
pyproj
rasterio
scipy
shapely
```

## ML environment

ML dependencies are kept separately in:

```text
ml/requirements.txt
```

This includes:

- PyTorch
- torchvision
- torchaudio
- OpenCV
- Pillow
- Albumentations
- NumPy
- Pandas
- SciPy
- scikit-learn
- Matplotlib
- Seaborn
- Plotly
- tqdm
- rich
- TensorBoard
- timm
- PyYAML
- Jupyter

Do not unnecessarily merge ML dependencies into the main backend requirements.

## Frontend

The frontend uses:

- React
- TypeScript
- Vite
- Three.js
- @react-three/fiber
- @react-three/drei
- Axios

Current frontend dependency file:

```text
frontend/package.json
```

Frontend scripts:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

---

# 6. New Zealand geospatial dataset

The current primary AOI is in New Zealand.

## LiDAR

Four LAZ tiles are being used.

Total point count:

**21,138,016 points**

Coordinate reference system:

```text
EPSG:2193
```

Vertical datum:

```text
NZVD2016
```

AOI approximately:

```text
X: 1774720 – 1775680
Y: 5882640 – 5884080
```

The project uses NZ LiDAR to generate terrain and building geometry.

Important LiDAR files are stored under:

```text
data/inputs/lidar/
```

and are tracked using Git LFS.

---

# 7. Terrain generation

Current terrain generation is already implemented.

Current terrain statistics:

```text
Vertices: 346,801
Triangles: 691,200
Grid resolution: 2 m
```

Important outputs include:

```text
data/outputs/nz_lidar/terrain.vtp
data/outputs/nz_lidar/terrain_fused.vtp
data/outputs/nz_lidar/terrain_layers.vtp
```

There are also older/general terrain outputs under:

```text
data/outputs/terrain/
```

Do not delete them simply because the New Zealand pipeline is now the main focus.

---

# 8. Building extraction and mesh generation

The current New Zealand pipeline detects:

```text
56 buildings
```

The building mesh implementation was deliberately changed from a problematic raw-point Delaunay approach to a more stable method:

1. Use building LiDAR points.
2. Build a regular XY grid.
3. Estimate roof elevation using inverse-distance interpolation.
4. Generate clean triangulation.
5. Generate building walls.
6. Generate bottom/base geometry.
7. Produce the final building mesh.

Important outputs:

```text
data/outputs/nz_lidar/building_points.vtp
data/outputs/nz_lidar/building_mesh.vtp
data/outputs/nz_lidar/building_fused.vtp
```

Current building mesh statistics:

```text
Points: 12,852
Cells: 21,634
```

The existing building mesh generation is considered a stable baseline.

Do not replace it with a completely different algorithm unless there is a clear requirement.

---

# 9. Sentinel-2 integration

The project integrates Sentinel-2 imagery.

The correct tile currently used for the primary NZ fusion workflow is:

```text
T60HUD
```

Scene:

```text
S2C_MSIL2A_20260805T222541_N0512_R029_T60HUD_20260806T022813
```

Reported cloud coverage:

```text
0.01%
```

Important 10 m bands:

```text
B02
B03
B04
B08
```

The Sentinel-2 source data is originally in:

```text
EPSG:32760
```

and is reprojected to:

```text
EPSG:2193
```

for integration with the LiDAR data.

Processed outputs include:

```text
data/outputs/nz_lidar/sentinel2/B02_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/B03_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/B04_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/B08_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/RGB_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/NDVI_10m_epsg2193.tif
```

---

# 10. IMPORTANT Sentinel-2 warning

There is an existing script:

```text
pipeline/process_sentinel2.py
```

**Do NOT run this script casually.**

The current Sentinel-2 processing has already been completed and the outputs are available.

The existing processed outputs should be treated as the baseline.

Only rerun Sentinel-2 processing if the task explicitly requires it and the consequences are understood.

---

# 11. LiDAR + Sentinel-2 fusion

The project has a fusion pipeline:

```text
pipeline/fuse_sentinel_buildings.py
```

The fused building mesh:

```text
data/outputs/nz_lidar/building_fused.vtp
```

contains attributes including:

```text
BuildingID
GroundElevation
Height
RoofElevation
RGB
NDVI
```

This is an important part of the Digital Twin because the geometry is derived from LiDAR while semantic/environmental information is added from satellite imagery.

---

# 12. Backend architecture

The backend is FastAPI.

Important backend area:

```text
backend/app/
```

The current API includes NZ endpoints similar to:

```text
/api/nz/metadata
/api/nz/terrain
/api/nz/buildings
```

The backend serves geospatial metadata and 3D data to the frontend.

Before changing API response formats:

1. Inspect the current router implementation.
2. Inspect the frontend Axios/API calls.
3. Preserve compatibility where possible.

---

# 13. Frontend architecture

The frontend is:

```text
React + TypeScript + Vite
```

3D rendering uses:

```text
Three.js
@react-three/fiber
@react-three/drei
```

HTTP communication uses:

```text
Axios
```

The frontend contains the New Zealand Digital Twin visualization.

The intended visualization includes:

- terrain
- buildings
- building attributes
- satellite-derived RGB information
- vegetation / NDVI information
- interactive camera controls
- future layers and analysis

---

# 14. CURRENT MAJOR FRONTEND ISSUE

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

---

# 15. Development priority

The project should now proceed approximately in this order.

## Priority 1 — Understand the current implementation

Inspect:

```text
backend/app/
frontend/src/
pipeline/
data/outputs/nz_lidar/
```

Understand:

```text
API → data loading → frontend state → Three.js geometry → rendering
```

before changing it.

## Priority 2 — Fix frontend rendering scalability

Make the existing NZ Digital Twin render efficiently.

Goal:

- smooth camera movement
- reasonable browser memory
- no unnecessary full-dataset duplication
- maintain terrain/building visual quality

## Priority 3 — Improve Digital Twin interaction

After rendering is stable, add:

- building selection
- building information panel
- height display
- RGB/NDVI attributes
- layer toggles
- terrain controls
- camera/navigation controls

## Priority 4 — Improve geospatial visualization

Potential future features:

- terrain layer switching
- NDVI visualization
- RGB texture/material
- building highlighting
- vegetation layer
- roads/infrastructure if data becomes available
- measurement tools
- coordinate display
- AOI boundaries

## Priority 5 — Production architecture

Eventually consider:

- tiled 3D data
- optimized binary formats
- caching
- API pagination/chunking
- background processing
- cloud storage
- database-backed metadata
- deployment

Do not implement these prematurely if they complicate the MVP.

---

# 16. Local setup

## Backend

Create a fresh environment:

```bash
python3 -m venv myvenv
source myvenv/bin/activate
```

Install main dependencies:

```bash
pip install -r requirements.txt
```

Run the backend according to the current FastAPI entrypoint.

First inspect:

```text
backend/app/main.py
```

Then use the appropriate Uvicorn command, for example:

```bash
uvicorn backend.app.main:app --reload
```

Do not assume the module path if the repository structure differs; inspect `main.py` first.

---

# 17. Frontend setup

From the project root:

```bash
cd frontend
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

---

# 18. Git / Git LFS

The repository uses Git LFS.

Large files such as:

```text
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
```

are configured for LFS.

Before working with the repository, make sure Git LFS is installed:

```bash
git lfs install
git lfs pull
```

Do not commit:

```text
myvenv/
ml/dataset/
```

The repository already contains the required `.gitignore` and `.gitattributes`.

---

# 19. Existing generated data is valuable

The repository contains expensive generated geospatial outputs.

Examples:

```text
terrain.vtp
terrain_fused.vtp
terrain_layers.vtp
building_mesh.vtp
building_points.vtp
building_fused.vtp
RGB_10m_epsg2193.tif
NDVI_10m_epsg2193.tif
```

Treat these as current baselines.

If a processing algorithm is modified:

- do not delete the old outputs
- generate new outputs separately when practical
- compare old and new results
- only replace the baseline after verification

---

# 20. ML dataset

There is a large ML dataset:

```text
ml/dataset/
```

Approximate size:

**27 GB**

It is intentionally excluded from Git.

The AI agent must not attempt to add it to Git.

If an ML task requires it, assume it must be supplied separately or obtained through the project's intended data source.

---

# 21. Existing non-NZ / legacy data

The repository also contains older Bilaspur/other terrain and LiDAR-related data.

Examples include:

```text
lidar_data/
data/outputs/terrain/
data/outputs/satellite/
data/terrain/
```

These should not be deleted automatically.

The current primary development target is the **New Zealand Digital Twin**, but legacy data may still be useful for testing, comparison, or future workflows.

---

# 22. Coding rules for the AI agent

## Do

- inspect before editing
- reuse existing utilities
- preserve current APIs
- preserve current generated data
- keep modules focused
- use clear variable names
- add comments only where they explain non-obvious geospatial logic
- validate CRS assumptions
- validate array dimensions
- validate mesh sizes
- test after changes
- keep frontend state minimal for large geometry

## Do not

- rewrite the whole project
- regenerate 21M LiDAR points without a reason
- rerun Sentinel-2 processing unnecessarily
- load huge datasets repeatedly into React state
- duplicate large arrays unnecessarily
- commit `myvenv`
- commit `ml/dataset`
- remove Git LFS
- hard-code machine-specific absolute paths
- silently change CRS
- silently change units/meters
- delete working outputs

---

# 23. Geospatial correctness rules

Be careful with:

```text
CRS
EPSG:2193
EPSG:32760
NZVD2016
```

LiDAR and Sentinel-2 must be spatially aligned before fusion.

Always verify:

- CRS
- transform
- pixel resolution
- AOI bounds
- X/Y coordinate order
- elevation units
- raster dimensions
- NoData values

Never assume two datasets are aligned simply because their geographic location appears correct.

---

# 24. Performance rules

Large geospatial data should not be handled like ordinary web application data.

Avoid:

```text
fetch entire huge mesh
→ convert to giant JS arrays
→ store in React state
→ recreate geometry every render
```

Prefer:

```text
backend/data source
→ chunk/tile/filter
→ load only required geometry
→ create stable Three.js buffers
→ dispose resources correctly
```

For large meshes, investigate:

- BufferGeometry
- indexed geometry
- LOD
- spatial tiling
- frustum culling
- chunk loading
- geometry disposal
- memoization
- avoiding unnecessary serialization

---

# 25. Expected AI-agent workflow

When given a new development task:

### Step 1
Read this file.

### Step 2
Inspect the relevant files.

### Step 3
Explain briefly what currently exists.

### Step 4
Identify the smallest implementation change.

### Step 5
Implement it.

### Step 6
Run the relevant validation:

Backend examples:

```bash
python -m py_compile <changed_file.py>
```

Frontend examples:

```bash
npm run build
```

or:

```bash
npm run lint
```

### Step 7
Report:

- what changed
- files changed
- validation performed
- any remaining issue

Do not make unrelated changes.

---

# 26. Definition of success

The project should evolve toward a working interactive Digital Twin where a user can:

1. Open the application.
2. See the New Zealand terrain.
3. See 3D buildings.
4. Navigate the scene smoothly.
5. Select buildings.
6. Inspect building metadata.
7. View RGB information.
8. View NDVI/vegetation information.
9. Toggle visualization layers.
10. Eventually interact with additional urban/geospatial layers.

The system should remain geospatially correct and performant as the dataset grows.

---

# 27. Immediate next task

**Do not start by rebuilding the pipeline.**

First:
1. Review the new BhuVista property intelligence, ML screening, and property registry features.
2. Review the new `profiling_report.md` regarding the async precompilation fix.
3. Determine the next step in improving the Digital Twin interaction (e.g., building selection, property dossier rendering, memory optimization).
4. Implement the smallest safe improvement.
5. Run `npm run build` / `npm run lint`.
6. Test the application.

---

# 28. Final instruction to the AI coding agent

You are taking over an existing geospatial 3D Digital Twin project.

**Continue the implementation. Do not restart it.**

The most important principle is:

> Preserve working geospatial processing and data. Improve the application incrementally, with frontend rendering performance as the immediate priority.

Always inspect the current code before changing it.
# Agents

## Purpose
Tell the AI how it should behave while working on your codebase.

## Project overview
A geospatial 3D Digital Twin platform that combines LiDAR point-cloud data and Sentinel-2 satellite imagery to generate terrain, building meshes, and extract environmental information (NDVI/RGB). The current primary focus is a New Zealand AOI. It features a FastAPI backend and a React + Three.js interactive 3D frontend.

## Tech stack
- **Backend / Geospatial**: Python, FastAPI, Uvicorn, NumPy, PyVista, VTK, Laspy, Rasterio, Shapely.
- **ML Environment**: PyTorch, OpenCV, scikit-learn, etc. (kept in `ml/requirements.txt`).
- **Frontend**: React, TypeScript, Vite, Three.js, `@react-three/fiber`, `@react-three/drei`, Axios.

## Repository structure
- `backend/app/`: FastAPI backend and API routers.
- `frontend/`: React + Vite frontend source code.
- `pipeline/`: Data processing scripts for Sentinel-2 and LiDAR fusion.
- `data/inputs/` & `data/outputs/`: Geospatial datasets (tracked via Git LFS).
- `ml/`: Machine learning models and isolated ML dependencies.

## Coding conventions
- Prefer incremental implementation over large rewrites. Make the smallest change required for the current task.
- Understand existing data flow and APIs before changing them.
- Standard Python (snake_case) and TypeScript/React (PascalCase for components, camelCase for functions) conventions apply.

## Naming conventions
- Keep API endpoints semantic (e.g., `/api/nz/terrain`, `/api/nz/buildings`).
- Output files follow established formats (e.g., `terrain_layers.vtp`, `building_fused.vtp`).

## Architecture rules
- Backend serves geospatial metadata and 3D data to the frontend.
- Frontend uses Three.js to render data. Focus on optimizing frontend 3D rendering scalability.
- ML dependencies (`ml/requirements.txt`) MUST be kept separate from the main backend requirements (`requirements.txt`).

## Dependency rules
- Do not unnecessarily merge ML dependencies into the main backend requirements.
- Use `npm install` for frontend dependencies and `pip install -r requirements.txt` for backend.

## Security rules
- Exclude virtual environments (`myvenv/`) and massive datasets (`ml/dataset/`) from Git.
- Ensure API routes validate geospatial inputs before processing.

## Testing requirements
- Run relevant syntax, build, and test checks after major changes.
- If a processing algorithm is modified, generate new outputs separately and compare them against the old outputs before replacing the baseline.

## Git rules
- The repository relies heavily on **Git LFS** for large files (`*.laz`, `*.las`, `*.vtp`, `*.tif`, `*.pth`, etc.).
- Do not remove, bypass, or break the existing Git LFS configuration.
- Never commit `myvenv/` or `ml/dataset/` (the ~27GB ML dataset).

## Documentation rules
- Always read `PROJECT_CONTEXT.md` first when starting a new session or encountering architectural questions.
- Preserve working functionality and document any breaking changes to the API endpoints.

## UI rules
- **Top Priority**: Frontend 3D rendering optimization. The full terrain has ~690k triangles. Do not overwhelm the browser memory. Use LOD, frustum loading, progressive loading, or geometry simplification where needed.
- Add user-friendly interactions like building selection, layer toggles, and terrain controls once rendering is stable.

## Backend rules
- Before changing API response formats, inspect the current router implementation and frontend Axios calls.
- Preserve backward compatibility with existing frontend state management wherever possible.

## Database rules
- The project currently uses generated `.vtp` and `.tif` files instead of a traditional relational database for 3D data.
- Database-backed metadata might be introduced later; do not implement it prematurely if it complicates the MVP.

## AI/API rules
- Do not regenerate expensive geospatial datasets unless explicitly required.
- Treat existing processed outputs as the baseline. Do not run processing scripts like `pipeline/process_sentinel2.py` casually.

## Things the agent must not do
- **Do not rebuild the project from scratch.**
- Do not delete existing generated outputs (`data/outputs/nz_lidar/`, `data/outputs/terrain/`, etc.).
- Do not replace the current building mesh generation or terrain generation algorithms without a strong reason.
- Do not commit the `ml/dataset/` directory.

## Definition of done
- The requested feature or bug fix is fully implemented and tested.
- Existing functionality, especially the New Zealand Digital Twin rendering, is preserved.
- The browser does not crash from memory overload when rendering 3D scenes.
- No massive geospatial datasets or virtual environments were accidentally committed to Git.
