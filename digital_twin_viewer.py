import pyvista as pv
import trimesh
import numpy as np
import rasterio
from PIL import Image


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

OBJ_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain/terrain_aligned.obj"
)

RGB_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/satellite/RGB_texture.png"
)

SLOPE_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain_analysis/slope_10m.tif"
)


# ---------------------------------------------------------
# Load terrain
# ---------------------------------------------------------

mesh = trimesh.load(
    OBJ_PATH,
    force="mesh"
)

vertices = np.asarray(mesh.vertices).copy()
faces = np.asarray(mesh.faces)

elevation = vertices[:, 2].copy()


# ---------------------------------------------------------
# Vertical exaggeration
# ---------------------------------------------------------

z_min = elevation.min()

vertices[:, 2] = (
    z_min +
    (elevation - z_min) * 3.0
)


# ---------------------------------------------------------
# PyVista face format
# ---------------------------------------------------------

pv_faces = np.hstack([
    np.full(
        (len(faces), 1),
        3
    ),
    faces
]).astype(
    np.int64
).ravel()


# ---------------------------------------------------------
# Load RGB image
# ---------------------------------------------------------

rgb_image = np.asarray(
    Image.open(
        RGB_PATH
    ).convert("RGB")
)

height, width, _ = rgb_image.shape


# ---------------------------------------------------------
# Map RGB image to vertices
# ---------------------------------------------------------

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

vertex_rgb = rgb_image[
    pixel_y,
    pixel_x
]


# ---------------------------------------------------------
# Load slope
# ---------------------------------------------------------

with rasterio.open(
    SLOPE_PATH
) as src:

    slope = src.read(1)

slope = slope.flatten()


# ---------------------------------------------------------
# Create three independent meshes
# ---------------------------------------------------------

rgb_mesh = pv.PolyData(
    vertices,
    pv_faces
)

slope_mesh = pv.PolyData(
    vertices,
    pv_faces
)

elevation_mesh = pv.PolyData(
    vertices,
    pv_faces
)


# ---------------------------------------------------------
# Attach data
# ---------------------------------------------------------

rgb_mesh["RGB"] = vertex_rgb

slope_mesh["Slope"] = slope

elevation_mesh["Elevation"] = elevation


# ---------------------------------------------------------
# Create one multi-panel plotter
# ---------------------------------------------------------

plotter = pv.Plotter(
    shape=(1, 3),
    window_size=(1500, 600)
)


# =========================================================
# PANEL 1 — SATELLITE RGB
# =========================================================

plotter.subplot(0, 0)

plotter.add_text(
    "Satellite RGB",
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
    "Slope Analysis",
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

plotter.subplot(0, 2)

plotter.add_text(
    "Elevation",
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


# ---------------------------------------------------------
# Display
# ---------------------------------------------------------

plotter.show(
    title="Bilaspur Digital Twin"
)