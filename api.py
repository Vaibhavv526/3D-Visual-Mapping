from pathlib import Path
import json
import gzip
import time
import threading
import logging
from contextlib import asynccontextmanager
from pipeline.build_digital_twin import build_digital_twin
from pipeline.process_lidar import build_dtm
from pipeline.process_satellite import build_satellite_products
from pipeline.run_pipeline import run_pipeline
from pipeline.compare_terrain import compare_terrain
from pipeline.validate_geospatial_inputs import validate
import numpy as np
import pyvista as pv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Response,
)
from pipeline.uploads import (
    save_uploaded_file,
    SATELLITE_DIR,
    LIDAR_DIR,
)
# =========================================================
# PATHS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

ANALYTICS_FILE = (
    BASE_DIR
    / "data"
    / "terrain"
    / "terrain_analytics.json"
)

TERRAIN_FILE = (
    BASE_DIR
    / "digital_twin_data"
    / "AOI-01_Bilaspur"
    / "processed"
    / "terrain_analysis"
    / "bilaspur_digital_twin_mesh.vtp"
)

# =========================================================
# NEW ZEALAND LiDAR PROTOTYPE
# =========================================================

NZ_OUTPUT_DIR = (
    BASE_DIR
    / "data"
    / "outputs"
    / "nz_lidar"
)

NZ_TERRAIN_FILE = (
    NZ_OUTPUT_DIR
    / "terrain_fused.vtp"
)

NZ_BUILDING_FILE = (
    NZ_OUTPUT_DIR
    / "building_mesh.vtp"
)

NZ_BUILDING_POINTS_FILE = (
    NZ_OUTPUT_DIR
    / "building_points.vtp"
)

NZ_LIDAR_CRS = "EPSG:2193"

# =========================================================
# IN-MEMORY CACHE FOR NEW ZEALAND ASSETS
# =========================================================

logger = logging.getLogger("uvicorn.error")

_nz_cache_lock = threading.Lock()
_cached_nz_terrain_bytes: bytes | None = None
_cached_nz_terrain_gzip: bytes | None = None
_cached_nz_buildings_bytes: bytes | None = None
_cached_nz_buildings_gzip: bytes | None = None


def invalidate_nz_cache():
    global _cached_nz_terrain_bytes, _cached_nz_terrain_gzip
    global _cached_nz_buildings_bytes, _cached_nz_buildings_gzip
    with _nz_cache_lock:
        _cached_nz_terrain_bytes = None
        _cached_nz_terrain_gzip = None
        _cached_nz_buildings_bytes = None
        _cached_nz_buildings_gzip = None
    logger.info("[PERF:CACHE] NZ in-memory cache invalidated.")


