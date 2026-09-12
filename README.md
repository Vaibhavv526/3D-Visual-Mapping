# 3D Visual Mapping

> LiDAR + Sentinel-2 based 3D Digital Twin and Property Intelligence Platform

3D Visual Mapping is a geospatial 3D Digital Twin platform that combines LiDAR point-cloud data, terrain modelling, Sentinel-2 satellite imagery, building reconstruction, spatial analytics, property intelligence, machine learning, and human review into an interactive 3D environment.

The current implementation focuses on a New Zealand Area of Interest (AOI) and provides an end-to-end workflow from geospatial data processing to 3D property analysis and human-in-the-loop review.

---

## 🚀 Project Vision

The long-term goal is to build an intelligent 3D geospatial platform that transforms conventional 2D spatial information into an interactive property-aware Digital Twin.

Instead of only showing where a property exists, the platform combines:

- Terrain
- Buildings
- Elevation
- Building height
- Vertical structure
- Satellite-derived RGB
- NDVI
- Spatial relationships
- Property identity
- Cadastral relationships
- 3D validation
- Machine learning-based screening
- Human review
- Analytical reporting

The intended experience is a modern interactive 3D map where users can explore an area, select individual properties, understand their spatial characteristics, identify unusual structures, and review them directly in the 3D environment.

---

# 🧩 System Architecture

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
        │ Terrain Model   │         │ Building Model  │
        │ 2 m DTM         │         │ 56 Buildings    │
        └────────┬────────┘         └────────┬────────┘
                 │                           │
                 │        Sentinel-2          │
                 │       Satellite Data      │
                 │              │            │
                 │              ▼            │
                 │       RGB + NDVI          │
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
                    │ Property Intelligence│
                    │ + 3D Identity       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Vertical Property   │
                    │ Mapping             │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Validation + ML      │
                    │ Property Screening   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Human Review         │
                    │ Workflow             │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ React + Three.js     │
                    │ Interactive 3D UI   │
                    └─────────────────────┘
````

---

# 🌍 New Zealand Dataset

The current primary Digital Twin implementation uses real New Zealand LiDAR and Sentinel-2 data.

The study area is located around the Franklin District / Bombay Hills / Ramarama area of South Auckland, New Zealand.

## LiDAR

Four contiguous LAZ tiles are currently used.

Total LiDAR point count:

```text
21,138,016 points
```

Coordinate Reference System:

```text
EPSG:2193
NZTM2000
```

Vertical datum:

```text
NZVD2016
```

Study area:

```text
Approximately 960 m × 1,440 m
```

---

# ⛰️ Terrain Model

Terrain generation is based on the LiDAR ground data using a 2 m Digital Terrain Model (DTM).

Current terrain:

```text
Vertices: 346,801
Triangles: 691,200
Grid resolution: 2 m
```

Terrain statistics:

```text
Elevation: approximately 69.7 m – 155.8 m
Terrain relief: approximately 86.1 m
Mean elevation: approximately 108.3 m
```

The 3D viewer uses approximately 1.5× vertical exaggeration to make terrain variation easier to interpret visually.

## Terrain Views

The interactive viewer provides:

* Elevation
* Slope
* Relative elevation
* Analytical hillshade
* RGB
* NDVI
* RGB + hillshade

---

# 🏢 Building Reconstruction

The current dataset contains:

```text
56 buildings
```

Building geometry is derived from classified LiDAR data and processed into 3D meshes.

The building representation includes:

* Building geometry
* Ground elevation
* Roof elevation
* Building height
* Estimated footprint
* Width
* Depth
* Centroid
* RGB
* NDVI
* Local ground elevation
* Local terrain context

The building positioning system uses local terrain information to keep building bases aligned with the surrounding terrain.

---

# 🛰️ Sentinel-2 Integration

The New Zealand workflow integrates Sentinel-2 satellite imagery alongside the LiDAR-derived 3D model.

Current Sentinel-2 tile:

