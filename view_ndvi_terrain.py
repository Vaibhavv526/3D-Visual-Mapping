import pyvista as pv
import trimesh
import numpy as np
import rasterio


OBJ_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain/terrain_aligned.obj"
)

NDVI_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/satellite/NDVI_10m.tif"
)


# Load terrain
mesh = trimesh.load(
    OBJ_PATH,
    force="mesh"
)

vertices = np.asarray(mesh.vertices).copy()
faces = np.asarray(mesh.faces)

elevation = vertices[:, 2].copy()


# Vertical exaggeration
z_min = elevation.min()

vertices[:, 2] = (
    z_min +
    (elevation - z_min) * 3.0
)


# PyVista face format
pv_faces = np.hstack([
    np.full((len(faces), 1), 3),
    faces
]).astype(np.int64).ravel()


terrain = pv.PolyData(
    vertices,
    pv_faces
)


# Load NDVI
with rasterio.open(NDVI_PATH) as src:
    ndvi = src.read(1)


ndvi = ndvi.flatten()


# Attach NDVI
terrain["NDVI"] = ndvi


# Create viewer
plotter = pv.Plotter()

plotter.set_background("white")


plotter.add_text(
    "Bilaspur 3D Terrain - NDVI Vegetation Analysis",
    position="upper_left",
    font_size=16
)


plotter.add_mesh(
    terrain,
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

plotter.show(
    title="Bilaspur NDVI Analysis",
    window_size=[1200, 800]
)