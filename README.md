# BhuVista

### LiDAR + Sentinel-2 based 3D Digital Twin and Property Intelligence Platform

BhuVista is an interactive 3D geospatial platform that combines LiDAR point-cloud data, terrain modelling, Sentinel-2 satellite imagery, building reconstruction, cadastral integration, 3D property identity, vertical property mapping, spatial analytics, machine learning, topology validation, human review, evidence tracking, and property reporting.

The current implementation focuses on a New Zealand Area of Interest around the Franklin District, Bombay Hills, and Ramarama area of South Auckland.

---

## 🚀 Project Overview

Traditional property systems primarily represent land and buildings through 2D maps, tables, and separate records.

BhuVista brings these datasets together inside an interactive 3D Digital Twin.

The platform connects:

* LiDAR-derived terrain
* 3D building geometry
* Sentinel-2 RGB imagery
* NDVI
* Cadastral parcels
* Property identity
* Vertical property structure
* Spatial relationships
* ML-based property screening
* Explainable analysis
* 3D topology validation
* Human review
* Evidence and provenance
* Property dossiers

> **Deep underneath. Simple on top.**

The platform hides complex geospatial processing behind a property-focused interface so users can explore buildings, inspect property information, perform measurements, review analytical results, and generate reports.

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
                 │        Sentinel-2         │
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
                    │ Cadastral Parcels   │
                    │ LINZ Primary Parcels│
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ 3D Property Identity│
                    │ + Property Registry │
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
                    │ Spatial Analysis    │
                    │ + ML Screening      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Explainable ML      │
                    │ + Topology Checks   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Human Review        │
                    │ + Evidence          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Property Dossier    │
                    │ + 3D Interactive UI │
                    └─────────────────────┘
```

---

# 🔄 End-to-End Workflow

```text
LINZ Parcel
     ↓
LiDAR Building
     ↓
3D Property ID
     ↓
Vertical Units
     ↓
Automated Analysis
     ↓
ML Screening
     ↓
Explainable ML
     ↓
3D Topology Validation
     ↓
Human Review
     ↓
Evidence & Provenance
     ↓
Property Dossier
```

---

# 🌍 Dataset

The current Digital Twin implementation uses real New Zealand LiDAR, Sentinel-2, and cadastral data.

### Study Area

```text
Franklin District
Bombay Hills
Ramarama
South Auckland, New Zealand
```

### LiDAR

```text
LiDAR points: 21,138,016
Tiles: 4 contiguous LAZ tiles
CRS: EPSG:2193
Vertical datum: NZVD2016
Study area: approximately 960 m × 1,440 m
```

---

# ⛰️ Terrain Model

Terrain generation uses LiDAR ground points to create a 2 m Digital Terrain Model.

```text
Vertices: 346,801
Triangles: 691,200
Grid resolution: 2 m
Elevation range: approximately 69.7 m to 155.8 m
Terrain relief: approximately 86.1 m
Mean elevation: approximately 108.3 m
```

The 3D viewer uses approximately 1.5× vertical exaggeration to improve visual interpretation of terrain variation.

### Available Terrain Views

* Elevation
* Slope
* Relative elevation
* Analytical hillshade
* RGB
* NDVI
* RGB + hillshade
* Buildings

---

# 🏢 3D Building Reconstruction

The current dataset contains:

```text
56 buildings
```

Building geometry is derived from classified LiDAR data and processed into 3D meshes.

Each building includes information such as:

* Building geometry
* Ground elevation
* Roof elevation
* Structural roof elevation
* Building height
* Estimated footprint
* Width
* Depth
* Centroid
* RGB
* NDVI
* Local ground elevation
* Local terrain context

Building bases are positioned using local terrain information to keep the 3D buildings aligned with the surrounding terrain.

---

# 🛰️ Sentinel-2 Integration

BhuVista integrates Sentinel-2 satellite imagery with the LiDAR-derived 3D model.

### Current Dataset

```text
Tile: T60HUD
Resolution: 10 m
Source CRS: EPSG:32760
Processed CRS: EPSG:2193
```

### Bands

```text
B02
B03
B04
B08
```

### Generated Products

```text
RGB
NDVI
```

The RGB layer uses display calibration for visualization.

NDVI provides vegetation and environmental context around properties.

---

# 🔗 LiDAR + Sentinel-2 Data Fusion

LiDAR and Sentinel-2 data are spatially aligned using EPSG:2193.

The fused building representation contains attributes such as:

```text
Building ID
Ground Elevation
Height
Roof Elevation
RGB
NDVI
```

This allows users to inspect structural building information alongside satellite-derived environmental information.

---

# 🏠 Property Intelligence

Selecting a building opens a property-level intelligence interface.

### Property Identity

* Building ID
* Project-defined 3D Property ID
* LINZ primary parcel
* Secondary or intersecting parcels
* Identity status
* Vertical unit IDs

### Geometry

* Centroid
* Estimated footprint
* Estimated width
* Estimated depth
* Estimated footprint area
* Bounding dimensions

### Elevation

* Ground elevation
* Roof elevation
* Structural roof elevation
* Building height
* Relative elevation
* Local terrain context

### Environmental Information

* LiDAR-derived structural information
* LiDAR point count
* Sentinel-2 RGB
* NDVI
* Vegetation interpretation

### Spatial Context

* Nearby buildings
* Local averages
* Height ranking
* Nearest building
* Building-to-building relationships

---

# 🆔 3D Property Identity

BhuVista connects cadastral parcels, buildings, and vertical units through a project-defined 3D property identity model.

```text
LINZ Parcel
     ↓
