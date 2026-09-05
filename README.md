# 3D Visual Mapping

> **LiDAR + Sentinel-2 based 3D Digital Twin / Urban Mapping Platform**

3D Visual Mapping is a geospatial 3D Digital Twin platform that combines **LiDAR point-cloud data** with **Sentinel-2 satellite imagery** to generate and visualize a georeferenced 3D representation of an area.

The current implementation focuses on a **New Zealand AOI** and already contains working geospatial processing, generated terrain/building meshes, satellite-derived RGB/NDVI data, a FastAPI backend, and a React + Three.js frontend.

---

## 🚀 Project Vision

The long-term goal is to build an automated Digital Twin platform that can take geospatial datasets and produce an interactive 3D environment containing:

- Terrain
- Buildings
- Vegetation
- Roads and infrastructure
- Satellite-derived visual information
- Environmental information such as NDVI
- Building-level attributes
- Interactive analysis tools

The intended experience is a **futuristic interactive 3D map / Digital Twin**, where geospatial data is transformed into an understandable 3D environment.

---

# 🧩 Current Architecture

```text
                    ┌─────────────────────┐
                    │     LiDAR LAZ       │
                    │  21M+ point cloud   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ LiDAR Processing    │
                    │ Terrain + Buildings │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
        ┌─────────────────┐         ┌─────────────────┐
        │ Terrain Mesh    │         │ Building Mesh   │
        │ VTP             │         │ VTP             │
        └────────┬────────┘         └────────┬────────┘
                 │                           │
                 │        Sentinel-2          │
                 │       Satellite Data      │
                 │              │            │
                 │              ▼            │
                 │      RGB + NDVI Data      │
                 │              │            │
                 └──────────────┴────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │ Data Fusion         │
                    │ LiDAR + Sentinel-2  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    FastAPI Backend  │
                    │  Metadata / Terrain │
                    │  / Buildings APIs   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ React + Three.js    │
                    │ Interactive 3D UI   │
                    └─────────────────────┘
```

---

# 🗂️ Repository Structure

The repository contains the following major areas:

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
│   └── ...
│
├── pipeline/
│   ├── geospatial processing scripts
│   ├── LiDAR processing
│   ├── Sentinel-2 processing
│   └── fusion scripts
│
├── data/
│   ├── inputs/
│   │   ├── lidar/
│   │   └── sentinel2/
│   │
│   └── outputs/
│       ├── nz_lidar/
│       ├── satellite/
│       └── terrain/
│
├── New Zealand data/
│
├── ml/
│   ├── dataset/              # NOT stored in Git
│   └── requirements.txt
│
├── lidar_data/
│
├── requirements.txt
├── .gitignore
├── .gitattributes
├── PROJECT_CONTEXT.md
└── README.md
```

The exact file structure may contain additional files. Inspect the repository before modifying it.

---

# 🌍 New Zealand Dataset

The current primary Digital Twin implementation uses New Zealand LiDAR and Sentinel-2 data.

## LiDAR

Four LAZ tiles are currently used.

Total LiDAR point count:

```text
21,138,016 points
```

CRS:

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

---

# ⛰️ Terrain

Terrain generation has already been completed.

Current terrain:

```text
Vertices: 346,801
Triangles: 691,200
Grid resolution: 2 m
```

Important outputs:

```text
data/outputs/nz_lidar/terrain.vtp
data/outputs/nz_lidar/terrain_fused.vtp
data/outputs/nz_lidar/terrain_layers.vtp
```

The terrain is georeferenced and generated from the NZ LiDAR data.

---

# 🏢 Building Detection

The current pipeline detects:

```text
56 buildings
```

The building mesh generation was changed from a problematic raw-point Delaunay approach to a more stable approach using:

1. Building LiDAR points
2. Regular XY grid
3. Inverse-distance roof elevation interpolation
4. Clean triangulation
5. Building walls
6. Building base/bottom geometry

Current building mesh:

```text
Points: 12,852
Cells: 21,634
```

Important outputs:

```text
data/outputs/nz_lidar/building_points.vtp
data/outputs/nz_lidar/building_mesh.vtp
data/outputs/nz_lidar/building_fused.vtp
```

---

# 🛰️ Sentinel-2

The current NZ fusion workflow uses Sentinel-2 tile:

```text
T60HUD
```

Scene:

```text
S2C_MSIL2A_20260805T222541_N0512_R029_T60HUD_20260806T022813
```

Cloud coverage:

```text
0.01%
```

Primary 10 m bands:

```text
B02
B03
B04
B08
```

Source CRS:

```text
EPSG:32760
```

Reprojected CRS:

```text
EPSG:2193
```

Processed outputs:

```text
data/outputs/nz_lidar/sentinel2/B02_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/B03_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/B04_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/B08_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/RGB_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/NDVI_10m_epsg2193.tif
```

---

# 🔗 LiDAR + Sentinel-2 Fusion

The fusion pipeline is:

```text
pipeline/fuse_sentinel_buildings.py
```

The resulting fused building mesh contains attributes including:

```text
BuildingID
GroundElevation
Height
RoofElevation
RGB
NDVI
```

Output:

```text
data/outputs/nz_lidar/building_fused.vtp
```

This is the foundation for building-aware Digital Twin visualization.

---

# 🖥️ Backend

The backend uses:

- Python
- FastAPI
- Uvicorn
- PyVista
- VTK
- NumPy
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

Current requirements:

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

---

# 🔌 Current API

The FastAPI backend currently provides NZ endpoints including:

```text
/api/nz/metadata
/api/nz/terrain
/api/nz/buildings
```

Before changing response formats, inspect both the backend routers and the frontend API calls.

---

# 🎨 Frontend

The frontend uses:

- React
- TypeScript
- Vite
- Three.js
- @react-three/fiber
- @react-three/drei
- Axios

Frontend dependencies are defined in:

```text
frontend/package.json
```

Run:

```bash
cd frontend
npm install
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

