from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import json
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Bilaspur Digital Twin API",
    description="Terrain, slope, elevation and NDVI analytics API",
    version="1.0.0",
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
app.mount(
    "/dashboard",
    StaticFiles(directory="dashboard", html=True),
    name="dashboard",
)

@app.get("/dashboard")
def dashboard():
    return FileResponse("dashboard/index.html")

ANALYTICS_FILE = Path(
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain_analysis/terrain_analytics.json"
)


@app.get("/")
def root():
    return {
        "project": "Bilaspur Digital Twin",
        "status": "running",
        "version": "1.0.0",
    }


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

    import pyvista as pv
    import numpy as np

    mesh_path = (
        "digital_twin_data/AOI-01_Bilaspur/"
        "processed/terrain_analysis/"
        "bilaspur_digital_twin_mesh.vtp"
    )

    mesh = pv.read(mesh_path)

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

    # Replace NaN / Infinity values so JSON serialization works
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