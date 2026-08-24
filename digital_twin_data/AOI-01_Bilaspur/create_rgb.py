from pathlib import Path

import numpy as np
import rasterio


SATELLITE_DIR = Path(
    "digital_twin_data/AOI-01_Bilaspur/processed/satellite"
)

RED_FILE = SATELLITE_DIR / "B04_10m.tif"
GREEN_FILE = SATELLITE_DIR / "B03_10m.tif"
BLUE_FILE = SATELLITE_DIR / "B02_10m.tif"

OUTPUT_FILE = SATELLITE_DIR / "RGB_10m.tif"


def normalize_band(band):
    """
    Convert Sentinel-2 reflectance values
    into display-ready 8-bit values.
    """

    valid = band[band > 0]

    low = np.percentile(valid, 2)
    high = np.percentile(valid, 98)

    band = np.clip(
        band,
        low,
        high,
    )

    band = (
        (band - low)
        / (high - low)
        * 255
    )

    return band.astype(np.uint8)


with rasterio.open(RED_FILE) as red_src:
    red = red_src.read(1)
    metadata = red_src.meta.copy()

with rasterio.open(GREEN_FILE) as green_src:
    green = green_src.read(1)

with rasterio.open(BLUE_FILE) as blue_src:
    blue = blue_src.read(1)


red = normalize_band(red)
green = normalize_band(green)
blue = normalize_band(blue)


rgb = np.stack(
    [red, green, blue],
    axis=0,
)


metadata.update(
    {
        "driver": "GTiff",
        "dtype": "uint8",
        "count": 3,
    }
)


with rasterio.open(
    OUTPUT_FILE,
    "w",
    **metadata,
) as dst:

    dst.write(rgb)


print("=" * 60)
print("RGB CREATION COMPLETE")
print("=" * 60)
print("Output:", OUTPUT_FILE)
print("Shape :", rgb.shape)
print("CRS   :", metadata["crs"])
print("Resolution:", metadata["transform"].a)