import pyvista as pv
import rasterio
import numpy as np
from pathlib import Path

TERRAIN_PATH = Path("data/outputs/nz_lidar/terrain_layers.vtp")
SENTINEL_DIR = Path("data/outputs/nz_lidar/sentinel2")
OUTPUT_PATH = Path("data/outputs/nz_lidar/terrain_fused.vtp")

mesh = pv.read(TERRAIN_PATH)

print("Terrain:")
print("  Points:", mesh.n_points)
print("  Cells :", mesh.n_cells)

# ---------------------------------------------------------
# LiDAR vertex coordinates
# ---------------------------------------------------------

points = mesh.points
x = points[:, 0]
y = points[:, 1]

# ---------------------------------------------------------
# Sample a raster at all LiDAR vertices
# ---------------------------------------------------------

def sample_raster(path):
    with rasterio.open(path) as src:
        coords = list(zip(x, y))
        values = np.array(
            [v[0] for v in src.sample(coords)],
            dtype=np.float32,
        )

        nodata = src.nodata

        if nodata is not None:
            values[values == nodata] = np.nan

        return values


print("\nSampling Sentinel layers...")

rgb_path = SENTINEL_DIR / "RGB_10m_epsg2193.tif"
ndvi_path = SENTINEL_DIR / "NDVI_10m_epsg2193.tif"

# RGB raster has 3 bands.
with rasterio.open(rgb_path) as src:
    coords = list(zip(x, y))

    rgb = np.array(
        list(src.sample(coords)),
        dtype=np.float32,
    )

    # Raster order is R, G, B.
    red = rgb[:, 0]
    green = rgb[:, 1]
    blue = rgb[:, 2]

ndvi = sample_raster(ndvi_path)

# ---------------------------------------------------------
# Attach data to LiDAR vertices
# ---------------------------------------------------------

mesh.point_data["Red"] = red
mesh.point_data["Green"] = green
mesh.point_data["Blue"] = blue
mesh.point_data["NDVI"] = ndvi

# Combined RGB array for visualization.
mesh.point_data["RGB"] = np.column_stack(
    [red, green, blue]
)

# ---------------------------------------------------------
# Save fused terrain
# ---------------------------------------------------------

mesh.save(OUTPUT_PATH)

print("\nFusion complete.")
print("Output:", OUTPUT_PATH)

print("\nPOINT DATA:")

for name in mesh.point_data.keys():
    arr = mesh.point_data[name]
    print(f"  {name}: {arr.shape}, {arr.dtype}")

print("\nSentinel statistics:")

for name, arr in [
    ("Red", red),
    ("Green", green),
    ("Blue", blue),
    ("NDVI", ndvi),
]:
    valid = np.isfinite(arr)

    print(
        f"  {name:5s}: "
        f"min={arr[valid].min():.4f}, "
        f"max={arr[valid].max():.4f}, "
        f"mean={arr[valid].mean():.4f}, "
        f"valid={valid.sum()}/{len(arr)}"
    )
