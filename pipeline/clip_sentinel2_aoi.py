import rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling
from rasterio.windows import from_bounds
from rasterio.transform import from_origin
from pathlib import Path
import numpy as np

SRC_CRS = "EPSG:32760"
DST_CRS = "EPSG:2193"

# LiDAR AOI
MIN_X = 1774720.0
MIN_Y = 5882640.0
MAX_X = 1775680.0
MAX_Y = 5884080.0

INPUT_DIR = Path("data/inputs/sentinel2/T60HUD")
OUTPUT_DIR = Path("data/outputs/nz_lidar/sentinel2")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

bands = {
    "B02": "T60HUD_20260805T222541_B02_10m.jp2",
    "B03": "T60HUD_20260805T222541_B03_10m.jp2",
    "B04": "T60HUD_20260805T222541_B04_10m.jp2",
    "B08": "T60HUD_20260805T222541_B08_10m.jp2",
}

for band, filename in bands.items():

    input_path = INPUT_DIR / filename
    output_path = OUTPUT_DIR / f"{band}_10m_epsg2193.tif"

    print(f"\nProcessing {band}...")
    
    with rasterio.open(input_path) as src:

        # Transform only the AOI into Sentinel's CRS.
        from rasterio.warp import transform_bounds

        src_bounds = transform_bounds(
            DST_CRS,
            SRC_CRS,
            MIN_X,
            MIN_Y,
            MAX_X,
            MAX_Y,
            densify_pts=21,
        )

        window = from_bounds(
            *src_bounds,
            transform=src.transform,
        )

        # Add a tiny safety margin.
        window = window.round_offsets().round_lengths()

        data = src.read(1, window=window)

        window_transform = src.window_transform(window)

        # Calculate destination transform for the clipped AOI.
        dst_transform, dst_width, dst_height = calculate_default_transform(
            src.crs,
            DST_CRS,
            data.shape[1],
            data.shape[0],
            *src_bounds,
            resolution=10,
        )

        destination = np.zeros(
            (dst_height, dst_width),
            dtype=np.uint16,
        )

        reproject(
            source=data,
            destination=destination,
            src_transform=window_transform,
            src_crs=SRC_CRS,
            dst_transform=dst_transform,
            dst_crs=DST_CRS,
            resampling=Resampling.bilinear,
        )

        profile = src.profile.copy()
        profile.update(
            driver="GTiff",
            height=dst_height,
            width=dst_width,
            transform=dst_transform,
            crs=DST_CRS,
            dtype="uint16",
            count=1,
            compress="deflate",
            predictor=2,
            tiled=True,
        )

        with rasterio.open(output_path, "w", **profile) as dst:
            dst.write(destination, 1)

        print("  Output :", output_path)
        print("  Size   :", dst_width, "x", dst_height)
        print("  CRS    :", DST_CRS)
        print("  Res    :", dst_transform.a, "m")

print("\nAll Sentinel bands clipped and reprojected successfully.")