```text
T60HUD
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

Processed outputs include:

```text
RGB
NDVI
```

and building-level RGB and NDVI attributes.

NDVI provides environmental and vegetation context around properties.

The RGB visualization applies display calibration to Sentinel-2 surface reflectance values. This is a visualization adjustment and should not be interpreted as atmospheric correction.

---

# 🔗 LiDAR + Sentinel-2 Fusion

The LiDAR and Sentinel-2 datasets are spatially aligned using the common EPSG:2193 coordinate system.

The fused building representation provides attributes including:

```text
Building ID
Ground Elevation
Height
Roof Elevation
RGB
NDVI
```

This allows geometric building information to be viewed alongside satellite-derived environmental information.

---

# 🏠 Property Intelligence

Selecting a building opens a property-level intelligence interface.

## Property

* Building ID
* Project-defined 3D property identity
* Centroid
* Estimated footprint
* Estimated width
* Estimated depth
* Estimated footprint area

## Elevation

* Ground elevation
* Roof elevation
* Building height
* Relative elevation
* Local terrain context

## LiDAR / Environment

* LiDAR-derived structural information
* Sentinel-2 RGB
* NDVI
* Vegetation interpretation

## Spatial Context

* Nearby buildings
* Local averages
* Height ranking
* Nearest building
* Building-to-building relationships

---

# 🧱 Vertical Property Mapping

The platform provides an estimated vertical representation of buildings.

For supported buildings, the system generates:

* Estimated floor count
* Vertical levels
* Level IDs
* Base elevation
* Top elevation
* Level height
* Estimated dimensions
* Height above building base
* Level-specific property information

Users can enter a dedicated exploration mode where estimated levels are separated vertically in 3D.

```text
Building
   │
   ├── Level 01
   ├── Level 02
   ├── Level 03
   └── Level 04
```

Vertical levels are derived from LiDAR-based structural estimation.

They are not architectural floor plans, BIM models, interior building models, or survey-certified floor boundaries.

Each vertical level is explicitly described as:

```text
Estimated · LiDAR-derived
```

The current default floor-height assumption is approximately:

```text
3.2 m / floor
```

This is an analytical estimation parameter and not a claim about the actual architectural floor height.

---

# 🆔 3D Property Identity

The project introduces a project-defined 3D property identity model that connects spatial building geometry with property-level information.

The identity chain is:

```text
Cadastral Parcel
       │
       ▼
3D Property Identity
       │
       ▼
Building
       │
       ▼
Vertical Structure
       │
       ▼
Vertical Units
```

The identity system supports:

* Building-linked property identities
* Vertical unit identities
* Multi-parcel buildings
* Unassociated buildings
* Preservation of all intersecting parcels

Project-defined identifiers are deterministic and intended for the Digital Twin workflow.

They are not claimed to be official legal ULPINs.

---

# 🗺️ Cadastral Integration

The platform includes a cadastral integration workflow designed around the LINZ New Zealand Primary Parcels dataset.

Target dataset:

```text
LINZ NZ Primary Parcels
Layer: 50772
CRS: EPSG:2193
```

The intended workflow is:

```text
LINZ Parcel Data
       ↓
Parcel Geometry
       ↓
Building–Parcel Spatial Association
       ↓
3D Property Identity
       ↓
