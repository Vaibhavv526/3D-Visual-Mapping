from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import json


app = FastAPI(
    title="Bilaspur Digital Twin API",
    description="Terrain, slope, elevation and NDVI analytics API",
    version="1.0.0",
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