def prepare_nz_terrain_cache() -> bytes:
    global _cached_nz_terrain_bytes, _cached_nz_terrain_gzip
    if _cached_nz_terrain_bytes is not None:
        return _cached_nz_terrain_bytes

    with _nz_cache_lock:
        if _cached_nz_terrain_bytes is not None:
            return _cached_nz_terrain_bytes

        if not NZ_TERRAIN_FILE.exists():
            return b'{"error": "New Zealand terrain mesh not found"}'

        t0 = time.perf_counter()
        logger.info("[PERF:CACHE] Warming NZ terrain cache...")
        mesh = pv.read(NZ_TERRAIN_FILE)

        points = np.asarray(
            mesh.points,
            dtype=np.float32
        )

        elevation = np.asarray(
            mesh.point_data.get(
                "Elevation",
                points[:, 2]
            ),
            dtype=np.float32
        )

        points = np.nan_to_num(
            points,
            nan=0.0,
            posinf=0.0,
            neginf=0.0
        )

        elevation = np.nan_to_num(
            elevation,
            nan=0.0,
            posinf=0.0,
            neginf=0.0
        )

        slope = np.asarray(
            mesh.point_data.get(
                "Slope",
                np.zeros(mesh.n_points)
            ),
            dtype=np.float32
        )

        slope = np.nan_to_num(
            slope,
            nan=0.0,
            posinf=0.0,
            neginf=0.0
        )

        relative_elevation = np.asarray(
            mesh.point_data.get(
                "RelativeElevation",
                np.zeros(mesh.n_points)
            ),
            dtype=np.float32
        )

        relative_elevation = np.nan_to_num(
            relative_elevation,
            nan=0.0,
            posinf=0.0,
            neginf=0.0
        )

        raw_faces = np.asarray(
            mesh.faces,
            dtype=np.uint32
        )

        triangle_faces = []
        offset = 0
        raw_faces_len = len(raw_faces)

        while offset < raw_faces_len:
            vertex_count = int(raw_faces[offset])
            vertices = raw_faces[offset + 1: offset + 1 + vertex_count]
            if vertex_count >= 3:
                for i in range(1, vertex_count - 1):
                    triangle_faces.append([
                        int(vertices[0]),
                        int(vertices[i]),
                        int(vertices[i + 1]),
                    ])
            offset += vertex_count + 1

        faces = np.asarray(
            triangle_faces,
            dtype=np.uint32
        )

        rgb = np.asarray(
            mesh.point_data.get(
                "RGB",
                np.zeros((mesh.n_points, 3))
            ),
            dtype=np.float32
        )

        rgb = np.nan_to_num(
            rgb,
            nan=0.0,
            posinf=0.0,
            neginf=0.0
        )

        ndvi = np.asarray(
            mesh.point_data.get(
                "NDVI",
                np.zeros(mesh.n_points)
            ),
            dtype=np.float32
        )

        ndvi = np.nan_to_num(
            ndvi,
            nan=0.0,
            posinf=0.0,
            neginf=0.0
        )

        payload = {
            "vertices": points.tolist(),
            "faces": faces.tolist(),
            "elevation": elevation.tolist(),
            "slope": slope.tolist(),
            "relative_elevation": relative_elevation.tolist(),
            "rgb": rgb.tolist(),
            "ndvi": ndvi.tolist(),
            "vertex_count": int(mesh.n_points),
            "triangle_count": int(mesh.n_cells),
            "crs": NZ_LIDAR_CRS,
            "dataset": "New Zealand LiDAR",
        }

        json_str = json.dumps(payload)
        _cached_nz_terrain_bytes = json_str.encode("utf-8")
        _cached_nz_terrain_gzip = gzip.compress(_cached_nz_terrain_bytes, compresslevel=6)
        elapsed = time.perf_counter() - t0
        logger.info(
            f"[PERF:CACHE] NZ terrain cached in {elapsed:.3f}s: "
            f"{len(_cached_nz_terrain_bytes) / 1024 / 1024:.2f} MB raw, "
            f"{len(_cached_nz_terrain_gzip) / 1024 / 1024:.2f} MB gzip"
        )
        return _cached_nz_terrain_bytes


