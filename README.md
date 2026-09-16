# 3D Visual Mapping

> LiDAR + Sentinel-2 based 3D Digital Twin and Property Intelligence Platform

3D Visual Mapping is a geospatial 3D Digital Twin platform that combines LiDAR point-cloud data, terrain modelling, Sentinel-2 satellite imagery, building reconstruction, cadastral integration, 3D property identity, vertical property mapping, spatial analytics, machine learning, topology validation, human review, evidence tracking, and analytical reporting into an interactive 3D environment.

The current implementation focuses on a New Zealand Area of Interest (AOI) and provides an end-to-end workflow from geospatial data processing to 3D property analysis, automated screening, human review, and property dossier generation.

---

## 🚀 Project Vision

The long-term goal is to build an intelligent 3D geospatial platform that transforms conventional 2D spatial information into an interactive property-aware Digital Twin.

Instead of only showing where a property exists, the platform connects:

- Terrain
- Buildings
- LiDAR-derived elevation
- Building geometry
- Vertical property structure
- Sentinel-2 RGB
- NDVI
- Cadastral parcels
- Property identity
- Spatial relationships
- 3D topology validation
- Machine learning screening
- Explainable analysis
- Human review
- Evidence and provenance
- Analytical reporting

The intended experience is a modern interactive 3D environment where users can explore an area, identify properties, understand their cadastral relationships, inspect estimated vertical structures, analyze spatial and structural characteristics, identify unusual properties, review supporting evidence, and generate a property dossier.

> **Deep underneath. Simple on top.**

The underlying platform combines complex geospatial, cadastral, LiDAR, analytical and review workflows while keeping the user-facing workflow property-centric and understandable.

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
````

---

# 🔄 End-to-End Property Workflow

The current system connects the major property intelligence stages into a single workflow:

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

Each stage uses the existing spatial and property information rather than creating an isolated analytical layer.

---

# 🌍 New Zealand Dataset

The current primary Digital Twin implementation uses real New Zealand LiDAR, Sentinel-2 and cadastral data.

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

Terrain generation is based on LiDAR ground data using a 2 m Digital Terrain Model (DTM).

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
* Buildings

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

## Property Identity

* Building ID
* Project-defined 3D Property ID
* LINZ primary parcel
* Secondary/intersecting parcels
* Identity status
* Vertical unit IDs

## Geometry

* Centroid
* Estimated footprint
* Estimated width
* Estimated depth
* Estimated footprint area
* Bounding dimensions

## Elevation

* Ground elevation
* Roof elevation
* Structural roof elevation
* Building height
* Relative elevation
* Local terrain context

## LiDAR / Environment

* LiDAR-derived structural information
* LiDAR point count
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

# 🆔 3D Property Identity

The platform provides a project-defined 3D property identity model connecting cadastral parcels, buildings and vertical units.

The identity chain is:

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

The project-defined 3D Property ID is generated deterministically from the primary parcel and building identity.

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

Vacant parcels do not receive fabricated building or 3D property identities.

> **Important:** These are project-defined 3D property identifiers for demonstrating a ULPIN-style workflow. They are not official ULPINs.

---

# 🗺️ Cadastral Integration

The platform integrates cadastral parcel information from the LINZ New Zealand Primary Parcels dataset.

Target dataset:

```text
LINZ NZ Primary Parcels
Layer: 50772
CRS: EPSG:2193
```

The workflow is:

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

The system supports:

* Parcel geometry
* Parcel boundaries
* Primary parcel identity
* Secondary/intersecting parcels
* Building-to-parcel associations
* Occupied parcels
* Vacant parcels
* Multi-parcel buildings

Building-to-parcel association uses spatial relationships such as:

* Centroid containment
* Building footprint intersection

The system preserves multiple intersecting parcels rather than assigning a building to an arbitrary nearest parcel.

The current processed dataset contains:

```text
31 parcels within the AOI
14 parcels with buildings
17 vacant parcels
56 associated building footprints
1 multi-parcel building
```

The cadastral acquisition pipeline is:

```text
pipeline/acquire_linz_parcels.py
```

Parcel processing is handled through:

```text
pipeline/process_nz_parcels.py
```

The current implementation requires access to the LINZ Data Service for authoritative parcel acquisition.

