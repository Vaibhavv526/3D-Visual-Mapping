from pathlib import Path
import json
from pipeline.build_digital_twin import build_digital_twin
from pipeline.process_lidar import build_dtm
from pipeline.process_satellite import build_satellite_products
from pipeline.run_pipeline import run_pipeline
import numpy as np
import pyvista as pv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
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
# APPLICATION
# =========================================================

app = FastAPI(
    title="Bilaspur Digital Twin API",
    description="Terrain, slope, elevation and NDVI analytics API",
    version="1.0.0",
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
            "error": "No LiDAR file uploaded"
        }

    lidar_file = lidar_files[-1]

    output = (
        BASE_DIR
        / "data"
        / "outputs"
        / "terrain"
        / "lidar_dtm.tif"
    )

    try:

        slope_output = (
            BASE_DIR
            / "data"
            / "outputs"
            / "terrain"
            / "slope.tif"
        )

        result = build_dtm(
            lidar_file,
            output,
            slope_output,
            resolution=10.0,
        )

        return {
            "success": True,
            "filename": lidar_file.name,
            "output": str(result["dtm"]),
            "slope": str(result["slope"]),
            "crs": str(result["crs"]),
            "resolution_m": result["resolution"],
            "width": result["width"],
            "height": result["height"],
        }

    except Exception as exc:

        return {
            "success": False,
            "error": str(exc),
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