def prepare_nz_buildings_cache() -> bytes:
    global _cached_nz_buildings_bytes, _cached_nz_buildings_gzip
    if _cached_nz_buildings_bytes is not None:
        return _cached_nz_buildings_bytes

    with _nz_cache_lock:
        if _cached_nz_buildings_bytes is not None:
            return _cached_nz_buildings_bytes

        building_file = NZ_OUTPUT_DIR / "building_fused.vtp"
        if not building_file.exists():
            return b'{"error": "Fused New Zealand building mesh not found"}'

        t0 = time.perf_counter()
        logger.info("[PERF:CACHE] Warming NZ buildings cache...")
        mesh = pv.read(building_file)

        points = np.asarray(
            mesh.points,
            dtype=np.float32
        )

        points = np.nan_to_num(
            points,
            nan=0.0,
            posinf=0.0,
            neginf=0.0
        )

        building_ids = np.asarray(
            mesh.point_data["BuildingID"],
            dtype=np.int32
        )

        rgb_all = np.asarray(
            mesh.point_data.get(
                "RGB",
                np.zeros((mesh.n_points, 3), dtype=np.float32)
            ),
            dtype=np.float32
        )

        ndvi_all = np.asarray(
            mesh.point_data.get(
                "NDVI",
                np.zeros(mesh.n_points, dtype=np.float32)
            ),
            dtype=np.float32
        )

        height_all = np.asarray(
            mesh.point_data.get(
                "Height",
                np.zeros(mesh.n_points, dtype=np.float32)
            ),
            dtype=np.float32
        )

        ground_all = np.asarray(
            mesh.point_data.get(
                "GroundElevation",
                np.zeros(mesh.n_points, dtype=np.float32)
            ),
            dtype=np.float32
        )

        roof_all = np.asarray(
            mesh.point_data.get(
                "RoofElevation",
                np.zeros(mesh.n_points, dtype=np.float32)
            ),
            dtype=np.float32
        )

        rgb_all = np.nan_to_num(rgb_all, nan=0.0, posinf=0.0, neginf=0.0)
        ndvi_all = np.nan_to_num(ndvi_all, nan=0.0, posinf=0.0, neginf=0.0)
        height_all = np.nan_to_num(height_all, nan=0.0, posinf=0.0, neginf=0.0)
        ground_all = np.nan_to_num(ground_all, nan=0.0, posinf=0.0, neginf=0.0)
        roof_all = np.nan_to_num(roof_all, nan=0.0, posinf=0.0, neginf=0.0)

        raw_faces = np.asarray(mesh.faces, dtype=np.uint32)
        triangle_faces = []
        offset = 0
        raw_faces_len = len(raw_faces)

        while offset < raw_faces_len:
            vertex_count = int(raw_faces[offset])
            vertices = raw_faces[offset + 1: offset + 1 + vertex_count]
            if vertex_count >= 3:
                for i in range(1, vertex_count - 1):
                    triangle_faces.append([
                        int(vertices[0]),
                        int(vertices[i]),
                        int(vertices[i + 1]),
                    ])
            offset += vertex_count + 1

        triangle_faces = np.asarray(triangle_faces, dtype=np.uint32)

        buildings = []
        unique_ids = np.unique(building_ids)

        for building_number in unique_ids:
            point_indices = np.where(building_ids == building_number)[0]
            if len(point_indices) < 3:
                continue

            local_index = {
                int(global_index): local_idx
                for local_idx, global_index in enumerate(point_indices)
            }

            building_faces = []
            for face in triangle_faces:
                a, b, c = map(int, face)
                if a in local_index and b in local_index and c in local_index:
                    building_faces.append([
                        local_index[a],
                        local_index[b],
                        local_index[c],
                    ])

            if not building_faces:
                continue

            building_points = points[point_indices]
            building_rgb = rgb_all[point_indices]
            building_ndvi = ndvi_all[point_indices]
            building_heights = height_all[point_indices]
            building_ground = ground_all[point_indices]
            building_roof = roof_all[point_indices]

            buildings.append({
                "id": f"NZ-B{int(building_number):03d}",
                "vertices": building_points.tolist(),
                "faces": np.asarray(building_faces, dtype=np.uint32).tolist(),
                "rgb": building_rgb.tolist(),
                "ndvi": building_ndvi.tolist(),
                "height": float(np.max(building_heights)),
                "ground_elevation": float(np.mean(building_ground)),
                "roof_elevation": float(np.max(building_roof)),
                "point_count": int(len(building_points)),
                "triangle_count": int(len(building_faces)),
                "min_elevation": float(building_points[:, 2].min()),
                "max_elevation": float(building_points[:, 2].max()),
                "height_range": float(
                    building_points[:, 2].max() - building_points[:, 2].min()
                ),
                "bounds": {
                    "min_x": float(building_points[:, 0].min()),
                    "max_x": float(building_points[:, 0].max()),
                    "min_y": float(building_points[:, 1].min()),
                    "max_y": float(building_points[:, 1].max()),
                },
            })

        payload = {
            "buildings": buildings,
            "building_count": len(buildings),
            "crs": NZ_LIDAR_CRS,
            "dataset": "New Zealand LiDAR + Sentinel-2",
        }

        json_str = json.dumps(payload)
        _cached_nz_buildings_bytes = json_str.encode("utf-8")
        _cached_nz_buildings_gzip = gzip.compress(_cached_nz_buildings_bytes, compresslevel=6)
        elapsed = time.perf_counter() - t0
        logger.info(
            f"[PERF:CACHE] NZ buildings cached in {elapsed:.3f}s: "
            f"{len(_cached_nz_buildings_bytes) / 1024 / 1024:.2f} MB raw, "
            f"{len(_cached_nz_buildings_gzip) / 1024 / 1024:.2f} MB gzip ({len(buildings)} buildings)"
        )
        return _cached_nz_buildings_bytes