Building
     ↓
3D Property
     ↓
Vertical Units
```

Example:

```text
3DP-4734388-NZ-B035
```

Vertical units use the same property identity:

```text
3DP-4734388-NZ-B035-L01
3DP-4734388-NZ-B035-L02
3DP-4734388-NZ-B035-L03
3DP-4734388-NZ-B035-L04
```

The identity system supports:

* Building-linked property identities
* Vertical unit identities
* Multi-parcel buildings
* Multiple intersecting parcels
* Identity validation
* Vacant parcel handling

> Project-defined 3D Property IDs demonstrate a ULPIN-style workflow. They are not official ULPINs.

---

# 🗺️ Cadastral Integration

The platform integrates cadastral parcel information from the LINZ New Zealand Primary Parcels dataset.

```text
Dataset: LINZ NZ Primary Parcels
Layer: 50772
CRS: EPSG:2193
```

The workflow is:

```text
LINZ Parcel Data
       ↓
Parcel Geometry
       ↓
Building–Parcel Association
       ↓
3D Property Identity
       ↓
Vertical Property Mapping
```

The system supports:

* Parcel geometry
* Parcel boundaries
* Primary parcel identity
* Secondary parcels
* Building-to-parcel associations
* Occupied parcels
* Vacant parcels
* Multi-parcel buildings

The current processed dataset contains:

| Category               | Count |
| ---------------------- | ----: |
| Parcels within AOI     |    31 |
| Parcels with buildings |    14 |
| Vacant parcels         |    17 |
| Associated buildings   |    56 |
| Multi-parcel buildings |     1 |

---

# 🧱 Vertical Property Mapping

BhuVista provides an estimated vertical representation of buildings using LiDAR-derived structural information.

Supported properties include:

* Estimated floor count
* Vertical levels
* Vertical unit IDs
* Base elevation
* Top elevation
* Level height
* Estimated dimensions
* Height above building base
* Level-specific property information

Example:

```text
Building
   │
   ├── Level 01
   ├── Level 02
   ├── Level 03
   └── Level 04
