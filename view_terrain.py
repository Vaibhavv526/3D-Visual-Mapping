import pyvista as pv
import trimesh
import numpy as np

OBJ_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain/terrain_textured.obj"
)

mesh = trimesh.load(OBJ_PATH, force="mesh")

vertices = np.asarray(mesh.vertices).copy()
faces = np.asarray(mesh.faces)

# Vertical exaggeration for visualization
z_min = vertices[:, 2].min()
vertices[:, 2] = z_min + (vertices[:, 2] - z_min) * 3.0

# Generate UV coordinates from terrain X/Y coordinates
x = vertices[:, 0]
y = vertices[:, 1]

u = (x - x.min()) / (x.max() - x.min())
v = (y - y.min()) / (y.max() - y.min())

uv = np.column_stack((u, 1.0 - v))

pv_faces = np.hstack([
    np.full((len(faces), 1), 3),
    faces
]).astype(np.int64).ravel()

terrain = pv.PolyData(vertices, pv_faces)

# Load satellite RGB texture
texture_path = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/satellite/RGB_texture.png"
)

texture = pv.read_texture(texture_path)

# Attach UV coordinates to the mesh
terrain.active_texture_coordinates = uv

texture_path = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/satellite/RGB_texture.png"
)

texture = pv.read_texture(texture_path)

terrain.active_texture_coordinates = uv

plotter = pv.Plotter()

plotter.add_mesh(
    terrain,
    texture=texture,
    show_edges=False,
)

plotter.set_background("white")

plotter.show(
    title="Bilaspur 3D Digital Twin",
    window_size=[1200, 800],
)