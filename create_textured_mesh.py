import trimesh
import numpy as np
from PIL import Image

OBJ_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain/terrain_aligned.obj"
)

TEXTURE_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/satellite/RGB_texture.png"
)

OUTPUT_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain/terrain_textured.obj"
)

mesh = trimesh.load(OBJ_PATH, force="mesh")
texture = Image.open(TEXTURE_PATH).convert("RGB")

print("Mesh vertices:", len(mesh.vertices))
print("Mesh faces:", len(mesh.faces))
print("Texture size:", texture.size)

#UV-coordinate generation
vertices = np.asarray(mesh.vertices)

x = vertices[:, 0]
y = vertices[:, 1]

u = (x - x.min()) / (x.max() - x.min())
v = (y - y.min()) / (y.max() - y.min())

uv = np.column_stack((u, 1.0 - v))

print("UV coordinates:", uv.shape)
print("U range:", uv[:, 0].min(), "to", uv[:, 0].max())
print("V range:", uv[:, 1].min(), "to", uv[:, 1].max())

mesh.visual = trimesh.visual.texture.TextureVisuals(
    uv=uv,
    image=texture
)

mesh.export(OUTPUT_PATH)

print("Textured mesh created successfully!")
print("Output:", OUTPUT_PATH)