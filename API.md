# API Documentation

## Base URL
The API is typically served at the root URL of your backend server, e.g., `http://localhost:8000`. 
All API endpoints are prefixed with `/api/` (except for root and health check endpoints).

## Authentication
Currently, the API **does not** require authentication for any of the endpoints.

## Endpoints

### 1. Root
* **Method:** `GET`
* **URL:** `/`
* **Purpose:** Serves the compiled React frontend if available. Otherwise, returns basic API status.
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** None
* **Response:** HTML file or JSON: `{"project": "...", "status": "running", "version": "..."}`
* **Error responses:** None
* **Example:**
```bash
curl -X GET http://localhost:8000/
```

### 2. Health Check
* **Method:** `GET`
* **URL:** `/health`
* **Purpose:** Returns the health status of the API and availability of generated datasets.
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** None
* **Response:** JSON object detailing the health status and dataset availability (e.g., `terrain_available`, `nz_building_mesh_available`).
* **Error responses:** None
* **Example:**
```bash
curl -X GET http://localhost:8000/health
```

### 3. Analytics Data
* **Method:** `GET`
* **URL:** `/api/analytics`
* **Purpose:** Retrieves terrain and model analytics data.
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** None
* **Response:** JSON object containing analytics metrics.
* **Error responses:** `404 Not Found` or `{"error": "Analytics file not found"}` if the file does not exist.
* **Example:**
```bash
curl -X GET http://localhost:8000/api/analytics
```

### 4. Terrain Data (Bilaspur)
* **Method:** `GET`
* **URL:** `/api/terrain`
* **Purpose:** Retrieves the parsed 3D terrain mesh for the Bilaspur AOI.
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** None
* **Response:** JSON containing vertices, faces, elevation, NDVI, slope, rgb, and crs.
* **Error responses:** `{"error": "Terrain mesh file not found"}` if not processed yet.
* **Example:**
```bash
curl -X GET http://localhost:8000/api/terrain
```

### 5. NZ Metadata
* **Method:** `GET`
* **URL:** `/api/nz/metadata`
* **Purpose:** Retrieves summary metadata for the New Zealand Digital Twin.
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** None
* **Response:** JSON object detailing dataset size, CRS, layers, and geometry counts.
* **Error responses:** None
* **Example:**
```bash
curl -X GET http://localhost:8000/api/nz/metadata
```

### 6. NZ Terrain Data
* **Method:** `GET`
* **URL:** `/api/nz/terrain`
* **Purpose:** Retrieves the processed New Zealand LiDAR terrain mesh.
* **Authentication requirement:** None
* **Parameters:** None (Headers: `Accept-Encoding: gzip` supported)
* **Request body:** None
* **Response:** JSON containing vertices, faces, elevation, slope, rgb, ndvi, and metadata.
* **Error responses:** `404 Not Found` or `{"error": "New Zealand terrain mesh not found"}`
* **Example:**
```bash
curl -X GET http://localhost:8000/api/nz/terrain -H "Accept-Encoding: gzip"
```

### 7. NZ Buildings Data
* **Method:** `GET`
* **URL:** `/api/nz/buildings`
* **Purpose:** Retrieves the 3D building meshes for New Zealand.
* **Authentication requirement:** None
* **Parameters:** None (Headers: `Accept-Encoding: gzip` supported)
* **Request body:** None
* **Response:** JSON payload of parsed building geometries, bounding boxes, and vertical structure data.
* **Error responses:** `404 Not Found` or `{"error": "Fused New Zealand building mesh not found"}`
* **Example:**
```bash
curl -X GET http://localhost:8000/api/nz/buildings -H "Accept-Encoding: gzip"
```

### 8. NZ Building Points
* **Method:** `GET`
* **URL:** `/api/nz/buildings/points`
* **Purpose:** Retrieves the raw LiDAR building-classified point cloud data.
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** None
* **Response:** JSON payload of building points, count, CRS, and classification data.
* **Error responses:** `{"error": "New Zealand building point cloud not found"}`
* **Example:**
```bash
curl -X GET http://localhost:8000/api/nz/buildings/points
```