Vertical Property Mapping
```

Building-to-parcel relationships can be classified as:

* Centroid contained
* Footprint intersection
* Multi-parcel association
* Unassociated building

The system does not fabricate parcel information when authoritative cadastral data is unavailable.

Cadastral availability is therefore explicitly represented rather than replaced with synthetic data.

The cadastral acquisition pipeline is:

```text
pipeline/acquire_linz_parcels.py
```

The current implementation requires access to the LINZ Data Service for authoritative parcel acquisition.

---

# 📐 Spatial Analysis

The platform provides several spatial analysis tools.

## Local Comparison

A selected building can be compared against nearby buildings using:

* Building height
* Estimated footprint
* Ground elevation
* Height ranking
* Nearest-neighbour relationships

The comparison is contextual and does not represent zoning or legal property analysis.

---

## Building Measurements

The measurement system supports:

* Horizontal distance
* Ground elevation difference
* Building height difference
* 3D straight-line distance

Measurements can be performed between buildings while preserving the normal 3D navigation workflow.

---

## Spatial Queries

Buildings can be filtered using analytical categories such as:

```text
All
Steep
Tall
High Context
Isolated
```

These filters allow users to quickly identify properties with particular spatial characteristics.

---

# 🌱 Environmental Intelligence

NDVI is used to provide broad environmental context around buildings.

Current interpretation thresholds include:

```text
< 0.12       Impervious
0.12 – 0.22  Built / Low Canopy
0.22 – 0.35  Mixed / Canopy Overhang
≥ 0.35       Vegetated
```

These classifications are intended for contextual visualization and are not formal land-cover classifications.

---

# 🔍 3D Property Validation

The platform performs deterministic spatial and structural validation across the 3D property model.

Validation covers areas such as:

* Building geometry
* Vertical structure
* Property identity
* Cadastral relationships when available
* Spatial consistency

The validation workflow distinguishes between genuine geometry issues and limitations caused by LiDAR-derived estimation.

For example, moderate vertical consistency can represent uncertainty in estimated vertical structure rather than a genuine geometric failure.

Cadastral data being unavailable is treated as a data availability state and does not automatically create a validation failure.

---

# 🤖 ML-Based Property Screening

The platform includes a lightweight unsupervised machine learning workflow for identifying structurally unusual buildings within the available NZ LiDAR population.

The current implementation uses a Mahalanobis-distance-based structural screening approach.

Structural features include:

* Estimated floor count
* Building height
* Ground elevation
* Roof elevation
* Estimated footprint area
* Estimated width
* Estimated depth

The ML system produces classifications:

```text
Typical
Moderately unusual
Highly unusual
```

These are then combined with deterministic validation into screening statuses:

```text
NORMAL
REVIEW
PRIORITY REVIEW
```

## Current Screening Summary

For all 56 buildings:

| Screening Status | Count |
| ---------------- | ----: |
| NORMAL           |    42 |
| REVIEW           |     8 |
| PRIORITY REVIEW  |     6 |
| TOTAL            |    56 |

The purpose of ML screening is to prioritize properties for human inspection.

An unusual ML result does not mean that a building is:

* Unsafe
* Illegal
* Incorrect
* Fraudulent
* Structurally defective

The ML output is a relative analytical signal based on the available dataset.

---

# 👤 Human Review Workflow

Properties identified by the screening system can be passed into a human-in-the-loop review workflow.

The system separates analytical screening from human review state.

## Screening Status

```text
NORMAL
REVIEW
PRIORITY REVIEW
```

## Human Review State

```text
UNREVIEWED
IN REVIEW
REVIEWED
```

The review workflow provides:

* Review queue
* Priority-first ordering
* Building focus
* Screening reason
* ML deviation
* Validation information
* Start Review
* Mark Reviewed
* Reopen Review
* Optional reviewer notes
* Dynamic review counters

Selecting a property from the review queue focuses the corresponding building in the 3D scene.

Review actions do not alter the underlying screening result.

The current prototype stores review state and notes client-side, so they are not persistent after a page refresh.

---

# 📄 Property Intelligence Reports

The platform supports client-side generation of property dossier PDFs.

Reports can include:

* Property identification
* Building geometry
* Elevation
* LiDAR/environment information
* Local comparison
* Measurements
* Screening information
* Data notes
* Analytical disclosures

Reports are intended as analytical outputs from the Digital Twin and are not legal property documents.

---

# ⚡ Backend Performance

The backend includes a caching and response optimization layer for the large NZ terrain and building payloads.

The implementation includes:

* In-memory terrain caching
* In-memory building caching
* Pre-serialized JSON responses
* GZip-compressed responses
* FastAPI startup cache warming
* Cache invalidation after relevant processing

The optimization substantially reduces repeated processing and response size while preserving the existing geospatial data contract.

---

# 🖥️ Backend

The backend uses:

* Python
* FastAPI
* Uvicorn
* PyVista
* VTK
* NumPy
* Laspy
* Lazrs
* PyProj
* Rasterio
* SciPy
* Shapely

Main dependency file:

```text
requirements.txt
```

---

# 🔌 API

The FastAPI backend provides NZ-specific endpoints including:

```text
/api/nz/metadata
/api/nz/terrain
/api/nz/buildings
/api/nz/parcels
/api/nz/ml/buildings
/api/nz/review/buildings
```

These endpoints provide the data required by the interactive Digital Twin.

Before changing an API response format, inspect the corresponding frontend API service to preserve the existing data contract.

---

# 🎨 Frontend

The frontend uses:

* React
* TypeScript
* Vite
* Three.js
* @react-three/fiber
* @react-three/drei
* Axios

The main Digital Twin interface provides:

* Interactive 3D terrain
* Building selection
* Property Intelligence
* Area Intelligence
* Terrain layer controls
* Vertical building exploration
* Spatial measurements
* Spatial queries
* ML screening
* Human review
* PDF reporting

---

# 🗂️ Repository Structure

```text
3D-Visual-Mapping/
│
├── backend/
│   └── app/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── NZDigitalTwin/
│   │   ├── services/
│   │   │   └── nzApi.ts
│   │   └── App.tsx
│   ├── public/
│   └── package.json
│
├── pipeline/
│   ├── acquire_linz_parcels.py
│   ├── process_nz_parcels.py
│   ├── vertical_structure.py
│   ├── LiDAR processing scripts
│   ├── Sentinel-2 processing scripts
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
├── lidar_data/
│
├── ml/
│   ├── dataset/
│   └── requirements.txt
│
├── requirements.txt
├── .gitignore
├── .gitattributes
├── PROJECT_CONTEXT.md
└── README.md
```

---

# 📦 Important Generated Data

Important NZ outputs include:

```text
data/outputs/nz_lidar/terrain.vtp
data/outputs/nz_lidar/terrain_fused.vtp
data/outputs/nz_lidar/terrain_layers.vtp
data/outputs/nz_lidar/building_points.vtp
data/outputs/nz_lidar/building_mesh.vtp
data/outputs/nz_lidar/building_fused.vtp
```

Sentinel-2 outputs include:

```text
data/outputs/nz_lidar/sentinel2/B02_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/B03_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/B04_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/B08_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/RGB_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/NDVI_10m_epsg2193.tif
```

These outputs represent expensive geospatial processing work and should not be regenerated unnecessarily.

---

# 🧪 Setup

## Clone the Repository

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

## Backend Setup

Create a Python virtual environment.

### Windows PowerShell

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Start the backend:

```powershell
.venv\Scripts\uvicorn api:app --port 8000 --host 0.0.0.0
```

Backend:

```text
http://127.0.0.1:8000
```

---

## Frontend Setup

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend is normally available at:

```text
http://localhost:5173
```

---

# 🔐 LINZ API Configuration

The cadastral acquisition pipeline uses a LINZ Data Service API key.

The key should never be committed to Git.

The acquisition script:

```text
pipeline/acquire_linz_parcels.py
```

requests the NZ Primary Parcels dataset for the project's existing AOI.

The API key can be supplied through the environment or entered interactively by the acquisition script.

---

# 🧠 ML Dataset

The repository may use a large ML dataset during development.

The ML dataset is intentionally excluded from Git.

If present:

```text
ml/dataset/
```

Do not use `git add` in a way that accidentally stages the dataset.

---

# 🗃️ Git LFS

The project uses Git LFS for large geospatial and machine-learning related files.

Tracked file types include:

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

Do not remove Git LFS configuration.

---

# 🧪 Validation & Testing

## Backend Syntax

```powershell
python -m py_compile api.py pipeline/vertical_structure.py
```

## Frontend Build

```powershell
cd frontend
npm run build
```

## Lint

```powershell
npm run lint
```

After significant changes, manually verify:

* 3D rendering
* Building selection
* Terrain layers
* Vertical exploration
* Spatial measurements
* Spatial queries
* Property intelligence
* ML screening
* Human review workflow
* PDF generation
* Browser console

---

# 🔄 Development Workflow

For every development task:

```text
1. Read PROJECT_CONTEXT.md
        ↓