---

# ⚠️ CURRENT PROBLEMS / DEVELOPMENT STATUS

## 1. Major issue: Frontend 3D rendering performance

This is the **main current problem**.

The NZ terrain contains approximately:

```text
346,801 vertices
691,200 triangles
```

The current frontend approach can become extremely memory-heavy when the complete terrain geometry is loaded into the browser.

This can cause:

- high browser memory usage
- slow rendering
- slow camera movement
- large JavaScript/Three.js memory allocation
- possible browser instability
- unnecessary duplication of large geometry/data structures

### What should NOT be done immediately

Do not simply rebuild the entire terrain pipeline.

Do not immediately throw away the existing 346k-vertex terrain.

Do not rerun all LiDAR processing just to solve a frontend rendering problem.

### What should be investigated first

Inspect how the frontend currently:

```text
API response
      ↓
data conversion
      ↓
React state
      ↓
Three.js geometry
      ↓
GPU rendering
```

Then investigate:

- BufferGeometry
- indexed geometry
- geometry reuse
- React memoization
- avoiding large objects in React state
- resource disposal
- terrain chunking
- spatial tiling
- level of detail (LOD)
- progressive loading
- frustum-based loading
- server-side terrain chunks
- binary formats
- Web Workers where appropriate

The preferred solution is the **least invasive performance improvement that preserves visual quality**.

---

# 2. Frontend is not yet a complete Digital Twin

The current frontend is a working foundation, but the full Digital Twin experience still needs development.

Future UI capabilities include:

- building selection
- building information panel
- building height
- ground elevation
- roof elevation
- RGB information
- NDVI information
- terrain controls
- layer toggles
- vegetation visualization
- better camera/navigation
- measurement tools
- coordinate display
- additional urban layers

---

# 3. Large geospatial datasets

The repository contains several GB of large files.

Git LFS is already configured.

Do not remove Git LFS.

The following file types are tracked using LFS:

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

---

# 4. ML dataset is intentionally excluded

The ML dataset is approximately:

```text
27 GB
```

Location:

```text
ml/dataset/
```

It is intentionally excluded from Git.

**Never run `git add` in a way that causes this dataset to be committed.**

The project should work without committing this dataset.

ML dependencies are separate:

```text
ml/requirements.txt
```

---

# 5. Existing processed data should be preserved

Several outputs were expensive to generate.

Do not delete them unnecessarily.

Important baseline outputs include:

```text
terrain.vtp
terrain_fused.vtp
terrain_layers.vtp
building_points.vtp
building_mesh.vtp
building_fused.vtp
RGB_10m_epsg2193.tif
NDVI_10m_epsg2193.tif
```

When experimenting with new algorithms, prefer creating alternative output files rather than overwriting the baseline immediately.

---

# ⚠️ Sentinel-2 Processing Warning

The script:

```text
pipeline/process_sentinel2.py
```

should **not be run casually**.

Sentinel-2 processing has already been completed for the current baseline.

Use the existing processed outputs unless a task specifically requires regeneration.

---

# 🧪 Installation

## Clone repository

Because the project uses Git LFS:

```bash
git clone https://github.com/Vaibhavv526/3D-Visual-Mapping.git
cd 3D-Visual-Mapping
```

