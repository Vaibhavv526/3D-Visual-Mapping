import rasterio
import numpy as np
from pathlib import Path

INPUT_DIR = Path("data/outputs/nz_lidar/sentinel2")
OUTPUT_DIR = Path("data/outputs/nz_lidar/sentinel2")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def read_band(name):
    path = INPUT_DIR / f"{name}_10m_epsg2193.tif"
    with rasterio.open(path) as src:
        data = src.read(1).astype(np.float32)
        profile = src.profile.copy()
        return data, profile

B02, profile = read_band("B02")
B03, _ = read_band("B03")
B04, _ = read_band("B04")
B08, _ = read_band("B08")

# Sentinel-2 L2A reflectance scaling
B02 /= 10000.0
B03 /= 10000.0
B04 /= 10000.0
B08 /= 10000.0

# RGB
rgb = np.stack([B04, B03, B02], axis=0)

# NDVI
denominator = B08 + B04
ndvi = np.zeros_like(B08, dtype=np.float32)

valid = denominator > 0
ndvi[valid] = (B08[valid] - B04[valid]) / denominator[valid]

# Save RGB
rgb_profile = profile.copy()
rgb_profile.update(
    driver="GTiff",
    count=3,
    dtype="float32",
    compress="deflate",
    predictor=3,
    nodata=0,
)

with rasterio.open(
    OUTPUT_DIR / "RGB_10m_epsg2193.tif",
    "w",
    **rgb_profile,
) as dst:
    dst.write(rgb)

# Save NDVI
ndvi_profile = profile.copy()
ndvi_profile.update(
    driver="GTiff",
    count=1,
    dtype="float32",
    compress="deflate",
    predictor=3,
    nodata=-9999,
)

ndvi_output = ndvi.copy()
ndvi_output[~valid] = -9999

with rasterio.open(
    OUTPUT_DIR / "NDVI_10m_epsg2193.tif",
    "w",
    **ndvi_profile,
) as dst:
    dst.write(ndvi_output, 1)

print("Sentinel layers created successfully.")
print()
print("RGB:")
print("  R = B04")
print("  G = B03")
print("  B = B02")
print()
print("NDVI:")
print(f"  Min  = {float(ndvi[valid].min()):.4f}")
print(f"  Max  = {float(ndvi[valid].max()):.4f}")
print(f"  Mean = {float(ndvi[valid].mean()):.4f}")
print()
print("Outputs:")
print(" ", OUTPUT_DIR / "RGB_10m_epsg2193.tif")
print(" ", OUTPUT_DIR / "NDVI_10m_epsg2193.tif")
