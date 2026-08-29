from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling


BASE_DIR = Path(__file__).resolve().parents[1]

COPERNICUS_DEM = next(
    BASE_DIR.rglob(
        "Copernicus_DSM_10_N22_00_E082_00_DEM.tif"
    )
)

TARGET_DEM = (
    BASE_DIR
    / "digital_twin_data"
    / "AOI-01_Bilaspur"
    / "processed"
    / "terrain"
    / "DEM_10m_aligned.tif"
)

TARGET_SLOPE = (
    BASE_DIR
    / "digital_twin_data"
    / "AOI-01_Bilaspur"
    / "processed"
    / "terrain_analysis"
    / "slope_10m.tif"
)

REFERENCE = (
    BASE_DIR
    / "digital_twin_data"
    / "AOI-01_Bilaspur"
    / "processed"
    / "satellite"
    / "RGB_10m.tif"
)


print("=" * 70)
print("PREPARING COPERNICUS DEM FOR BILASPUR")
print("=" * 70)

print()
print("Source DEM:")
print(COPERNICUS_DEM)

print()
print("Reference grid:")
print(REFERENCE)


with rasterio.open(REFERENCE) as ref:

    target_crs = ref.crs
    target_transform = ref.transform
    target_width = ref.width
    target_height = ref.height

    print()
    print("Target CRS :", target_crs)
    print("Target grid:", target_width, "x", target_height)
    print("Resolution :", ref.res)


with rasterio.open(COPERNICUS_DEM) as src:

    source = src.read(1).astype(np.float32)

    destination = np.full(
        (target_height, target_width),
        np.nan,
        dtype=np.float32,
    )

    reproject(
        source=source,
        destination=destination,
        src_transform=src.transform,
        src_crs=src.crs,
        dst_transform=target_transform,
        dst_crs=target_crs,
        resampling=Resampling.bilinear,
    )


valid = np.isfinite(destination)

if not valid.any():
    raise ValueError(
        "Copernicus DEM does not overlap the Bilaspur reference grid."
    )

print()
print("Valid DEM pixels:", int(valid.sum()))

print(
    "Elevation:",
    float(np.nanmin(destination)),
    "->",
    float(np.nanmax(destination)),
    "m",
)

mean_elevation = float(np.nanmean(destination))

print(
    "Mean elevation:",
    mean_elevation,
    "m",
)


# Fill any remaining gaps using nearest valid value.
if not valid.all():

    from scipy.ndimage import distance_transform_edt

    missing = ~valid

    indices = distance_transform_edt(
        missing,
        return_distances=False,
        return_indices=True,
    )

    destination[missing] = destination[
        tuple(indices)
    ][missing]


# ---------------------------------------------------------
# Save aligned DEM
# ---------------------------------------------------------

TARGET_DEM.parent.mkdir(
    parents=True,
    exist_ok=True,
)

profile = {
    "driver": "GTiff",
    "height": target_height,
    "width": target_width,
    "count": 1,
    "dtype": "float32",
    "crs": target_crs,
    "transform": target_transform,
    "nodata": -9999.0,
    "compress": "deflate",
}

with rasterio.open(
    TARGET_DEM,
    "w",
    **profile,
) as dst:

    dst.write(
        destination.astype(np.float32),
        1,
    )


# ---------------------------------------------------------
# Calculate slope
# ---------------------------------------------------------

resolution_x = abs(target_transform.a)
resolution_y = abs(target_transform.e)

dz_dy, dz_dx = np.gradient(
    destination,
    resolution_y,
    resolution_x,
)

slope = np.degrees(
    np.arctan(
        np.sqrt(
            dz_dx ** 2
            + dz_dy ** 2
        )
    )
).astype(np.float32)


TARGET_SLOPE.parent.mkdir(
    parents=True,
    exist_ok=True,
)

with rasterio.open(
    TARGET_SLOPE,
    "w",
    **profile,
) as dst:

    dst.write(slope, 1)


print()
print("=" * 70)
print("COPERNICUS DEM PREPARATION COMPLETE")
print("=" * 70)

print("DEM    :", TARGET_DEM)
print("Slope  :", TARGET_SLOPE)

print(
    "Slope range:",
    float(slope.min()),
    "->",
    float(slope.max()),
    "degrees",
)

print()
print("Terrain source: Copernicus DEM")
print("CRS:", target_crs)
print("Resolution:", resolution_x, "m")
