# BhuVista – Product Requirements Document (PRD)

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision](#3-product-vision)
4. [Product Goals](#4-product-goals)
5. [Target Users](#5-target-users)
6. [User Personas](#6-user-personas)
7. [Core User Journey](#7-core-user-journey)
8. [Functional Requirements](#8-functional-requirements)
9. [UI/UX Requirements](#9-uiux-requirements)
10. [Technical Architecture](#10-technical-architecture)
11. [API Requirements](#11-api-requirements)
12. [Data Architecture](#12-data-architecture)
13. [Geospatial Requirements](#13-geospatial-requirements)
14. [ML / Analytics Requirements](#14-ml--analytics-requirements)
15. [Performance Requirements](#15-performance-requirements)
16. [Security Requirements](#16-security-requirements)
17. [Non-Functional Requirements](#17-non-functional-requirements)
18. [Error Handling](#18-error-handling)
19. [Acceptance Criteria](#19-acceptance-criteria)
20. [Success Metrics](#20-success-metrics)
21. [Scope](#21-scope)
22. [Non-Goals](#22-non-goals)
23. [Risks and Mitigations](#23-risks-and-mitigations)
24. [Development Guidelines](#24-development-guidelines)
25. [Roadmap](#25-roadmap)
26. [Future Opportunities](#26-future-opportunities)
27. [Definition of Done](#27-definition-of-done)
28. [Product Principles](#28-product-principles)

---

## 1. Product Overview

**Product Name:** BhuVista  
**One-line Description:** A 3D geospatial Digital Twin and Property Intelligence platform connecting LiDAR, satellite imagery, building reconstruction, and cadastral data.

**Detailed Description:**  
BhuVista is an interactive 3D geospatial platform that unifies 21M+ point LiDAR data, 2m Digital Terrain Models (DTM), Sentinel-2 satellite imagery (RGB/NDVI), cadastral parcels, and reconstructed 3D buildings. It supports 3D property identity formulation, vertical property mapping, and spatial analytics. BhuVista employs unsupervised ML anomaly detection (Mahalanobis distance) to screen properties and provides explainable AI alongside a human-in-the-loop review workflow. 

**Current Project Status:**  
Working MVP focusing on a specific Area of Interest (AOI). The backend serves geospatial data via FastAPI, and the frontend provides an interactive React/Three.js environment. Machine Learning screening and basic measurement tools are already implemented.

**Current Area of Interest (AOI):**  
New Zealand – Franklin District, Bombay Hills, and Ramarama area of South Auckland. (Approx. 960 m × 1,440 m).

**Main Technologies:**  
React, TypeScript, Vite, Three.js, FastAPI, Python, PyVista, VTK, NumPy.

---

## 2. Problem Statement
Geospatial data—such as high-resolution LiDAR, multispectral satellite imagery, terrain topology, and legal cadastral boundaries—is typically siloed. Property analysts, GIS professionals, and local authorities struggle to cross-reference legal boundaries with physical building geometry, structural height, and environmental variables (e.g., vegetation/NDVI). Investigating unusual or unpermitted structures requires manually overlaying 2D maps and raw point clouds, a process that is time-consuming, requires specialized software, and lacks explainable, data-driven prioritization.

---

## 3. Product Vision
To become the definitive 3D Digital Twin and Property Intelligence platform that seamlessly fuses physical, environmental, and legal property data into a single interactive 3D space. BhuVista hides complex geospatial processing beneath a user-friendly, property-focused interface, accelerating decision-making and property review.

---

## 4. Product Goals
- Render massive 3D geospatial datasets (terrain and buildings) directly in the browser.
- Automatically fuse LiDAR-derived structures with Sentinel-2 satellite imagery (RGB and NDVI).
- Provide unsupervised ML screening to flag structurally unusual buildings for human review.
- Enable precise spatial measurements and vertical property exploration.
- Ensure the separation of "Source" data (e.g., LINZ parcels) from "Derived" insights.

---

## 5. Target Users
- **GIS/Geospatial Analysts:** Need to visualize terrain, slope, NDVI, and LiDAR outputs without switching tools.
- **Property Analysts / Surveyors:** Need indicative 3D dimensions, footprint, height, and contextual building relations.
- **Planning/Review Users:** Need to manage a queue of flagged properties, review ML anomalies, and record human review states.

---

## 6. User Personas

**Persona 1: Alex, the Property Analyst**
- **Role:** Analyst assessing property compliance and structural variations.
- **Goals:** Quickly identify unusual properties in a district; review building dimensions and site context.
- **Problems:** Manually checking 2D maps against site visits is slow; lacks context on relative building heights.
- **How BhuVista helps:** Flags properties as `REVIEW` or `PRIORITY REVIEW` using ML; provides an interactive 3D dossier of the property.

**Persona 2: Taylor, the GIS Specialist**
- **Role:** Data engineer/GIS specialist managing the physical terrain.
- **Goals:** Understand topography, vegetation (NDVI), and slope.
- **Problems:** Sharing 3D data requires exporting large LAZ files or complex GIS software.
- **How BhuVista helps:** Web-accessible 3D Digital Twin with layer toggling (RGB, Elevation, NDVI, Slope).

---

## 7. Core User Journey
1. **Load AOI:** The user opens BhuVista. The system loads the 3D terrain and building meshes for the New Zealand AOI.
2. **Explore Layers:** The user toggles between RGB, NDVI, Elevation, and Slope layers on the terrain to understand the environment.
3. **Select Building:** The user clicks a 3D building, bringing it into camera focus.
4. **Inspect Property:** A contextual dossier appears showing the project-defined 3D Property ID, LINZ parcel, height, area, ML screening status, and feature explanations.
5. **Measure Spatial Relationships:** The user activates the measurement tool, clicking a second building to calculate Horizontal and 3D distance.
6. **Review Workflow:** If the property was flagged by the ML model, the user inspects the leave-one-feature-out explanation and sets a human review state (e.g., `REVIEWED`).

---

## 8. Functional Requirements

### 8.1 3D Viewer
- **Terrain & Buildings:** The system must render a 2m DTM terrain mesh and 56 fused 3D buildings.
- **Camera Controls:** Support pan, orbit, and zoom using Three.js controls.
- **Selection & Focus:** Clicking a building selects it and focuses the camera on its centroid with smooth damping (DampingFactor ~0.08).

### 8.2 Geospatial Layers
- **Supported Terrain Views:** Elevation, Slope, Relative elevation, Analytical hillshade, RGB (from Sentinel-2), NDVI (from Sentinel-2).
- **Layer Controls:** Users can seamlessly toggle between layers in the 3D scene.

### 8.3 Building Selection and Inspection
- **Building Metadata:** On selection, show Building ID, dimensions (width, depth, area), ground/roof elevation, structural height, and LiDAR point count.
- **Property Information:** Show overlapping LINZ primary parcels, vertical units, and project-defined 3D Property IDs.
- **Visual Highlighting:** Selected building is visually differentiated (e.g., highlighted material).

### 8.4 Measurement
- **Entering Mode:** Users toggle the Measurement tool from the UI toolbar.
- **Phase A / Phase B:** User picks Building A, then Building B.
- **Calculation:** System calculates centroid-to-centroid *Horizontal Distance* and *3D Distance* (including elevation deltas).
- **Displaying Results:** Draw a spatial measurement line between the two centroids in 3D space, and show values in a UI panel.

### 8.5 Property Registry
- **Search & Filter:** Search properties by Building ID, LINZ parcel ID, or 3DP ID.
- **Filtering:** Filter by ML status (Normal, Review, Priority) and occupancy (Multi-parcel, Vacant).

### 8.6 Vertical Exploration
- **Floor Generation:** Generates estimated vertical levels using a default ~3.2m per floor assumption derived from LiDAR height.
- **Unit IDs:** Generates vertical unit IDs (e.g., `3DP-...-L01`).

### 8.7 Review Workflow
- **ML Screening States:** `NORMAL`, `REVIEW`, `PRIORITY REVIEW`.
- **Human Review States:** `UNREVIEWED`, `IN REVIEW`, `REVIEWED`.
- **Actions:** Reviewers can start reviews, mark as reviewed, and reopen reviews without mutating the underlying ML result.

### 8.8 Upload/Data Ingestion
- **Functionality:** Basic endpoints `/api/upload/satellite` and `/api/upload/lidar` exist to receive geospatial files (currently decoupled from live automated processing).

### 8.9 Metadata
- **System Exposure:** Show CRS (EPSG:2193), vertical datum, bounding box, and vertex/triangle counts.

---

## 9. UI/UX Requirements
- **Modern 3D Workspace:** The 3D scene is the main canvas; avoid wrapping the app in generic heavy dashboards.
- **Clear Hierarchy:** Contextual side panels slide over the 3D view for building/property inspection.
- **Controls:** Floating toolbars for measurement and layer toggling.
- **Responsiveness:** Panels adapt to viewport; camera constraints prevent losing the scene.
- **Loading States:** Heavy 3D payloads must show clear loading/precompiling progress indicators (e.g., shader compilation off-main-thread).

---

## 10. Technical Architecture

```text
User
  ↓
React / TypeScript / Vite (Frontend UI & Interaction)
  ↓
Three.js / React Three Fiber / Drei (3D Rendering)
  ↓
FastAPI / Uvicorn (Backend API & In-Memory Caching)
  ↓
Geospatial Processing (PyVista, VTK, Laspy, NumPy, Shapely)
  ↓
LiDAR / Sentinel-2 / Terrain / Building Data (Git LFS)
```
**Architecture Notes:**
- Frontend and backend communicate via HTTP/Axios. 
- The backend caches massive JSON responses (Gzipped) in memory to reduce I/O overhead.

---

## 11. API Requirements

| Endpoint | Method | Purpose | Input / Output |
| --- | --- | --- | --- |
| `/api/nz/terrain` | GET | Fetches 2m DTM terrain mesh. | In: none (uses cache). Out: vertices, faces, RGB, NDVI, slope. |
| `/api/nz/buildings` | GET | Fetches all 56 3D building meshes. | In: none. Out: array of buildings with vertices, faces, heights. |
| `/api/nz/ml/buildings` | GET | Computes/returns ML anomaly scores. | In: none. Out: Mahalanobis scores, feature contributions (JSON). |
| `/api/nz/review/buildings` | GET | Returns unified review queue data. | In: none. Out: building statuses, deterministic validation checks. |
| `/api/nz/parcels` | GET | Returns LINZ primary parcel geometries. | In: none. Out: GeoJSON-like parcel boundaries and metadata. |
| `/api/upload/lidar` | POST | Ingest raw data. | In: Multipart file. Out: Success message. |

---

## 12. Data Architecture

- **Source Data:** 
  - LiDAR LAZ points (21M points)
  - Sentinel-2 T60HUD Bands (B02, B03, B04, B08)
  - LINZ Primary Parcels (Layer 50772)
- **Derived Data:**
  - Terrain model (`terrain_fused.vtp`)
  - Building models (`building_mesh.vtp`)
  - Interpolated RGB/NDVI textures and arrays
- **Analytical/Reviewed Data:**
  - ML Anomaly scores (calculated at runtime)
  - Human review states (operationally tracked)

---

## 13. Geospatial Requirements
- **Coordinate Reference System (CRS):** EPSG:2193 (NZTM2000)
- **Vertical Datum:** NZVD2016
- **Units:** Meters
- **Spatial Alignment:** Sentinel-2 data (EPSG:32760) is reprojected to EPSG:2193 to align perfectly with the LiDAR grid.
- **Raster/Vector:** The app merges raster satellite indices (NDVI) onto vector mesh points (VTK/VTP).

---

## 14. ML / Analytics Requirements
- **Algorithm:** Unsupervised Mahalanobis-distance clustering.
- **Features Used:** Height, Estimated floors, Footprint area, Ground elevation, Roof elevation, Footprint width, Footprint depth.
- **Explainability:** Leave-one-feature-out analysis to show which structural feature contributes most to an anomaly score (e.g., "Height is higher than local structural pattern").
- **Disclaimer:** ML results flag *unusual* properties compared to the local distribution. They do not represent legal, structural, or safety truth.

---

## 15. Performance Requirements
- **3D Rendering:** The full terrain contains ~346k vertices and ~691k triangles.
- **Precompilation:** WebGL shaders must be compiled asynchronously (`WebGLRenderer.compileAsync()`) to avoid massive frame freezes during the scene transition.
- **Payloads:** Backend JSON payloads must be gzipped (e.g., ~15MB gzip vs much larger raw JSON).
- **Future Rendering:** If the dataset scales, the frontend will require LOD (Level of Detail), chunked VTP serving, or frustum-culling to avoid browser OOM crashes.

---

## 16. Security Requirements
- **CORS:** FastAPI must allow appropriate origins for frontend connections.
- **File Handling:** Upload endpoints must validate geospatial input files before processing.
- *(Note: Authentication and role-based access are not currently implemented and are marked for Future Scope).*

---

## 17. Non-Functional Requirements
- **Performance:** 3D scene must maintain 30+ FPS on average hardware.
- **Reliability:** Data fetching must handle large JSON decoding gracefully.
- **Maintainability:** Separation of ML dependencies (`ml/requirements.txt`) from main backend.
- **Data Integrity:** Git LFS must be used to prevent massive dataset corruption or Git history bloat.

---

## 18. Error Handling
- **API Failures:** Network failures displaying toast notifications to the user rather than crashing the React tree.
- **Missing Datasets:** If `terrain_fused.vtp` is missing, the API must return a structured JSON error (`{"error": "mesh not found"}`) handled by the frontend.
- **Measurement Errors:** If picking fails to intersect a valid building mesh, the measurement phase resets safely.

---

## 19. Acceptance Criteria
- **AC 1:** User can load the New Zealand AOI and see the 3D terrain and 56 buildings.
- **AC 2:** User can toggle between RGB, Elevation, and NDVI views on the terrain.
- **AC 3:** User can select a building; the camera smoothly focuses on it.
- **AC 4:** The Property Dossier successfully renders the structural dimensions and ML explanations for the selected building.
- **AC 5:** The spatial measurement tool accurately produces a centroid-to-centroid Horizontal and 3D distance between two selected buildings.

---

## 20. Success Metrics
*Proposed Metrics for Future Tracking:*
- **Rendering Responsiveness:** Percentage of sessions maintaining >30 FPS during scene transitions.
- **Successful Dataset Loading:** API response time and gzip payload size efficiency.
- **User Task Completion:** Time taken to identify an anomalous building and complete a "Review" action.

---

## 21. Scope

**Current Scope (Implemented):**
- 3D Terrain & Building rendering for the NZ AOI.
- Sentinel-2 RGB/NDVI layer integration.
- Mahalanobis ML screening & Explainable AI.
- Spatial measurement tool (Horizontal / 3D distance).
- LINZ Cadastral parcel overlay mapping.
- In-memory backend caching.

**Planned Scope (Near-term):**
- 3D rendering optimization (LOD, geometry simplification) to support larger AOIs without browser crashes.
- Persistent database for human review states (currently runtime memory).
- Improved coordinate display on hover.

**Future Scope (Not Implemented):**
- Multi-AOI support.
- Role-based Access Control (RBAC).
- Temporal change detection (requires historical LiDAR).
- True architectural BIM integration.

---

## 22. Non-Goals
- **NOT** a replacement for official cadastral surveying systems.
- **NOT** a legally authoritative ownership database.
- **NOT** an architectural BIM system (vertical floors are estimations, not physical floor plans).
- ML screening will **NOT** automatically declare a property structurally illegal or defective.

---

## 23. Risks and Mitigations
- **Browser Memory Limits:** Rendering ~691k triangles pushes standard browser limits. 
  - *Mitigation:* `compileAsync()` is applied. Next steps involve LOD and chunking.
- **Expensive Processing Overwrites:** Casual execution of `process_sentinel2.py` could overwrite curated baselines.
  - *Mitigation:* Agent guidelines restrict running these scripts without explicit approval.
- **Git LFS Bloat:** Adding raw ML datasets (~27GB) would break the repository.
  - *Mitigation:* Enforce `.gitignore` on `ml/dataset/` and `myvenv/`.

---

## 24. Development Guidelines
- **Inspect Before Modifying:** Always read `PROJECT_CONTEXT.md` and check `backend/app/api.py` before changing data flows.
- **Protect Geospatial Outputs:** Existing outputs in `data/outputs/nz_lidar/` are baselines. Do not delete them.
- **Do Not Fabricate:** Never fabricate geospatial coordinates, historical data, or property dimensions.
- **Dependencies:** Keep `requirements.txt` (FastAPI/geospatial) strictly separate from `ml/requirements.txt`.

---

## 25. Roadmap
- **Completed:** Baseline digital twin generation, data fusion, initial ML screening, 3D interactive UI, measurement tool.
- **Near-term (1-3 months):** Fix remaining 3D scalability bottlenecks (LOD implementation). Add DB persistence for the Property Registry and Review Queue.
- **Medium-term (3-6 months):** Introduce a second AOI to prove pipeline generalization. Enhance ML to detect temporal changes (if data provided).
- **Long-term (6+ months):** City-scale 3D streaming.

---

## 26. Future Opportunities
- **Change Detection:** Comparing LiDAR scans across different years to automatically flag new, demolished, or modified structures.
- **More Authoritative Datasets:** Integrating local council zoning overlays, flood plains, or subterranean infrastructure.
- **Export Workflows:** Exporting selected buildings to `.obj` or `.gltf` for third-party modeling.

---

## 27. Definition of Done
A feature in BhuVista is considered complete when:
- The backend API correctly supplies the required JSON/geometry with exact CRS adherence.
- The frontend successfully parses and visualizes it without breaking the existing New Zealand Digital Twin.
- The browser memory is respected (no massive leaks or immediate OOM crashes on standard hardware).
- No massive geospatial datasets or virtual environments were accidentally committed to Git.
- Relevant documentation is updated.

---

## 28. Product Principles
1. **Deep underneath. Simple on top.**
2. **Treat data sources as distinct from derived intelligence.**
3. **ML is an assistive flag, not the absolute truth.**
4. **Prioritize 3D geospatial accuracy over generic web paradigms.**
5. **Protect performance; spatial data scales exponentially.**
