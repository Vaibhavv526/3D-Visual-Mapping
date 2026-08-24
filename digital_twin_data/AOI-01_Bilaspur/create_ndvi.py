from pathlib import Path

import numpy as np
import rasterio


SATELLITE_DIR = Path(
    "digital_twin_data/AOI-01_Bilaspur/processed/satellite"
)

RED_FILE = SATELLITE_DIR / "B04_10m.tif"
NIR_FILE = SATELLITE_DIR / "B08_10m.tif"

OUTPUT_FILE = SATELLITE_DIR / "NDVI_10m.tif"


with rasterio.open(RED_FILE) as red_src:
    red = red_src.read(1).astype(np.float32)
    metadata = red_src.meta.copy()

with rasterio.open(NIR_FILE) as nir_src:
    nir = nir_src.read(1).astype(np.float32)


# Calculate NDVI
denominator = nir + red

ndvi = np.zeros_like(red, dtype=np.float32)

valid = denominator != 0

ndvi[valid] = (
    (nir[valid] - red[valid])
    / denominator[valid]
)


# Write NDVI GeoTIFF
metadata.update(
    {
        "driver": "GTiff",
        "dtype": "float32",
        "count": 1,
        "nodata": -9999,
    }
)

ndvi[~valid] = -9999


with rasterio.open(
    OUTPUT_FILE,
    "w",
    **metadata,
) as dst:

    dst.write(ndvi, 1)


valid_ndvi = ndvi[ndvi != -9999]

print("=" * 60)
print("NDVI CREATION COMPLETE")
print("=" * 60)
print("Output:", OUTPUT_FILE)
print("Shape :", ndvi.shape)
print("CRS   :", metadata["crs"])
print("Resolution:", metadata["transform"].a)
print("Min NDVI:", valid_ndvi.min())
print("Max NDVI:", valid_ndvi.max())
print("Mean NDVI:", valid_ndvi.mean())