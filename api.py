from pathlib import Path
import json

import numpy as np
import pyvista as pv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


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
    / "data"
    / "terrain"
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