```

Users can enter a dedicated vertical exploration mode and inspect estimated levels individually.

The default floor-height assumption is approximately:

```text
3.2 m / floor
```

This represents an analytical estimation parameter.

The generated levels are not:

* Architectural floor plans
* BIM models
* Interior building models
* Survey-certified floor boundaries
* Official cadastral floor units

---

# 📐 Spatial Analysis

BhuVista provides multiple spatial analysis tools.

### Site Analysis

A selected property can be evaluated using:

* Local ground elevation
* Local slope
* Relative elevation
* Nearby building count
* Nearest building distance
* Vegetation context
* Composite contextual indicators

### Local Comparison

Buildings can be compared using:

* Building height
* Estimated footprint
* Ground elevation
* Height ranking
* Nearest-neighbour relationships

### Building Measurements

The measurement system supports:

* Horizontal distance
* Ground elevation difference
* Building height difference
* 3D straight-line distance

### Spatial Queries

Buildings can be filtered using:

```text
All
Steep
Tall
High Context
Isolated
```

---

# 🌱 Environmental Intelligence

NDVI provides environmental context around buildings.

Current interpretation thresholds include:

| NDVI           | Interpretation          |
| -------------- | ----------------------- |
| `< 0.12`       | Impervious              |
| `0.12 to 0.22` | Built / Low Canopy      |
| `0.22 to 0.35` | Mixed / Canopy Overhang |
| `≥ 0.35`       | Vegetated               |

These categories are intended for contextual visualization rather than formal land-cover classification.

---

# 🤖 ML-Based Property Screening

BhuVista includes an unsupervised machine learning workflow for identifying structurally unusual buildings within the available LiDAR building population.

The current implementation uses a Mahalanobis-distance-based screening approach.

### Features

* Estimated floor count
* Building height
* Ground elevation
* Roof elevation
* Estimated footprint area
* Estimated width
* Estimated depth

### Screening Categories

```text
Typical
Moderately unusual
Highly unusual
```

These results are combined with deterministic validation into:

```text
NORMAL
REVIEW
PRIORITY REVIEW
```

### Current Screening Summary

| Status          | Count |
| --------------- | ----: |
| NORMAL          |    42 |
| REVIEW          |     8 |
| PRIORITY REVIEW |     6 |
| TOTAL           |    56 |

The ML system prioritizes properties for human inspection.

An unusual ML result does not establish that a property is unsafe, illegal, incorrect, fraudulent, or structurally defective.

---

# 🔍 Explainable ML

BhuVista provides property-level explanations for ML screening results.

The explanation uses leave-one-feature-out analysis.

The system removes one feature at a time and recalculates the anomaly score. The resulting score change estimates the contribution of each feature.

The interface provides:

* Top contributing features
* Contribution magnitude
* Direction relative to the dataset mean
* Property-specific explanations

---

# 🧩 3D Topology Validation

The platform performs internal consistency checks across the 3D property model.

### Geometry Validation

* Building geometry
* Bounding dimensions
* Building association state

### Vertical Validation

* Floor index continuity
* Level labels
* Base and top ordering
* Upward progression
* Level overlap
* Vertical unit IDs
* Structural roof alignment

### Identity Validation

* Project-defined property ID format
* Vertical unit ID format
* Identity chain consistency

### Validation States

```text
VALID
WARNING
ERROR
UNAVAILABLE
```

These checks represent internal 3D property consistency validation.

---

# 👤 Human Review

BhuVista includes a human-in-the-loop review workflow.

Automated screening identifies properties requiring attention, while human review provides the operational review state.

### Review States

```text
UNREVIEWED
IN REVIEW
REVIEWED
```

Users can:

* Start Review
* Add reviewer notes
* Mark Reviewed
* Reopen Review
* View review history

Review actions do not modify the underlying ML screening result.

---

# 🧾 Evidence & Provenance

The platform distinguishes between source information and derived information.

### Source Information

Examples include:

* LINZ cadastral data
* LiDAR
* Digital Terrain Model
* Sentinel-2
* Dataset metadata

### Derived Information

Examples include:

* Building measurements
* Vertical structure
* Spatial analysis
* ML screening
* Explainable ML
* Topology validation

This separation helps users understand where each property-level result originated.

---

# ⏳ Temporal Intelligence

The platform includes a temporal intelligence framework.

The currently available New Zealand dataset represents the current observation.

Historical reference data is not included in the current dataset.

Therefore:

* Current observations are supported
* Historical observations are not fabricated
* Historical deltas are unavailable
* Change detection requires comparable historical data

---

# 📋 Property Registry

The Property Registry provides a searchable index of property records.

Users can search by:

* Building ID
* LINZ parcel ID
* Project-defined 3D Property ID
* Vertical unit ID

Example:

```text
3DP-4734388-NZ-B035-L02
```

### Registry Filters

```text
All
Normal
Review
Priority
Multi-parcel
Vacant
```

Vacant parcels are represented without fabricated building identities.

---

# 📝 Review Queue

The Review Queue provides an operational view of properties requiring attention.

Each review item can contain:

* Building ID
* Primary parcel
* Project-defined 3D Property ID
* Secondary parcels
* ML screening status
* Human review status
* Topology status
* ML explanation
* Property actions

---

# 📄 Property Dossier

BhuVista supports client-side generation of property-level PDF dossiers.

A dossier can include:

### Property Identity

* Project-defined 3D Property ID
* LINZ primary parcel
* Building ID
* Vertical unit IDs

### Geometry

* Footprint
* Width
* Depth
* Area
* Centroid

### Elevation

* Ground elevation
* Roof elevation
* Building height
* Structural roof information

### Environmental Information

* LiDAR information
* RGB
* NDVI
* Terrain context

### Local Comparison

* Local building statistics
* Relative property measurements

### Measurements

* Horizontal distance
* Elevation difference
* Height difference
* 3D distance

### ML Analysis

* Screening classification
* Anomaly score
* Feature contributions

### Topology

* Internal validation results

### Human Review

* Review state
* Reviewer notes
* Review history

### Evidence & Provenance

* Data sources
* Derived information
* Supporting evidence

---

# ⚡ Backend Performance

The backend includes caching and response optimization for large terrain and building payloads.

The implementation includes:

* In-memory terrain caching
* In-memory building caching
* Pre-serialized JSON responses
* GZip-compressed responses
* FastAPI startup cache warming
* Cache invalidation after relevant processing

---

# 🖥️ Technology Stack

## Frontend

* React
* TypeScript
* Vite
* Three.js
* React Three Fiber
* Drei
* Axios

## Backend

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

## Geospatial Data

* LiDAR LAZ
* Sentinel-2
* LINZ Primary Parcels
* Digital Terrain Model
* 3D building meshes

---

# 🔌 API

The FastAPI backend provides NZ-specific services including:

```text
/api/nz/metadata
/api/nz/terrain
/api/nz/buildings
/api/nz/parcels
/api/nz/ml/buildings
/api/nz/review/buildings
```

Review persistence is handled through review-specific endpoints implemented in `api.py`.

---

# 🗂️ Project Structure

```text
3D-Visual-Mapping/
│
├── api.py
├── requirements.txt
├── PROJECT_CONTEXT.md
├── .gitignore
├── .gitattributes
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── NZDigitalTwin/
│   │   ├── services/
│   │   │   ├── nzApi.ts
│   │   │   ├── propertyIdentity.ts
│   │   │   ├── topologyValidation.ts
│   │   │   ├── temporalChange.ts
│   │   │   ├── evidence.ts
│   │   │   └── dossierPdf.ts
│   │   └── App.tsx
│   └── package.json
│
├── pipeline/
│   ├── acquire_linz_parcels.py
│   ├── process_nz_parcels.py
│   ├── vertical_structure.py
│   └── ...
│
├── data/
│   ├── inputs/
│   │   └── parcels/
│   └── outputs/
│       └── nz_lidar/
│
└── README.md
```

---

# 📦 Important Generated Data

### Terrain and Building Outputs

```text
data/outputs/nz_lidar/terrain.vtp
data/outputs/nz_lidar/terrain_fused.vtp
data/outputs/nz_lidar/terrain_layers.vtp
data/outputs/nz_lidar/building_points.vtp
data/outputs/nz_lidar/building_mesh.vtp
data/outputs/nz_lidar/building_fused.vtp
```

### Sentinel-2 Outputs

```text
data/outputs/nz_lidar/sentinel2/B02_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/B03_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/B04_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/B08_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/RGB_10m_epsg2193.tif
data/outputs/nz_lidar/sentinel2/NDVI_10m_epsg2193.tif
```

---

# 🧪 Installation

## 1. Clone the Repository

```bash
git clone https://github.com/Vaibhavv526/3D-Visual-Mapping.git
cd 3D-Visual-Mapping
```

The repository uses Git LFS for large files.

```bash
git lfs install
git lfs pull
```

---

## 2. Backend Setup

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
python -m uvicorn api:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

---

## 3. Frontend Setup

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

The acquisition script is:

```text
pipeline/acquire_linz_parcels.py
```

The script requests the NZ Primary Parcels dataset for the project's existing Area of Interest.

---

# 🧠 ML Architecture

The current structural screening system uses a Mahalanobis-distance-based approach.

The feature vector contains:

```text
Estimated floors
Height
Ground elevation
Roof elevation
Footprint area
Footprint width
Footprint depth
```

The model compares each building against the available NZ building population.

Explainability uses leave-one-feature-out analysis.

---

# 🧪 Testing

### Backend Syntax

```powershell
python -m py_compile api.py pipeline/vertical_structure.py
```

### Frontend Build

```powershell
cd frontend
npm run build
```

### Lint

```powershell
npm run lint
```

Important workflows to verify after major changes:

* 3D rendering
* Building selection
* Building focus
* Terrain layers
* Cadastral parcel display
* Property identity
* Property Registry
* Vertical exploration
* Vertical unit search
* Spatial measurements
* Spatial queries
* ML screening
* Explainable ML
* Topology validation
* Human review
* Evidence and provenance
* PDF generation

---

# 📊 Current Dataset Summary

| Category                 |            Value |
| ------------------------ | ---------------: |
| LiDAR points             |       21,138,016 |
| LiDAR tiles              |                4 |
| Buildings                |               56 |
| Terrain vertices         |          346,801 |
| Terrain triangles        |          691,200 |
| DTM resolution           |              2 m |
| Study extent             | ~960 m × 1,440 m |
| Survey area              |        ~138.2 ha |
| CRS                      |        EPSG:2193 |
| LINZ parcels             |               31 |
| Parcels with buildings   |               14 |
| Vacant parcels           |               17 |
| Multi-parcel buildings   |                1 |
| Generated vertical units |              104 |
| Sentinel-2 tile          |           T60HUD |
| Sentinel-2 resolution    |             10 m |

---

# 🎯 Project Workflow

```text
                    BhuVista
                       │
                       ▼
              ┌─────────────────┐
              │  3D Digital Twin│
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
     Terrain       Buildings       Parcels
        │              │              │
        └──────────────┼──────────────┘
                       ▼
              Property Identity
                       │
                       ▼
             Vertical Properties
                       │
                       ▼
              Spatial Intelligence
                       │
              ┌────────┴────────┐
              ▼                 ▼
          ML Screening      Measurements
              │                 │
              ▼                 │
        Explainable ML          │
              │                 │
              └────────┬────────┘
                       ▼
               Topology Checks
                       │
                       ▼
                 Human Review
                       │
                       ▼
             Evidence & Provenance
                       │
                       ▼
               Property Dossier
