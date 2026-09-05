import pyvista as pv
import rasterio
import numpy as np
from pathlib import Path


BUILDING_PATH = Path(
    "data/outputs/nz_lidar/building_mesh.vtp"
)

SENTINEL_DIR = Path(
    "data/outputs/nz_lidar/sentinel2"
)

OUTPUT_PATH = Path(
    "data/outputs/nz_lidar/building_fused.vtp"
)


print("=" * 70)
print("SENTINEL-2 + LiDAR BUILDING FUSION")
print("=" * 70)


# ---------------------------------------------------------
# Load building mesh
# ---------------------------------------------------------

mesh = pv.read(BUILDING_PATH)

print("\nBuilding mesh:")
print("  Points:", mesh.n_points)
print("  Cells :", mesh.n_cells)


# ---------------------------------------------------------
# Building vertex coordinates
# ---------------------------------------------------------

points = np.asarray(
    mesh.points,
    dtype=np.float64
)

x = points[:, 0]
y = points[:, 1]

coords = list(zip(x, y))


# ---------------------------------------------------------
# Sample Sentinel RGB
# ---------------------------------------------------------

rgb_path = (
    SENTINEL_DIR /
    "RGB_10m_epsg2193.tif"
)

print("\nSampling Sentinel-2 RGB...")

with rasterio.open(rgb_path) as src:

    rgb = np.asarray(
        list(src.sample(coords)),
        dtype=np.float32
    )

red = rgb[:, 0]
green = rgb[:, 1]
blue = rgb[:, 2]


# ---------------------------------------------------------
# Sample NDVI
# ---------------------------------------------------------

ndvi_path = (
    SENTINEL_DIR /
    "NDVI_10m_epsg2193.tif"
)

print("Sampling Sentinel-2 NDVI...")

with rasterio.open(ndvi_path) as src:

    ndvi = np.asarray(
        [
            value[0]
            for value in src.sample(coords)
        ],
        dtype=np.float32
    )

    nodata = src.nodata

    if nodata is not None:

        ndvi[
            ndvi == nodata
        ] = np.nan


# ---------------------------------------------------------
# Clean invalid values
# ---------------------------------------------------------

red = np.nan_to_num(
    red,
    nan=0.0,
    posinf=0.0,
    neginf=0.0
)

green = np.nan_to_num(
    green,
    nan=0.0,
    posinf=0.0,
    neginf=0.0
)

blue = np.nan_to_num(
    blue,
    nan=0.0,
    posinf=0.0,
    neginf=0.0
)

ndvi = np.nan_to_num(
    ndvi,
    nan=0.0,
    posinf=0.0,
    neginf=0.0
)


# ---------------------------------------------------------
# Attach Sentinel data
# ---------------------------------------------------------

mesh.point_data["Red"] = red
mesh.point_data["Green"] = green
mesh.point_data["Blue"] = blue

mesh.point_data["RGB"] = np.column_stack(
    [
        red,
        green,
        blue
    ]
)

mesh.point_data["NDVI"] = ndvi


# ---------------------------------------------------------
# Save fused building mesh
# ---------------------------------------------------------

mesh.save(OUTPUT_PATH)


print("\nFusion complete.")
print("Output:", OUTPUT_PATH)

print("\nPOINT DATA:")

for name in mesh.point_data.keys():

    arr = mesh.point_data[name]

    print(
        f"  {name}: "
        f"{arr.shape}, "
        f"{arr.dtype}"
    )


# ---------------------------------------------------------
# Statistics
# ---------------------------------------------------------

print("\nSentinel statistics:")

for name, arr in [
    ("Red", red),
    ("Green", green),
    ("Blue", blue),
    ("NDVI", ndvi),
]:

    valid = np.isfinite(arr)

    if valid.any():

        print(
            f"  {name:5s}: "
            f"min={arr[valid].min():.4f}, "
            f"max={arr[valid].max():.4f}, "
            f"mean={arr[valid].mean():.4f}, "
            f"valid={valid.sum()}/{len(arr)}"
        )

print("\n" + "=" * 70)
print("BUILDING FUSION COMPLETE")
print("=" * 70)