Install Git LFS:

```bash
git lfs install
git lfs pull
```

---

## Backend setup

Create a Python environment:

```bash
python3 -m venv myvenv
source myvenv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Inspect:

```text
backend/app/main.py
```

before choosing the Uvicorn module path.

A typical command may be:

```bash
uvicorn backend.app.main:app --reload
```

---

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

---

# 🔬 Validation

Backend syntax check:

```bash
python -m py_compile <changed_file.py>
```

Frontend:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

After major changes, verify the application manually.

---

# 🧠 Recommended Development Workflow

For every task:

```text
1. Read PROJECT_CONTEXT.md
        ↓
2. Inspect existing implementation
        ↓
3. Identify the smallest required change
        ↓
4. Implement
        ↓
5. Run validation
        ↓
6. Test the application
        ↓
7. Document what changed
```

Do not make unrelated changes.

---

# 🗺️ Development Roadmap

## Phase 1 — Current

### Stabilize frontend rendering

Priority:

**HIGH**

Goal:

Render the existing NZ terrain and buildings smoothly without excessive browser memory consumption.

---

## Phase 2 — Digital Twin interaction

Priority:

**HIGH**

Add:

- building selection
- building metadata
- layer controls
- RGB/NDVI display
- terrain controls

---

## Phase 3 — Geospatial visualization

Add:

- vegetation layer
- NDVI heatmap
- RGB visualization
- terrain analysis
- building highlighting
- coordinate tools
- measurements

---

## Phase 4 — Urban Digital Twin

Potentially add:

- roads
- infrastructure
- trees/vegetation objects
- additional structures
- semantic layers

---

## Phase 5 — Scalability

Potential future architecture:

```text
Large geospatial datasets
        ↓
Spatial tiling
        ↓
Chunked/binary data
        ↓
FastAPI / storage layer
        ↓
Progressive frontend loading
        ↓
Three.js Digital Twin
```

Only introduce this complexity when the MVP requires it.

---

# 🎯 Definition of a Successful MVP

The MVP should allow a user to:

1. Open the web application.
2. See the New Zealand terrain.
3. See the 3D buildings.
4. Navigate around the scene.
5. Select a building.
6. Inspect building attributes.
7. View RGB information.
8. View NDVI/vegetation information.
9. Toggle layers.
10. Use the application without severe browser memory/performance problems.

---

# 🤖 For AI Coding Agents

If this repository is opened in **Antigravity or another AI coding environment**, read:

```text
PROJECT_CONTEXT.md
```

first.

`PROJECT_CONTEXT.md` contains the detailed engineering handoff and AI instructions.

The README provides the project overview.

The context file provides the deeper implementation guidance.

### Most important instruction

> **Continue the existing project. Do not rebuild it from scratch.**

The current geospatial processing and data generation are valuable completed work.

The immediate engineering problem is **frontend 3D rendering performance**, followed by completion of the interactive Digital Twin experience.

---

# 📌 Project Status Summary

| Component | Status |
|---|---|
| NZ LiDAR integration | ✅ Complete |
| LiDAR preprocessing | ✅ Complete |
| Terrain generation | ✅ Complete |
| Building detection | ✅ Complete |
| Building mesh generation | ✅ Complete |
| Sentinel-2 integration | ✅ Complete |
| RGB generation | ✅ Complete |
| NDVI generation | ✅ Complete |
| CRS alignment | ✅ Complete |
| LiDAR + Sentinel-2 fusion | ✅ Complete |
| FastAPI backend | ✅ Working |
| NZ metadata API | ✅ Working |
| NZ terrain API | ✅ Working |
| NZ building API | ✅ Working |
| React frontend | 🟡 In development |
| Three.js visualization | 🟡 In development |
| Large terrain rendering | ⚠️ Performance issue |
| Building interaction UI | 🔜 Next |
| Layer controls | 🔜 Next |
| Full Digital Twin UX | 🔜 Future |
| Roads/infrastructure | 🔜 Future |
| Production scalability | 🔜 Future |

---

# 📄 Related Documentation

Primary AI handoff document:

```text
PROJECT_CONTEXT.md
```

Dependency files:

```text
requirements.txt
ml/requirements.txt
frontend/package.json
```

Git configuration:

```text
.gitignore
.gitattributes
```

---

# 👨‍💻 Handoff Note

This repository is an **active development baseline**, not a blank starter project.

The core geospatial work has already been completed.

The next developer/AI agent should focus on:

**understanding → optimizing → extending**

rather than:

**deleting → rebuilding → regenerating**.