def get_nz_terrain_payload(wants_gzip: bool) -> tuple[bytes, bool]:
    prepare_nz_terrain_cache()
    if wants_gzip and _cached_nz_terrain_gzip is not None:
        return _cached_nz_terrain_gzip, True
    return _cached_nz_terrain_bytes or b"{}", False


def get_nz_buildings_payload(wants_gzip: bool) -> tuple[bytes, bool]:
    prepare_nz_buildings_cache()
    if wants_gzip and _cached_nz_buildings_gzip is not None:
        return _cached_nz_buildings_gzip, True
    return _cached_nz_buildings_bytes or b"{}", False


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    logger.info("[STARTUP] Pre-warming NZ Digital Twin in-memory cache...")
    try:
        prepare_nz_terrain_cache()
        prepare_nz_buildings_cache()
    except Exception as exc:
        logger.error(f"[ERROR] Failed to initialize NZ cache during startup: {exc}")
    yield


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="Bilaspur Digital Twin API",
    description="Terrain, slope, elevation and NDVI analytics API",
    version="1.0.0",
    lifespan=lifespan,
)

# =========================================================
# LIDAR PROCESSING
# =========================================================

@app.post("/api/pipeline/process-lidar")
def process_lidar():

    lidar_files = sorted(
        LIDAR_DIR.glob("*.las")
    ) + sorted(
        LIDAR_DIR.glob("*.laz")
    )

    if not lidar_files:
        return {
            "success": False,
            "status": "no_lidar",
            "error": "No LiDAR file uploaded",
        }

    lidar_file = lidar_files[-1]

    # -----------------------------------------------------
    # Validate LiDAR against Bilaspur AOI
    # -----------------------------------------------------

    try:

        validation = validate(
            lidar_file
        )

    except Exception as exc:

        return {
            "success": False,
            "status": "validation_error",
            "filename": lidar_file.name,
            "error": str(exc),
        }

    if not validation.get("compatible", False):

        return {
            "success": False,
            "status": "incompatible",
            "filename": lidar_file.name,
            "error": (
                "LiDAR does not overlap the "
                "Bilaspur AOI."
            ),
            "validation": validation,
        }

    # -----------------------------------------------------
    # Build LiDAR DTM
    # -----------------------------------------------------

    output = (
        BASE_DIR
        / "data"
        / "outputs"
        / "terrain"
        / "lidar_dtm.tif"
    )

    slope_output = (
        BASE_DIR
        / "data"
        / "outputs"
        / "terrain"
        / "slope.tif"
    )

    try:

        result = build_dtm(
            lidar_file,
            output,
            slope_output,
            resolution=10.0,
        )

        return {
            "success": True,
            "status": "processed",
            "filename": lidar_file.name,
            "output": str(result["dtm"]),
            "slope": str(result["slope"]),
            "crs": str(result["crs"]),
            "resolution_m": result["resolution"],
            "width": result["width"],
            "height": result["height"],
            "validation": validation,
        }

    except Exception as exc:

        return {
            "success": False,
            "status": "processing_error",
            "filename": lidar_file.name,
            "error": str(exc),
            "validation": validation,
        }


# =========================================================
# SATELLITE PROCESSING
# =========================================================

