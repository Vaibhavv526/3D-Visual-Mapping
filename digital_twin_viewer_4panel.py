import pyvista as pv
import trimesh
import numpy as np
import rasterio
from PIL import Image


# =========================================================
# PATHS
# =========================================================

BASE = "digital_twin_data/AOI-01_Bilaspur/processed"

OBJ_PATH = f"{BASE}/terrain/terrain_aligned.obj"
RGB_PATH = f"{BASE}/satellite/RGB_texture.png"
SLOPE_PATH = f"{BASE}/terrain_analysis/slope_10m.tif"
NDVI_PATH = f"{BASE}/satellite/NDVI_10m.tif"


# =========================================================
# LOAD TERRAIN
# =========================================================

mesh = trimesh.load(OBJ_PATH, force="mesh")

vertices = np.asarray(mesh.vertices).copy()
faces = np.asarray(mesh.faces)

elevation = vertices[:, 2].copy()

print("Terrain vertices:", len(vertices))
print("Terrain faces:", len(faces))


# =========================================================
# VERTICAL EXAGGERATION
# =========================================================

z_min = elevation.min()

vertices[:, 2] = (
    z_min +
    (elevation - z_min) * 3.0
)


# =========================================================
# PYVISTA FACE FORMAT
# =========================================================

pv_faces = np.hstack([
    np.full((len(faces), 1), 3),
    faces
]).astype(np.int64).ravel()


# =========================================================
# LOAD RGB
# =========================================================

rgb_image = np.asarray(
    Image.open(RGB_PATH).convert("RGB")
)

height, width, _ = rgb_image.shape


# Map terrain vertices → RGB pixels

x = vertices[:, 0]
y = vertices[:, 1]

u = (
    (x - x.min()) /
    (x.max() - x.min())
)

v = (
    (y.max() - y) /
    (y.max() - y.min())
)

pixel_x = np.clip(
    (u * (width - 1)).round().astype(int),
    0,
    width - 1
)

pixel_y = np.clip(
    (v * (height - 1)).round().astype(int),
    0,
    height - 1
)

vertex_rgb = rgb_image[pixel_y, pixel_x]


# =========================================================
# LOAD SLOPE
# =========================================================

with rasterio.open(SLOPE_PATH) as src:
    slope = src.read(1).flatten()


# =========================================================
# LOAD NDVI
# =========================================================

with rasterio.open(NDVI_PATH) as src:
    ndvi = src.read(1).flatten()


print("Slope range:", slope.min(), "to", slope.max())
print("NDVI range:", ndvi.min(), "to", ndvi.max())


# =========================================================
# CREATE INDEPENDENT MESHES
# =========================================================

rgb_mesh = pv.PolyData(vertices, pv_faces)
slope_mesh = pv.PolyData(vertices, pv_faces)
elevation_mesh = pv.PolyData(vertices, pv_faces)
ndvi_mesh = pv.PolyData(vertices, pv_faces)


# =========================================================
# ATTACH DATA
# =========================================================

rgb_mesh["RGB"] = vertex_rgb

slope_mesh["Slope"] = slope

elevation_mesh["Elevation"] = elevation

ndvi_mesh["NDVI"] = ndvi


# =========================================================
# CREATE 2 × 2 DIGITAL TWIN VIEW
# =========================================================

plotter = pv.Plotter(
    shape=(2, 2),
    window_size=(1400, 900)
)

plotter.set_background("white")


# =========================================================
# PANEL 1 — SATELLITE RGB
# =========================================================

plotter.subplot(0, 0)

plotter.add_text(
    "1. Satellite RGB",
    position="upper_left",
    font_size=16
)

plotter.add_mesh(
    rgb_mesh,
    scalars="RGB",
    rgb=True,
    show_edges=False
)

plotter.add_axes()

plotter.view_isometric()


# =========================================================
# PANEL 2 — SLOPE
# =========================================================

plotter.subplot(0, 1)

plotter.add_text(
    "2. Slope Analysis",
    position="upper_left",
    font_size=16
)

plotter.add_mesh(
    slope_mesh,
    scalars="Slope",
    cmap="viridis",
    clim=[
        0,
        float(np.nanmax(slope))
    ],
    show_edges=False,
    scalar_bar_args={
        "title": "Slope (degrees)"
    }
)

plotter.add_axes()

plotter.view_isometric()


# =========================================================
# PANEL 3 — ELEVATION
# =========================================================

plotter.subplot(1, 0)

plotter.add_text(
    "3. Elevation",
    position="upper_left",
    font_size=16
)

plotter.add_mesh(
    elevation_mesh,
    scalars="Elevation",
    cmap="terrain",
    clim=[
        float(elevation.min()),
        float(elevation.max())
    ],
    show_edges=False,
    scalar_bar_args={
        "title": "Elevation (m)"
    }
)

plotter.add_axes()

plotter.view_isometric()


# =========================================================
# PANEL 4 — NDVI
# =========================================================

plotter.subplot(1, 1)

plotter.add_text(
    "4. NDVI Vegetation",
    position="upper_left",
    font_size=16
)

plotter.add_mesh(
    ndvi_mesh,
    scalars="NDVI",
    cmap="RdYlGn",
    clim=[
        -1,
        1
    ],
    show_edges=False,
    scalar_bar_args={
        "title": "NDVI"
    }
)

plotter.add_axes()

plotter.view_isometric()


# =========================================================
# SHOW
# =========================================================

plotter.show(
    title="Bilaspur Digital Twin"
)