2. Inspect the existing implementation
        ↓
3. Understand the current data flow
        ↓
4. Identify the smallest required change
        ↓
5. Implement
        ↓
6. Run validation
        ↓
7. Test the application
        ↓
8. Review git status
        ↓
9. Commit and push after successful verification
```

Do not make unrelated changes.

Do not regenerate expensive geospatial outputs unnecessarily.

Do not fabricate geospatial, cadastral, property, or ML results.

Do not commit API keys or excluded datasets.

---

# 🎯 Current Project Status

| Component                       | Status                     |
| ------------------------------- | -------------------------- |
| NZ LiDAR integration            | ✅ Complete                 |
| LiDAR preprocessing             | ✅ Complete                 |
| 2 m terrain generation          | ✅ Complete                 |
| Building extraction             | ✅ Complete                 |
| Building mesh generation        | ✅ Complete                 |
| Sentinel-2 integration          | ✅ Complete                 |
| RGB generation                  | ✅ Complete                 |
| NDVI generation                 | ✅ Complete                 |
| LiDAR + Sentinel-2 fusion       | ✅ Complete                 |
| FastAPI backend                 | ✅ Working                  |
| Terrain API                     | ✅ Working                  |
| Building API                    | ✅ Working                  |
| Property Intelligence           | ✅ Complete                 |
| Area Intelligence               | ✅ Complete                 |
| Terrain analytics               | ✅ Complete                 |
| Spatial comparison              | ✅ Complete                 |
| Measurement tools               | ✅ Complete                 |
| Spatial queries                 | ✅ Complete                 |
| Vertical property model         | ✅ Complete                 |
| 3D level exploration            | ✅ Complete                 |
| 3D property identity            | ✅ Complete                 |
| 3D topology / validation        | ✅ Complete                 |
| ML property screening           | ✅ Complete                 |
| Human review workflow           | ✅ Complete                 |
| Property dossier PDF            | ✅ Complete                 |
| LINZ cadastral pipeline         | 🟡 Integration in progress |
| Authoritative cadastral data    | 🟡 Pending acquisition     |
| Persistent review storage       | 🔜 Future                  |
| Broader geographic coverage     | 🔜 Future                  |
| Additional urban infrastructure | 🔜 Future                  |

---

# 🧭 Development Roadmap

## Authoritative Cadastral Integration

Complete the LINZ parcel acquisition and integrate the resulting parcel geometry with the existing 3D building model.

Goals:

* Retrieve authoritative parcel geometry
* Associate buildings with parcels
* Display parcel boundaries
* Connect parcel identity with project-defined 3D property identity
* Preserve multi-parcel relationships

---

## Persistent Human Review

Move review states and reviewer notes from client-side prototype state to persistent storage.

Potential future architecture:

```text
React Review UI
       ↓
