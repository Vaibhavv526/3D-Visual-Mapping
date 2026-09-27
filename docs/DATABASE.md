# Database Structure

## Database technology
The BhuVista platform currently does not use a traditional relational database management system (RDBMS) or NoSQL database. Instead, it relies on a **File-Based Geospatial Storage Architecture** combined with an **In-Memory Caching Layer**. 

- **Geospatial Data:** Stored as `.vtp` (VTK PolyData) files for 3D meshes and `.tif` (GeoTIFF) files for raster imagery.
- **Metadata and Attributes:** Stored in `.json` files.
- **Serving Layer:** A FastAPI backend (`api.py`) loads these files into memory using PyVista and Rasterio, caches them using thread-safe locks, and serves serialized JSON representations to the frontend.

## Connection configuration
Because the database is file-system based, there are no connection strings, ports, or credentials. "Connections" are configured as absolute and relative path constants in the backend (`api.py`):

```python
BASE_DIR = Path(__file__).resolve().parent
NZ_OUTPUT_DIR = BASE_DIR / "data" / "outputs" / "nz_lidar"

# File "Tables"
NZ_TERRAIN_FILE = NZ_OUTPUT_DIR / "terrain_fused.vtp"
NZ_BUILDING_FILE = NZ_OUTPUT_DIR / "building_fused.vtp"
NZ_PARCELS_FILE = NZ_OUTPUT_DIR / "parcels.json"
```

## Collections/tables
The data is logically divided into the following collections (files):
1. **Terrain Mesh:** `terrain_fused.vtp` - The bare-earth Digital Terrain Model (DTM).
2. **Building Mesh:** `building_fused.vtp` - Extracted 3D building geometries fused with satellite attributes.
3. **Cadastral Parcels:** `parcels.json` - Land property boundaries and metadata.
4. **Satellite Imagery:** `*.tif` (in `sentinel2/`) - Multi-band Sentinel-2 layers (RGB, NDVI).
5. **Analytics:** Generated dynamically (e.g., ML structural profiling, deterministic validation).

## Schema
Since `.vtp` files store 3D models, the schema is defined by **Point Data** arrays mapped to vertex coordinates.

### Terrain Mesh (`terrain_fused.vtp`)
| Field | Type | Description |
|---|---|---|
| `points` | `Float32[N, 3]` | (X, Y, Z) coordinates (EPSG:2193) |
| `faces` | `UInt32[M, 3]` | Triangulation mesh indices |
| `Elevation` | `Float32` | Z-coordinate value (NZVD2016) |
| `Slope` | `Float32` | Topographical slope |
| `RelativeElevation`| `Float32` | Localized relative height |
| `RGB` | `Float32[3]` | Fused Sentinel-2 RGB color values |
| `NDVI` | `Float32` | Normalized Difference Vegetation Index |

### Building Mesh (`building_fused.vtp`)
| Field | Type | Description |
|---|---|---|
| `points` | `Float32[N, 3]` | (X, Y, Z) coordinates (EPSG:2193) |
| `faces` | `UInt32[M, 3]` | Triangulation mesh indices |
| `BuildingID` | `Int32` | Unique integer identifier for the building |
| `Height` | `Float32` | Absolute structural height |
| `GroundElevation` | `Float32` | Minimum elevation at the building's base |
| `RoofElevation` | `Float32` | Maximum elevation at the roof |
| `RGB` | `Float32[3]` | Sentinel-2 RGB sampled at the building centroid |
| `NDVI` | `Float32` | Sentinel-2 NDVI sampled at the building centroid |

### Cadastral Parcels (`parcels.json`)
| Field | Type | Description |
|---|---|---|
| `parcel_id` | `String` | LINZ primary parcel identifier |
| `geometry` | `GeoJSON` | Polygon coordinates of the property bounds |
| `associated_buildings` | `List[Int]` | Foreign key references to `BuildingID` |

## Fields and Data types
Data types strictly follow native numpy sizes (e.g., `np.float32`, `np.uint32`) due to the heavy memory requirements of the 3D meshes (~690k triangles for the terrain). Missing values (NoData) in satellite raster data are filled with `0.0` or `np.nan` during the memory caching process.

## Required fields
- **Meshes:** `points` (vertices) and `faces` (topology) are strictly required to render any 3D object.
- **Attributes:** For buildings, `BuildingID` is required for entity extraction and property association.

## Relationships
Relationships are mostly spatial and computed dynamically or during pipeline fusion:
- **Buildings to Terrain:** Implicitly related through coordinate space (EPSG:2193). Building base elevations correspond to the underlying terrain elevation.
- **Buildings to Parcels:** Solved via spatial Point-in-Polygon (PIP) during the generation of `parcels.json`. One parcel can contain many buildings (`1:N`), and buildings that straddle boundaries are categorized as multi-parcel buildings.
- **Vertices to Faces:** A strict structural relationship where face definitions refer to the array index of the vertices.

## Indexes
Traditional database indexing (e.g., B-Trees) is not used. 
- **Spatial Indexing:** Bounding boxes (`min_x, max_x, min_y, max_y`) are computed per building and stored in the API payload to allow the frontend to index and frame the camera.
- **In-Memory Hash Maps:** The API uses Python dictionaries to map global vertex indices to local building vertex indices during the building mesh extraction phase.

## Constraints
1. **Coordinate Reference System:** All spatial data is strictly constrained to `EPSG:2193`.
2. **Topology constraints:** Triangles must consist of exactly 3 valid vertex indices.
3. **Data Integrity:** The number of attribute values (e.g., NDVI entries) must exactly match the number of vertices (`mesh.n_points`).

## Example documents

**API Building Payload Example (JSON):**
```json
{
  "id": "NZ-B001",
  "vertices": [[1774820.5, 5883010.2, 45.2], ...],
  "faces": [[0, 1, 2], ...],
  "rgb": [[0.1, 0.2, 0.15], ...],
  "ndvi": [0.65, ...],
  "height": 5.4,
  "ground_elevation": 45.2,
  "roof_elevation": 50.6,
  "structural_height": 5.4,
  "structural_roof_elevation": 50.6,
  "point_count": 128,
  "triangle_count": 250,
  "bounds": {
    "min_x": 1774818.0,
    "max_x": 1774825.0,
    "min_y": 5883005.0,
    "max_y": 5883015.0
  }
}
```

## Migration strategy
Since the system acts as a static pipeline rather than an RDBMS, "schema migrations" involve running Python processing scripts (`pipeline/*.py`) to regenerate the outputs.
1. Make changes to the generation logic (e.g., adding a new attribute in `fuse_sentinel_buildings.py`).
2. Run the pipeline script to generate the new `.vtp` or `.json` file.
3. **Crucial:** Never overwrite the existing baselines immediately. Store as a new file (e.g., `building_fused_v2.vtp`), verify the new mesh visually and analytically, and then switch the API endpoints over. 

## Sensitive data
- **Cadastral/Property Data:** `parcels.json` utilizes LINZ property boundaries. Property boundary identification carries legal significance and might be considered sensitive in enterprise scenarios.
- **ML Anomaly Classifications:** The ML pipeline generates automated flags (`Highly unusual`, `Moderately unusual`) based on structural outlier detection. A disclaimer explicitly states that this is purely statistical mapping against a local distribution and does not signify illegal construction or unsafe structures.
