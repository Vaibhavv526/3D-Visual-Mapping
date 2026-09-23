import pyvista as pv
import rasterio
import numpy as np
import scipy.ndimage
from pathlib import Path

TERRAIN_PATH = Path("data/outputs/nz_lidar/terrain_layers.vtp")
SENTINEL_DIR = Path("data/outputs/nz_lidar/sentinel2")

mesh = pv.read(TERRAIN_PATH)
points = mesh.points
x = points[:, 0]
y = points[:, 1]

rgb_path = SENTINEL_DIR / "RGB_10m_epsg2193.tif"

# 1. NEAREST (Current)
with rasterio.open(rgb_path) as src:
    coords = list(zip(x, y))
    rgb_nearest = np.array(
        list(src.sample(coords)),
        dtype=np.float32,
    )

# 2. BILINEAR
with rasterio.open(rgb_path) as src:
    img = src.read()
    inv_transform = ~src.transform
    cols, rows = inv_transform * (x, y)
    coords_for_scipy = np.vstack([rows, cols])
    
    red_b = scipy.ndimage.map_coordinates(img[0], coords_for_scipy, order=1, mode='nearest')
    green_b = scipy.ndimage.map_coordinates(img[1], coords_for_scipy, order=1, mode='nearest')
    blue_b = scipy.ndimage.map_coordinates(img[2], coords_for_scipy, order=1, mode='nearest')
    rgb_bilinear = np.column_stack([red_b, green_b, blue_b]).astype(np.float32)

print("Nearest   RGB (first 5):", rgb_nearest[:5])
print("Bilinear  RGB (first 5):", rgb_bilinear[:5])
print("Max diff:", np.max(np.abs(rgb_nearest - rgb_bilinear)))
print("Mean diff:", np.mean(np.abs(rgb_nearest - rgb_bilinear)))

# Save bilinear mesh for frontend test
mesh.point_data["RGB"] = rgb_bilinear
mesh.save("data/outputs/nz_lidar/terrain_fused_bilinear.vtp")
print("Saved bilinear test mesh to terrain_fused_bilinear.vtp")