```

---

# 🎯 SIH Relevance

BhuVista demonstrates a 3D geospatial workflow for property identification and vertical property mapping.

The platform connects:

```text
LiDAR
  ↓
3D Terrain + Buildings
  ↓
Cadastral Parcels
  ↓
3D Property Identity
  ↓
Vertical Property Mapping
  ↓
Spatial Intelligence
  ↓
ML Screening
  ↓
Explainable Analysis
  ↓
3D Topology Validation
  ↓
Human Review
  ↓
Evidence
  ↓
Property Dossier
```

This approach moves beyond conventional 2D mapping by connecting geospatial geometry with property identity, vertical structure, cadastral context, spatial analysis, automated screening, validation, human review, and reporting.

---

# ⚠️ Limitations

### LiDAR-Derived Vertical Structure

Vertical levels are estimates based on available LiDAR-derived structural information.

They are not architectural floor plans, BIM models, interior building models, survey-certified floor boundaries, or official cadastral floor units.

### Property Identity

Project-defined 3D Property IDs demonstrate a ULPIN-style workflow.

They are not official legal ULPINs.

### Cadastral Data

Cadastral information comes from the LINZ Primary Parcels dataset.

The system performs spatial associations and internal checks. It does not establish legal ownership, legal title, legal parcel boundaries, or regulatory compliance.

### Machine Learning

The ML system provides dataset-relative screening.

It does not determine structural safety, legal status, ownership, regulatory compliance, or building correctness.

### Temporal Analysis

Historical reference data is not included in the current dataset.

Historical change detection therefore requires comparable historical data.

### Dataset Scope

The current implementation uses a specific New Zealand dataset.

Applying the workflow to another region requires suitable geospatial, cadastral, satellite, and elevation datasets.

---

# 📄 Documentation

Important project documentation includes:

```text
PROJECT_CONTEXT.md
requirements.txt
ml/requirements.txt
frontend/package.json
.gitignore
.gitattributes
```

---

# ⚖️ Disclaimer

BhuVista is a geospatial visualization, property intelligence, and analytical prototype.

LiDAR-derived building heights and vertical levels are estimates based on available spatial data.

Machine learning outputs support screening and human review. An unusual result does not establish that a property is unsafe, illegal, incorrect, fraudulent, or defective.

Cadastral and property-related conclusions require authoritative data and appropriate verification.

Project-defined 3D property identifiers demonstrate a ULPIN-style workflow and should not be interpreted as official legal ULPINs.
