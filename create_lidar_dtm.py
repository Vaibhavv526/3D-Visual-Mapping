import laspy
import numpy as np
import rasterio
from rasterio.transform import from_origin
from scipy.ndimage import distance_transform_edt


# =========================================================
# INPUT / OUTPUT
# =========================================================

INPUT = "lidar_data/ground.laz"

OUTPUT = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain_analysis/lidar_dtm_1m.tif"
)


# =========================================================
# LOAD GROUND POINTS
# =========================================================

print("Loading ground LiDAR...")

las = laspy.read(INPUT)

x = np.asarray(las.x)
y = np.asarray(las.y)
z = np.asarray(las.z)

print(f"Ground points: {len(z):,}")


# =========================================================
# 1 METRE GRID
# =========================================================

resolution = 1.0

xmin = np.floor(x.min())
xmax = np.ceil(x.max())

ymin = np.floor(y.min())
ymax = np.ceil(y.max())

width = int(np.ceil((xmax - xmin) / resolution))
height = int(np.ceil((ymax - ymin) / resolution))

print(f"Grid size: {width} x {height}")
print(f"Resolution: {resolution} m")


# =========================================================
# MAP POINTS TO GRID CELLS
# =========================================================

col = ((x - xmin) / resolution).astype(np.int32)

row = (
    (ymax - y) / resolution
).astype(np.int32)

valid = (
    (row >= 0) &
    (row < height) &
    (col >= 0) &
    (col < width)
)

row = row[valid]
col = col[valid]
z = z[valid]


# =========================================================
# BUILD DTM
# =========================================================

print("Building elevation grid...")

dtm = np.full(
    (height, width),
    np.nan,
    dtype=np.float32
)


# For ground points in each cell, keep the minimum elevation.
flat_index = row * width + col

order = np.argsort(z)

flat_index_sorted = flat_index[order]
z_sorted = z[order]

unique_cells, first_indices = np.unique(
    flat_index_sorted,
    return_index=True
)

minimum_z = z_sorted[first_indices]

dtm.flat[unique_cells] = minimum_z.astype(
    np.float32
)


# =========================================================
# FILL EMPTY CELLS
# =========================================================

missing = np.isnan(dtm)

missing_count = int(missing.sum())

print(f"Empty cells before filling: {missing_count:,}")


if missing_count > 0:

    valid_mask = ~missing

    if valid_mask.any():

        indices = distance_transform_edt(
            missing,
            return_distances=False,
            return_indices=True
        )

        filled = dtm[
            tuple(indices)
        ]

        dtm[missing] = filled[missing]


# =========================================================
# SAVE GEOTIFF
# =========================================================

transform = from_origin(
    xmin,
    ymax,
    resolution,
    resolution
)


with rasterio.open(
    OUTPUT,
    "w",
    driver="GTiff",
    height=height,
    width=width,
    count=1,
    dtype="float32",
    crs="EPSG:3301",
    transform=transform,
    nodata=-9999.0,
    compress="deflate"
) as dst:

    dst.write(
        dtm,
        1
    )


# =========================================================
# SUMMARY
# =========================================================

print()
print("=" * 55)
print("        LiDAR DTM CREATED")
print("=" * 55)

print(
    f"Grid          : {width} × {height}"
)

print(
    f"Resolution    : {resolution} m"
)

print(
    f"Elevation min : {np.nanmin(dtm):.2f} m"
)

print(
    f"Elevation max : {np.nanmax(dtm):.2f} m"
)

print(
    f"Elevation mean: {np.nanmean(dtm):.2f} m"
)

print(
    f"Output        : {OUTPUT}"
)

print("=" * 55)