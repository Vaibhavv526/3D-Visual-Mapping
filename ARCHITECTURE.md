# System Architecture

## System overview

BhuVista is an interactive 3D geospatial platform that brings together LiDAR-derived terrain and building models, Sentinel-2 satellite imagery, and cadastral parcel data into a unified 3D Digital Twin. The system hides complex geospatial processing behind a property-focused interface, allowing users to explore buildings, inspect property identities (including vertical properties), perform spatial analysis, evaluate ML-based property screenings, and generate property dossiers.

## Architecture diagram

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

## Frontend architecture

The frontend is built using **React, TypeScript, and Vite**. It utilizes **Three.js** along with **@react-three/fiber** and **@react-three/drei** for interactive 3D rendering of the Digital Twin (terrain and building meshes). It communicates with the backend via **Axios** and standard HTTP fetch requests. Key architectural concerns in the frontend include rendering scalability (managing memory and performance for large VTP meshes) and providing a smooth property exploration user experience.

## Backend architecture

The backend operates on a **FastAPI** framework running on **Uvicorn** (Python). It is responsible for parsing pre-processed geospatial datasets (such as `.vtp` meshes and `.tif` satellite rasters) and serving them to the frontend. The backend heavily utilizes geospatial and scientific libraries like NumPy, PyVista, VTK, Laspy, Rasterio, and Shapely.

## Database architecture

Currently, the project does not use a traditional relational database for the 3D property data. Instead, it relies on a file-based storage architecture containing generated outputs:
- `.vtp` (VTK XML PolyData) files for terrain and building geometry (e.g., `terrain.vtp`, `building_mesh.vtp`).
- `.tif` (GeoTIFF) files for Sentinel-2 satellite products (e.g., RGB and NDVI layers).
The data is structured under `data/outputs/` and managed using Git LFS due to its large size. Database-backed metadata might be introduced as the system evolves, but the current MVP prioritizes file-based dataset consumption.

## Authentication architecture

Currently, there is no formal authentication layer implemented as this is an MVP property intelligence platform focusing on data fusion and exploration. Future extensions may integrate role-based access control (RBAC) to differentiate between standard users and property reviewers.

## API flow

1. The frontend initiates HTTP GET requests (via Axios or fetch) to specific FastAPI endpoints (e.g., `/api/nz/terrain`, `/api/nz/buildings`, `/api/nz/parcels`, `/api/nz/ml/buildings`).
2. The FastAPI backend reads the requested information from the pre-processed geospatial files in the `data/outputs/` directory.
3. The backend structures the data (e.g., extracting vertices, faces, elevations, RGB/NDVI attributes, and ML screening states) and returns it as JSON responses.
4. The frontend parses this JSON, updates its React state, and dynamically generates or updates Three.js geometries and materials for rendering.

## AI flow

The system includes an unsupervised Machine Learning workflow for property screening. 
1. **Feature Extraction:** Key structural parameters (estimated floor count, building height, ground elevation, estimated footprint area, etc.) are extracted from the fused LiDAR building dataset.
2. **Anomaly Detection:** A Mahalanobis-distance-based screening approach is used to identify structurally unusual buildings, classifying them as Normal, Review, or Priority Review.
3. **Explainable ML:** A leave-one-feature-out analysis runs on the ML results to calculate the contribution of each feature to the final anomaly score, providing interpretability for the reviewer.
4. **Integration:** The backend serves these ML outcomes and explanations alongside standard building data to the frontend, which highlights properties requiring human review.

## External services

The architecture relies heavily on raw external datasets, which are processed via an offline pipeline before being served:
- **LINZ (Land Information New Zealand):** Source of Primary Parcels (cadastral data).
- **LiDAR Surveys:** Source of point clouds (LAZ format) for terrain and building geometry.
- **Copernicus Sentinel-2:** Source of satellite imagery (10m resolution bands) used to derive RGB and NDVI.
There are no real-time external API dependencies for the core Digital Twin rendering, ensuring stability and performance.

## Data flow

1. **Ingestion & Offline Processing:** Raw LiDAR (.laz) and Sentinel-2 imagery are processed using python scripts in the `pipeline/` directory to generate digital terrain models, building meshes, and aligned satellite layers.
2. **Data Fusion:** The pipeline fuses these datasets to append Sentinel-2 attributes (RGB, NDVI) and LINZ cadastral data onto the LiDAR building geometries.
3. **Storage:** The processed artifacts are saved as `.vtp` and `.tif` files in the `data/outputs/` directory.
4. **Serving:** The FastAPI backend serves this static fused data via REST API endpoints.
5. **Consumption:** The React frontend fetches, parses, and visualizes the geospatial and property intelligence data interactively.

## Error handling

Error handling in the frontend revolves around gracefully degrading the experience if API calls fail or data is missing, ensuring the 3D canvas doesn't crash on incomplete data. On the backend, FastAPI's built-in validation (using Pydantic models where applicable) and routing error handlers are used. The platform also has specialized 3D Topology Validation that flags internal inconsistencies in the 3D property model (e.g., geometry errors, vertical floor continuity) with statuses like WARNING, ERROR, or UNAVAILABLE, which are then exposed to the user.

## Deployment architecture

The current setup assumes a standard containerized or VM-based deployment where the FastAPI backend and built static Vite frontend run together. Due to the heavy reliance on local file storage (`.vtp` and `.tif` files) and Git LFS, the deployment environment requires sufficient disk space and memory to load and serve the geospatial structures. 
A future production architecture will likely migrate from flat files to Cloud Storage and specialized binary tiling formats (like 3D Tiles) for optimized chunked streaming over the network.

## Important architectural decisions

- **Pre-processing over Real-time Generation:** All expensive geospatial operations (point cloud triangulation, mesh fusion, reprojection) are done offline via the `pipeline/` scripts to guarantee fast load times for the API.
- **File-based Data Store:** To keep the MVP simple, data is stored in `.vtp` files rather than a specialized spatial database (like PostGIS). 
- **Mesh Stability:** The building mesh generation algorithm was explicitly chosen for stability (interpolation over a regular grid + wall/base extrusion) rather than raw 3D Delaunay triangulation to avoid visual artifacts.
- **Explainable ML vs Black Box:** The ML property screening deliberately uses an explainable approach (Mahalanobis distance + leave-one-feature-out) instead of deep learning, ensuring reviewers understand *why* a building was flagged.
- **3D Property Identity:** Custom 3D Property IDs represent a foundational concept, acting as a unified key to bind LiDAR buildings, LINZ parcels, and estimated vertical units together.