### 9. NZ ML Building Analytics
* **Method:** `GET`
* **URL:** `/api/nz/ml/buildings`
* **Purpose:** Computes and retrieves anomaly detection (Mahalanobis Distance) results for buildings.
* **Authentication requirement:** None
* **Parameters:** None (Headers: `Accept-Encoding: gzip` supported)
* **Request body:** None
* **Response:** JSON containing ML classification, anomaly scores, and feature explanation profiles.
* **Error responses:** `{"error": "ML computation failed"}`
* **Example:**
```bash
curl -X GET http://localhost:8000/api/nz/ml/buildings -H "Accept-Encoding: gzip"
```

### 10. NZ Building Reviews Dashboard
* **Method:** `GET`
* **URL:** `/api/nz/review/buildings`
* **Purpose:** Consolidates building status, deterministic validation results, and ML classifications into a review dashboard payload.
* **Authentication requirement:** None
* **Parameters:** None (Headers: `Accept-Encoding: gzip` supported)
* **Request body:** None
* **Response:** JSON object summarizing priority reviews and validation issues for buildings.
* **Error responses:** `{"error": "Review computation failed"}`
* **Example:**
```bash
curl -X GET http://localhost:8000/api/nz/review/buildings
```

### 11. List Building Reviews
* **Method:** `GET`
* **URL:** `/api/nz/review`
* **Purpose:** Retrieves all user-generated manual review records from the database.
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** None
* **Response:** JSON array of all review records.
* **Error responses:** None
* **Example:**
```bash
curl -X GET http://localhost:8000/api/nz/review
```

### 12. Get Specific Building Review
* **Method:** `GET`
* **URL:** `/api/nz/review/{building_id}`
* **Purpose:** Retrieves a single building's review state and history.
* **Authentication requirement:** None
* **Parameters:**
  * `building_id` (Path): String ID of the building.
* **Request body:** None
* **Response:** JSON object with `review_state`, `notes`, `property_id_3d`, and a `history` array.
* **Error responses:** Empty JSON `{}` if not found.
* **Example:**
```bash
curl -X GET http://localhost:8000/api/nz/review/NZ-B001
```

### 13. Update Building Review
* **Method:** `PATCH`
* **URL:** `/api/nz/review/{building_id}`
* **Purpose:** Updates the review status, notes, or 3D property ID for a specific building.
* **Authentication requirement:** None
* **Parameters:**
  * `building_id` (Path): String ID of the building.
* **Request body:** JSON (Content-Type: `application/json`)
  * `property_id_3d` (string, optional)
  * `review_state` (string, optional)
  * `notes` (string, optional)
* **Response:** The updated JSON review record (same as GET `/api/nz/review/{building_id}`).
* **Error responses:** `422 Unprocessable Entity` for invalid body schema.
* **Example:**
```bash
curl -X PATCH http://localhost:8000/api/nz/review/NZ-B001 \
-H "Content-Type: application/json" \
-d '{"review_state": "REVIEWED", "notes": "Looks good"}'
```

### 14. Get Building Review History
* **Method:** `GET`
* **URL:** `/api/nz/review/{building_id}/history`
* **Purpose:** Retrieves the audit trail of review events for a specific building.
* **Authentication requirement:** None
* **Parameters:**
  * `building_id` (Path): String ID of the building.
* **Request body:** None
* **Response:** JSON array of history objects containing `event_type` and `timestamp`.
* **Error responses:** None
* **Example:**
```bash
curl -X GET http://localhost:8000/api/nz/review/NZ-B001/history
```

### 15. NZ Parcels Data
* **Method:** `GET`
* **URL:** `/api/nz/parcels`
* **Purpose:** Retrieves cadastral parcels and property association mapping for New Zealand.
* **Authentication requirement:** None
* **Parameters:** None (Headers: `Accept-Encoding: gzip` supported)
* **Request body:** None
* **Response:** JSON object containing `parcels`, `associations`, `summary`, and `crs`.
* **Error responses:** `{"available": False, "message": "..."}` if an error occurs.
* **Example:**
```bash
curl -X GET http://localhost:8000/api/nz/parcels -H "Accept-Encoding: gzip"
```

