import numpy as np
import rasterio

DEM_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain/DEM_10m_aligned.tif"
)

OUTPUT_PATH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain/terrain_aligned.obj"
)

with rasterio.open(DEM_PATH) as src:
    dem = src.read(1)
    transform = src.transform

print("DEM shape:", dem.shape)
print("Elevation range:", dem.min(), "to", dem.max(), "meters")

height, width = dem.shape

vertices = []

for row in range(height):
    for col in range(width):
        x, y = rasterio.transform.xy(transform, row, col)
        z = float(dem[row, col])

        vertices.append((x, y, z))

print("Number of vertices:", len(vertices))

faces = []

for row in range(height - 1):
    for col in range(width - 1):
        top_left = row * width + col
        top_right = top_left + 1
        bottom_left = (row + 1) * width + col
        bottom_right = bottom_left + 1

        faces.append((top_left, bottom_left, top_right))
        faces.append((top_right, bottom_left, bottom_right))

print("Number of faces:", len(faces))

with open(OUTPUT_PATH, "w") as f:
    f.write("# Bilaspur 3D Terrain Mesh\n")

    for x, y, z in vertices:
        f.write(f"v {x:.3f} {y:.3f} {z:.3f}\n")

    for a, b, c in faces:
        f.write(f"f {a + 1} {b + 1} {c + 1}\n")

print("Mesh created successfully!")
print("Output:", OUTPUT_PATH)