@app.post("/api/pipeline/process-satellite")
def process_satellite():

    satellite_files = sorted(
        SATELLITE_DIR.rglob("*.jp2")
    ) + sorted(
        SATELLITE_DIR.rglob("*.tif")
    ) + sorted(
        SATELLITE_DIR.rglob("*.tiff")
    )

    if not satellite_files:
        return {
            "success": False,
            "error": "No satellite data uploaded",
        }

    # For Sentinel-2, the uploaded directory may contain
    # multiple JP2 bands. Select the B02/B03/B04/B08 files
    # from the upload directory.
    satellite_dir = SATELLITE_DIR

    reference = (
        BASE_DIR
        / "data"
        / "outputs"
        / "terrain"
        / "lidar_dtm.tif"
    )

    if not reference.exists():
        return {
            "success": False,
            "error": (
                "LiDAR DTM not found. "
                "Process LiDAR before satellite data."
            ),
        }

    rgb_output = (
        BASE_DIR
        / "data"
        / "outputs"
        / "satellite"
        / "RGB.tif"
    )

    ndvi_output = (
        BASE_DIR
        / "data"
        / "outputs"
        / "satellite"
        / "NDVI.tif"
    )

    try:

        result = build_satellite_products(
            satellite_dir,
            reference,
            rgb_output,
            ndvi_output,
        )

        return {
            "success": True,
            "rgb": str(result["rgb"]),
            "ndvi": str(result["ndvi"]),
        }

    except Exception as exc:

        return {
            "success": False,
            "error": str(exc),
        }


# =========================================================
# FULL DIGITAL TWIN PIPELINE
# =========================================================

@app.post("/api/pipeline/run")
def run_full_pipeline():

    try:

        result = run_pipeline()
        invalidate_nz_cache()

        return {
            "success": True,
            **result,
        }

    except Exception as exc:

        return {
            "success": False,
            "error": str(exc),
        }


# =========================================================
# REACT FRONTEND
# =========================================================

FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
# =========================================================
# CORS
# =========================================================

app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROOT / HEALTH
# =========================================================

@app.get("/")
def root():
    if FRONTEND_DIST.exists():
        return FileResponse(
            FRONTEND_DIST / "index.html"
        )

    return {
        "project": "Bilaspur Digital Twin",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "terrain_available": TERRAIN_FILE.exists(),
        "analytics_available": ANALYTICS_FILE.exists(),
        "nz_terrain_available": NZ_TERRAIN_FILE.exists(),
        "nz_building_mesh_available": NZ_BUILDING_FILE.exists(),
        "nz_building_points_available": NZ_BUILDING_POINTS_FILE.exists(),
    }


# =========================================================
# ANALYTICS
# =========================================================

@app.get("/api/analytics")
def get_analytics():

    if not ANALYTICS_FILE.exists():
        return {
            "error": "Analytics file not found"
        }

    with open(ANALYTICS_FILE, "r") as file:
        data = json.load(file)

    return data


# =========================================================
# 3D TERRAIN DATA
# =========================================================

@app.post("/api/pipeline/build")
def build_pipeline():
    try:
        result = build_digital_twin()
        invalidate_nz_cache()

        return {
            "success": True,
            **result,
        }

    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
        }