### 16. Process LiDAR (Pipeline)
* **Method:** `POST`
* **URL:** `/api/pipeline/process-lidar`
* **Purpose:** Triggers the pipeline to validate and process uploaded LiDAR files into DTMs.
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** None
* **Response:** JSON object indicating success status, outputs, and validation details.
* **Error responses:** `{"success": False, "error": "..."}`
* **Example:**
```bash
curl -X POST http://localhost:8000/api/pipeline/process-lidar
```

### 17. Process Satellite (Pipeline)
* **Method:** `POST`
* **URL:** `/api/pipeline/process-satellite`
* **Purpose:** Triggers the pipeline to process Sentinel-2 satellite data using the LiDAR DTM reference.
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** None
* **Response:** JSON object indicating success status and generated product paths (RGB, NDVI).
* **Error responses:** `{"success": False, "error": "..."}`
* **Example:**
```bash
curl -X POST http://localhost:8000/api/pipeline/process-satellite
```

### 18. Build Digital Twin (Terrain)
* **Method:** `POST`
* **URL:** `/api/pipeline/build`
* **Purpose:** Triggers the process to build a 3D terrain digital twin.
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** None
* **Response:** JSON object indicating success status and result paths.
* **Error responses:** `{"success": False, "error": "..."}`
* **Example:**
```bash
curl -X POST http://localhost:8000/api/pipeline/build
```

### 19. Run Full Pipeline
* **Method:** `POST`
* **URL:** `/api/pipeline/run`
* **Purpose:** Runs the complete end-to-end data processing pipeline and clears the cache.
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** None
* **Response:** JSON object indicating success status.
* **Error responses:** `{"success": False, "error": "..."}`
* **Example:**
```bash
curl -X POST http://localhost:8000/api/pipeline/run
```

### 20. Upload LiDAR File
* **Method:** `POST`
* **URL:** `/api/upload/lidar`
* **Purpose:** Upload a LiDAR dataset file (`.las` or `.laz`).
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** `multipart/form-data`
  * `file`: The LiDAR file object.
* **Response:** JSON object indicating upload success and saved file path.
* **Error responses:** `400 Bad Request` or `422 Unprocessable Entity` for invalid inputs.
* **Example:**
```bash
curl -X POST -F "file=@/path/to/my_lidar.laz" http://localhost:8000/api/upload/lidar
```

### 21. Upload Satellite File
* **Method:** `POST`
* **URL:** `/api/upload/satellite`
* **Purpose:** Upload a satellite dataset file (`.jp2`, `.tif`, or `.tiff`).
* **Authentication requirement:** None
* **Parameters:** None
* **Request body:** `multipart/form-data`
  * `file`: The satellite imagery file object.
* **Response:** JSON object indicating upload success and saved file path.
* **Error responses:** `400 Bad Request` or `422 Unprocessable Entity` for invalid inputs.
* **Example:**
```bash
curl -X POST -F "file=@/path/to/my_satellite.tif" http://localhost:8000/api/upload/satellite
```

## API Conventions

1. **Format:**
   - The API uses REST-like principles where appropriate but relies heavily on `GET` and `POST` for RPC-style pipeline commands.
   - All standard request and response bodies (unless uploading files) expect and return `application/json`.
2. **Error Handling:**
   - Most processing and pipeline endpoints do not rely exclusively on HTTP status codes for errors. If an error occurs, they typically return an HTTP `200 OK` response but with a JSON body resembling: `{"success": false, "error": "Error description"}`.
   - Resource fetches (like `GET` requests for meshes) may return a `404 Not Found` with a specific JSON error object `{"error": "mesh not found"}`.
   - Invalid uploads return a `400 Bad Request`.
3. **Performance Optimization:**
   - Huge spatial payloads (Terrain, Buildings) use an in-memory application cache to reduce read overhead.
   - The client should send an `Accept-Encoding: gzip` header when fetching large `GET` payloads (`/api/nz/terrain`, `/api/nz/buildings`, `/api/nz/parcels`, etc.). The server performs manual gzip compression within the endpoints to provide heavily reduced JSON payload sizes over the wire.
4. **Naming Conventions:**
   - All JSON keys are typically `snake_case`.
5. **Spatial Responses:**
   - 3D endpoints consistently return a `crs` (Coordinate Reference System) key representing the native coordinate system of the generated meshes, typically EPSG formats (e.g., `"EPSG:2193"` for New Zealand).