FastAPI
       ↓
Persistent Storage
       ↓
Review History
```

---

## Richer Vertical Property Data

Improve vertical property representation where richer source data becomes available.

Potential sources include:

* Building plans
* BIM
* Architectural datasets
* Additional LiDAR information
* Other authoritative 3D building sources

---

## Expanded Digital Twin

Potential future layers include:

* Roads
* Infrastructure
* Vegetation objects
* Additional structures
* Urban context
* Additional authoritative geospatial datasets

---

## Scalability

Potential future architecture for larger geographic areas:

```text
Large Geospatial Dataset
        ↓
Spatial Tiling
        ↓
Chunked / Binary Data
        ↓
FastAPI / Data Layer
        ↓
Progressive Loading
        ↓
Three.js Digital Twin
```

---

# 🎯 SIH Relevance

The project is designed around the broader objective of 3D property identification and vertical property mapping.

The current workflow combines:

```text
LiDAR
  ↓
3D Terrain + Buildings
  ↓
Property Intelligence
  ↓
Vertical Property Mapping
  ↓
Property Identity
  ↓
Spatial Validation
  ↓
ML Screening
  ↓
Human Review
  ↓
Analytical Reporting
```

This moves beyond conventional 2D mapping by connecting geospatial geometry with property-level intelligence, vertical structure, validation, machine learning, and human review.

The architecture also provides a path toward authoritative cadastral integration without replacing the existing 3D geospatial model.

---

# ⚠️ Current Limitations

## LiDAR-Derived Vertical Structure

Vertical levels are estimated from available LiDAR-derived geometry.

They are not:

* Architectural floor plans
* BIM models
* Interior building models
* Survey-certified floor boundaries

---

## ML Screening

The ML system is relative to the available NZ LiDAR building population.

It is a screening and prioritization mechanism, not a universal building classifier.

It does not determine:

* Structural safety
* Legal status
* Property ownership
* Regulatory compliance
* Building correctness

---

## Cadastral Data

Cadastral information depends on successful acquisition of authoritative external data.

The system does not fabricate cadastral parcels when they are unavailable.

---

## Property Identity

Project-defined 3D property IDs are not official legal ULPINs.

---

## Human Review

Review state and notes are currently client-side prototype data.

They are not persistent after a page refresh.

---

# 📄 Documentation

Primary engineering handoff:

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

# ⚖️ Disclaimer

This project is a geospatial visualization and analytical prototype.

LiDAR-derived building heights and vertical levels are estimates based on available spatial data.

Machine learning outputs are intended to support human review and prioritization. An unusual result does not imply that a property or building is incorrect, unsafe, illegal, fraudulent, or defective.

Cadastral and property-related conclusions require authoritative data and appropriate verification.

Project-defined property identifiers should not be interpreted as official legal ULPINs.

---