@app.get("/api/terrain")
def get_terrain():

    if not TERRAIN_FILE.exists():
        return {
            "error": "Terrain mesh file not found"
        }

    mesh = pv.read(TERRAIN_FILE)

    points = mesh.points.astype(np.float32)

    elevation = np.asarray(
        mesh.point_data["Elevation"],
        dtype=np.float32
    )

    ndvi = np.asarray(
        mesh.point_data["NDVI"],
        dtype=np.float32
    )

    slope = np.asarray(
        mesh.point_data["Slope"],
        dtype=np.float32
    )

    rgb = np.asarray(
        mesh.point_data["RGB"],
        dtype=np.uint8
    )

    # Replace NaN / Infinity values
    elevation = np.nan_to_num(
        elevation,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    ndvi = np.nan_to_num(
        ndvi,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    slope = np.nan_to_num(
        slope,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    points = np.nan_to_num(
        points,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    faces = mesh.faces.reshape(-1, 4)[:, 1:].astype(
        np.uint32
    )

    rgb = np.asarray(
        mesh.point_data.get(
            "RGB",
            np.zeros((mesh.n_points, 3))
        ),
        dtype=np.float32
    )

    rgb = np.nan_to_num(
        rgb,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    ndvi = np.asarray(
        mesh.point_data.get(
            "NDVI",
            np.zeros(mesh.n_points)
        ),
        dtype=np.float32
    )

    ndvi = np.nan_to_num(
        ndvi,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    return {
        "vertices": points.tolist(),
        "faces": faces.tolist(),
        "elevation": elevation.tolist(),
        "ndvi": ndvi.tolist(),
        "slope": slope.tolist(),
        "rgb": rgb.tolist(),
        "vertex_count": mesh.n_points,
        "triangle_count": mesh.n_cells,
        "crs": "EPSG:32644"
    }
# =========================================================
# NEW ZEALAND LiDAR TERRAIN
# =========================================================

# =========================================================
# NEW ZEALAND DIGITAL TWIN METADATA
# =========================================================

@app.get("/api/nz/metadata")
def get_nz_metadata():

    terrain_vertices = 0
    terrain_triangles = 0
    building_count = 0
    lidar_points = 0

    elevation_min = None
    elevation_max = None
    slope_min = None
    slope_max = None

    # ---------------------------------------------------------
    # Terrain
    # ---------------------------------------------------------

    if NZ_TERRAIN_FILE.exists():

        terrain = pv.read(
            NZ_TERRAIN_FILE
        )

        terrain_vertices = int(
            terrain.n_points
        )

        terrain_triangles = int(
            terrain.n_cells
        )

        if "Elevation" in terrain.point_data:

            elevation = np.asarray(
                terrain.point_data["Elevation"],
                dtype=np.float32
            )

            elevation_min = float(
                np.nanmin(elevation)
            )

            elevation_max = float(
                np.nanmax(elevation)
            )

        if "Slope" in terrain.point_data:

            slope = np.asarray(
                terrain.point_data["Slope"],
                dtype=np.float32
            )

            slope_min = float(
                np.nanmin(slope)
            )

            slope_max = float(
                np.nanmax(slope)
            )

    # ---------------------------------------------------------
    # Buildings
    # ---------------------------------------------------------

    if NZ_BUILDING_FILE.exists():

        buildings = pv.read(
            NZ_BUILDING_FILE
        )

        if "BuildingID" in buildings.point_data:

            ids = np.asarray(
                buildings.point_data["BuildingID"]
            )

            building_count = int(
                len(np.unique(ids))
            )

    # ---------------------------------------------------------
    # LiDAR
    # ---------------------------------------------------------

    lidar_points = 21_138_016

    # ---------------------------------------------------------
    # Metadata response
    # ---------------------------------------------------------

    rgb = np.asarray(
        mesh.point_data.get(
            "RGB",
            np.zeros((mesh.n_points, 3))
        ),
        dtype=np.float32
    )

    rgb = np.nan_to_num(
        rgb,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    ndvi = np.asarray(
        mesh.point_data.get(
            "NDVI",
            np.zeros(mesh.n_points)
        ),
        dtype=np.float32
    )

    ndvi = np.nan_to_num(
        ndvi,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    return {

        "dataset":
            "New Zealand LiDAR + Sentinel-2",

        "crs":
            NZ_LIDAR_CRS,

        "lidar_tiles":
            4,

        "lidar_points":
            lidar_points,

        "buildings":
            building_count,

        "terrain_vertices":
            terrain_vertices,

        "terrain_triangles":
            terrain_triangles,

        "elevation_min":
            elevation_min,

        "elevation_max":
            elevation_max,

        "slope_min":
            slope_min,

        "slope_max":
            slope_max,

        "layers": [

            "Elevation",

            "Slope",

            "RelativeElevation",

            "RGB",

            "NDVI"

        ],

        "coordinate_system": {

            "horizontal":
                "NZGD2000 / New Zealand Transverse Mercator 2000",

            "vertical":
                "NZVD2016",

            "epsg":
                2193

        }

    }


@app.get("/api/nz/terrain")
def get_nz_terrain(request: Request):

    if not NZ_TERRAIN_FILE.exists():
        return Response(
            content=b'{"error": "New Zealand terrain mesh not found"}',
            status_code=404,
            media_type="application/json",
        )

    accept_encoding = request.headers.get("accept-encoding", "").lower()
    content_bytes, is_gzip = get_nz_terrain_payload("gzip" in accept_encoding)
    headers = {"Content-Encoding": "gzip"} if is_gzip else {}
    return Response(
        content=content_bytes,
        media_type="application/json",
        headers=headers,
    )


# =========================================================
# NEW ZEALAND LiDAR BUILDINGS
# =========================================================

@app.get("/api/nz/buildings")
def get_nz_buildings(request: Request):

    building_file = NZ_OUTPUT_DIR / "building_fused.vtp"

    if not building_file.exists():
        return Response(
            content=b'{"error": "Fused New Zealand building mesh not found"}',
            status_code=404,
            media_type="application/json",
        )

    accept_encoding = request.headers.get("accept-encoding", "").lower()
    content_bytes, is_gzip = get_nz_buildings_payload("gzip" in accept_encoding)
    headers = {"Content-Encoding": "gzip"} if is_gzip else {}
    return Response(
        content=content_bytes,
        media_type="application/json",
        headers=headers,
    )



@app.get("/api/nz/buildings/points")
def get_nz_building_points():

    if not NZ_BUILDING_POINTS_FILE.exists():
        return {
            "error": "New Zealand building point cloud not found"
        }

    cloud = pv.read(
        NZ_BUILDING_POINTS_FILE
    )

    points = np.asarray(
        cloud.points,
        dtype=np.float32
    )

    points = np.nan_to_num(
        points,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    rgb = np.asarray(
        mesh.point_data.get(
            "RGB",
            np.zeros((mesh.n_points, 3))
        ),
        dtype=np.float32
    )

    rgb = np.nan_to_num(
        rgb,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    ndvi = np.asarray(
        mesh.point_data.get(
            "NDVI",
            np.zeros(mesh.n_points)
        ),
        dtype=np.float32
    )

    ndvi = np.nan_to_num(
        ndvi,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    return {
        "points": points.tolist(),
        "point_count": cloud.n_points,
        "crs": NZ_LIDAR_CRS,
        "classification": 6,
        "description": "LiDAR building-classified points"
    }
# =========================================================
# DATA UPLOAD
# =========================================================

@app.post("/api/upload/satellite")
async def upload_satellite(
    file: UploadFile = File(...)
):

    try:
        output = save_uploaded_file(
            file.file,
            file.filename or "satellite.tif",
            SATELLITE_DIR,
        )

        return {
            "success": True,
            "type": "satellite",
            "filename": output.name,
            "path": str(output),
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


@app.post("/api/upload/lidar")
async def upload_lidar(
    file: UploadFile = File(...)
):

    try:
        output = save_uploaded_file(
            file.file,
            file.filename or "lidar.laz",
            LIDAR_DIR,
        )

        return {
            "success": True,
            "type": "lidar",
            "filename": output.name,
            "path": str(output),
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
# =========================================================
# REACT FRONTEND
# =========================================================

if FRONTEND_DIST.exists():

    app.mount(
        "/assets",
        StaticFiles(
            directory=FRONTEND_DIST / "assets"
        ),
        name="frontend-assets",
    )

    @app.get("/favicon.svg")
    def favicon():
        return FileResponse(
            FRONTEND_DIST / "favicon.svg"
        )

    @app.get("/icons.svg")
    def icons():
        return FileResponse(
            FRONTEND_DIST / "icons.svg"
        )