---

# 🧱 Vertical Property Mapping

The platform provides an estimated vertical representation of buildings.

For supported buildings, the system generates:

* Estimated floor count
* Vertical levels
* Vertical unit IDs
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

Each level can be inspected individually.

Vertical levels are derived from LiDAR-based structural estimation.

They are not:

* Architectural floor plans
* BIM models
* Interior building models
* Official cadastral floor units
* Survey-certified floor boundaries

Each vertical level is explicitly described as:

```text
Estimated · LiDAR-derived
```

The current default floor-height assumption is approximately:

```text
3.2 m / floor
```

This is an analytical estimation parameter and is not a claim about actual architectural floor height.

---

# 📐 Vertical Property Intelligence

Each estimated level can expose:

* Vertical unit ID
* Level index
* Base elevation
* Top elevation
* Level height
* Estimated width
* Estimated depth
* Estimated footprint area
* Height above building base
* Structural consistency information

The vertical model also performs internal consistency checks against the LiDAR-derived structural model.

The system distinguishes between:

* Raw LiDAR apex elevation
* Structural roof estimation
* Estimated vertical structure

This prevents sparse LiDAR apex points from automatically being treated as architectural floor evidence.

---

# 📊 Spatial Analysis

The platform provides several spatial analysis tools.

## Site Analysis

A selected property can be evaluated using:

* Local ground elevation
* Local slope
* Relative elevation
* Nearby building count
* Nearest building distance
* Vegetation context
* Composite contextual indicator

The contextual indicator is intended for spatial interpretation and is not an engineering, flood, structural, zoning, or regulatory assessment.

---

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

These classifications are combined with deterministic validation into screening statuses:

```text
NORMAL
REVIEW
PRIORITY REVIEW
```

Current screening summary:

| Screening Status | Count |
| ---------------- | ----: |
| NORMAL           |    42 |
| REVIEW           |     8 |
| PRIORITY REVIEW  |     6 |
| TOTAL            |    56 |

The purpose of ML screening is to prioritize properties for human inspection.

An unusual ML result does not mean that a property is:

* Unsafe
* Illegal
* Incorrect
* Fraudulent
* Structurally defective

The ML output is a relative analytical signal based on the available dataset.

---

# 🔍 Explainable ML

The platform provides an explanation for why a property received its anomaly score.

The explanation uses leave-one-feature-out analysis.

In simple terms:

> One feature is removed at a time and the anomaly score is recalculated. The change in score is used to estimate how much that feature contributed to the original anomaly score.

The system provides:

* Top contributing features
* Contribution magnitude
* Direction relative to the dataset mean
* Property-specific explanations

This is an explanation of the existing screening model rather than a separate machine learning model.

---

# 🧭 Intelligent Property Screening

Automated screening combines multiple existing analytical signals.

The current workflow distinguishes:

```text
NORMAL
REVIEW
PRIORITY REVIEW
```

Priority review can be triggered by highly unusual ML results or deterministic validation errors.

Review status can be triggered by moderately unusual ML results or validation warnings.

The screening result does not replace human review.

---

# 🧩 3D Property Topology

The platform performs internal consistency checks across the 3D property model.

## Geometry Validation

Checks include:

* Building geometry
* Bounding dimensions
* Building association state

## Vertical Validation

Checks include:

* Floor index continuity
* Level labels
* Base/top ordering
* Upward progression
* Level overlap
* Vertical unit IDs
* Structural roof alignment

## Identity Validation

Checks include:

* Project-defined property ID format
* Vertical unit ID format
* Identity chain consistency

Validation states include:

```text
VALID
WARNING
ERROR
UNAVAILABLE
```

These represent internal 3D property topology checks.

They are not legal cadastral validation or regulatory certification.

---

# 👤 Human Review Workflow

The platform includes a human-in-the-loop review workflow.

Automated screening identifies properties that may require attention, while human review provides the final workflow state.

## Review States

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

The review workflow is connected to the property screening and evidence layers.

Review actions do not alter the underlying ML screening result.

---

# 🧾 Evidence & Provenance

The platform provides a property-level evidence and provenance layer.

Information is distinguished between:

### Source Information

Examples:

* LINZ cadastral data
* LiDAR
* Digital Terrain Model
* Sentinel-2
* Dataset metadata

### Derived Information

Examples:

* Building measurements
* Vertical structure
* Spatial analysis
* ML screening
* Explainable ML
* Topology validation

The evidence layer helps users understand where a property-level result originated and whether it is directly sourced or derived from other data.

---

# ⏳ Temporal Intelligence

The platform includes a temporal intelligence framework.

The currently available NZ dataset is treated as the current observation.

Historical reference data is currently unavailable.

Therefore:

* Current observations are supported
* Historical observations are not fabricated
* Historical deltas are unavailable
* Change detection is unavailable until comparable historical data is provided

This keeps temporal analysis explicitly tied to available evidence.

---

# 📋 Property Registry

The Property Registry provides a searchable index of the property dataset.

Users can search by:

* Building ID
* LINZ parcel ID
* Project-defined 3D Property ID
* Vertical unit ID

Example vertical unit search:

```text
3DP-4734388-NZ-B035-L02
```

An exact vertical unit search opens the parent property and requested level.

## Registry Filters

```text
All
Normal
Review
Priority
Multi-parcel
Vacant
```

The registry includes both property records and vacant parcel records.

Vacant parcels are explicitly represented without assigning fabricated building identities.

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

The queue prioritizes properties requiring review while retaining the underlying analytical context.

---

# 🔄 Property Lifecycle

The platform connects property data and analytical workflows through a unified lifecycle:

```text
┌──────────────────────┐
│    LINZ Parcel       │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│    LiDAR Building    │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│    3D Property ID    │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│    Vertical Units    │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Automated Analysis   │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│    ML Screening      │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│   Explainable ML     │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Topology Validation  │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│    Human Review      │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Evidence & Provenance│
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│   Property Dossier   │
└──────────────────────┘
```

---

# 📄 Property Dossier

The platform supports client-side generation of property-level PDF dossiers.

The dossier can contain:

## Property Identity

* Project-defined 3D Property ID
* LINZ primary parcel
* Building ID
* Vertical unit IDs

## Geometry

* Footprint
* Width
* Depth
* Area
* Centroid

## Elevation

* Ground elevation
* Roof elevation
* Building height
* Structural roof information

## LiDAR / Environment

* LiDAR information
* RGB
* NDVI
* Terrain context

## Local Comparison

* Local building statistics
* Relative property measurements

## Measurements

* Horizontal distance
* Elevation difference
* Height difference
* 3D distance

## ML Analysis

* Screening classification
* Anomaly score
* Explainable feature contributions

## Topology

* Internal validation results

## Human Review

* Review state
* Reviewer notes
* Review history

## Evidence & Provenance

* Data sources
* Derived information
* Supporting evidence

## Limitations

* LiDAR-derived vertical structure
* Project-defined property identity
* Dataset-relative ML screening
* Temporal data limitations
* Scope of topology validation

The dossier is an analytical output from the Digital Twin and is not a legal property document.

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

The optimization reduces repeated processing and response size while preserving the existing geospatial data contract.

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

The FastAPI backend provides NZ-specific services including:

```text
/api/nz/metadata
/api/nz/terrain
/api/nz/buildings
/api/nz/parcels
/api/nz/ml/buildings
/api/nz/review/buildings
```

Review persistence is also exposed through review-specific endpoints implemented in `api.py`.

The API provides the data required by the interactive Digital Twin and property intelligence workflow.

For the authoritative list of currently implemented endpoints, see:

```text
api.py
```

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
* Area Intelligence
* Property Intelligence
* Property Registry
* Review Queue
* Terrain layer controls
* Vertical building exploration
* Spatial measurements
* Spatial queries
* ML screening
* Explainable ML
* Topology validation
* Human review
* Evidence and provenance
* PDF reporting

---

# 🗂️ Important Project Files

Key application files include:

```text
api.py

frontend/
├── src/
│   ├── components/
│   │   └── NZDigitalTwin/
│   ├── services/
│   │   ├── nzApi.ts
│   │   ├── propertyIdentity.ts
│   │   ├── topologyValidation.ts
│   │   ├── temporalChange.ts
│   │   ├── evidence.ts
│   │   └── dossierPdf.ts
│   └── App.tsx

pipeline/
├── acquire_linz_parcels.py
├── process_nz_parcels.py
├── vertical_structure.py
└── ...

data/
└── inputs/
    └── parcels/
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
python -m uvicorn api:app --reload
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

# 🧠 ML Architecture

The current structural screening system uses a lightweight unsupervised Mahalanobis-distance approach.

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

Explainability is calculated using leave-one-feature-out analysis.

No separate explainability model is required.

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

Important workflows should also be manually verified after significant changes:

* 3D rendering
* Building selection
* Building focus
* Terrain layers
* Cadastral parcel display
* Property identity
* Property Registry
* Vertical exploration
* Exact vertical unit search
* Spatial measurements
* Spatial queries
* ML screening
* Explainable ML
* Topology validation
* Human review
* Evidence/provenance
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

Do not fabricate geospatial, cadastral, property, temporal, or ML results.

Do not commit API keys or excluded datasets.

---

# 🎯 Current Dataset Summary

| Category                 | Current Value      |
| ------------------------ | ------------------ |
| LiDAR points             | 21,138,016         |
| LiDAR tiles              | 4 contiguous tiles |
| Buildings                | 56                 |
| Terrain vertices         | 346,801            |
| Terrain triangles        | 691,200            |
| DTM resolution           | 2 m                |
| Survey extent            | ~960 m × 1,440 m   |
| Survey area              | ~138.2 ha          |
| CRS                      | EPSG:2193          |
| LINZ parcels             | 31                 |
| Parcels with buildings   | 14                 |
| Vacant parcels           | 17                 |
| Associated buildings     | 56                 |
| Multi-parcel buildings   | 1                  |
| Generated vertical units | 104                |
| Sentinel-2               | T60HUD             |
| Sentinel-2 resolution    | 10 m               |

---

# 🎯 SIH Relevance

The project is designed around the broader objective of 3D property identification and vertical property mapping.

The current workflow combines:

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

This moves beyond conventional 2D mapping by connecting geospatial geometry with property-level identity, vertical structure, cadastral context, analytical screening, validation, human review, and evidence-based reporting.

The architecture provides a foundation for demonstrating how 3D geospatial technology can support modern property mapping and land administration workflows.

---

# ⚠️ Limitations

## LiDAR-Derived Vertical Structure

Vertical levels are estimated from available LiDAR-derived structural information.

They are not:

* Architectural floor plans
* BIM models
* Interior building models
* Survey-certified floor boundaries
* Official cadastral floor units

---

## Property Identity

Project-defined 3D Property IDs are deterministic identifiers used for the Digital Twin workflow.

They are not official legal ULPINs.

---

## Cadastral Data

Cadastral information is sourced from the LINZ Primary Parcels dataset.

The system performs spatial associations and internal checks but does not establish:

* Legal ownership
* Legal title
* Legal parcel boundaries
* Regulatory compliance

---

## Topology

Topology results represent internal 3D property consistency checks.

They are not legal cadastral validation or regulatory certification.

---

## Machine Learning

The ML system is relative to the available NZ LiDAR building population.

It is a screening and prioritization mechanism, not a universal building classifier.

It does not determine:

* Structural safety
* Legal status
* Property ownership
* Regulatory compliance
* Building correctness

---

## Temporal Analysis

Historical reference data is currently unavailable.

Therefore the system does not fabricate historical measurements or change-detection results.

---

## Human Review Persistence

The current review workflow uses persistent backend review records for review state, notes and history.

The review system should still be treated as an application-level review workflow rather than an official land administration record.

---

## Dataset Scope

The current implementation is demonstrated using a specific New Zealand dataset.

The workflows should not be assumed to represent every geographic region or cadastral system without appropriate data, standards and processing adaptation.

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

This project is a geospatial visualization, property intelligence and analytical prototype.

LiDAR-derived building heights and vertical levels are estimates based on available spatial data.

Machine learning outputs are intended to support screening and human review. An unusual result does not imply that a property or building is incorrect, unsafe, illegal, fraudulent, or defective.

Cadastral and property-related conclusions require authoritative data and appropriate verification.

Project-defined 3D property identifiers are intended to demonstrate a ULPIN-style workflow and should not be interpreted as official legal ULPINs.

---
