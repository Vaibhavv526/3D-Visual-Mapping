import pyvista as pv
import trimesh
import numpy as np

OBJ_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain/terrain_aligned.obj"
)

SLOPE_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain_analysis/slope_10m.tif"
)

mesh = trimesh.load(OBJ_PATH, force="mesh")

vertices = np.asarray(mesh.vertices).copy()
faces = np.asarray(mesh.faces)

# Vertical exaggeration for visualization
z_min = vertices[:, 2].min()
vertices[:, 2] = z_min + (vertices[:, 2] - z_min) * 3.0

# PyVista face format
pv_faces = np.hstack([
    np.full((len(faces), 1), 3),
    faces
]).astype(np.int64).ravel()

terrain = pv.PolyData(vertices, pv_faces)

# Load slope raster
import rasterio

with rasterio.open(SLOPE_PATH) as src:
    slope = src.read(1)

# Flatten slope values and attach them to mesh vertices
terrain["Slope (degrees)"] = slope.flatten()

plotter = pv.Plotter()
plotter.set_background("white")

plotter.add_mesh(
    terrain,
    scalars="Slope (degrees)",
    cmap="viridis",
    clim=[0, float(np.nanmax(slope))],
    show_edges=False,
    show_scalar_bar=True,
)

plotter.show(
    title="Bilaspur 3D Terrain - Slope Analysis",
    window_size=[1200, 800],
)