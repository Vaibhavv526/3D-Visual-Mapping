import glob
import json
from pathlib import Path

import rasterio
from rasterio.mask import mask
from shapely.geometry import shape
from pyproj import Transformer
from shapely.ops import transform


# Paths
AOI_FILE = Path(
    "digital_twin_data/AOI-01_Bilaspur/metadata/aoi.geojson"
)

OUTPUT_DIR = Path(
    "digital_twin_data/AOI-01_Bilaspur/processed/satellite"
)

RAW_PATTERN = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "row/**/R10m/*_{band}_10m.jp2"
)

BANDS = ["B02", "B03", "B04", "B08"]


# Load AOI
with open(AOI_FILE) as f:
    geojson = json.load(f)

aoi_geometry = shape(
    geojson["features"][0]["geometry"]
)


# Create output directory
OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


for band in BANDS:

    print()
    print("=" * 60)
    print(f"PROCESSING {band}")
    print("=" * 60)

    # Find band
    pattern = RAW_PATTERN.format(band=band)

    files = glob.glob(
        pattern,
        recursive=True,
    )

    if not files:
        raise FileNotFoundError(
            f"{band} 10m file not found."
        )

    input_file = files[0]

    # Open Sentinel-2 raster
    with rasterio.open(input_file) as src:

        # Reproject AOI to raster CRS
        transformer = Transformer.from_crs(
            "EPSG:4326",
            src.crs,
            always_xy=True,
        )

        aoi_projected = transform(
            transformer.transform,
            aoi_geometry,
        )

        # Clip raster
        clipped, clipped_transform = mask(
            src,
            [aoi_projected],
            crop=True,
        )

        metadata = src.meta.copy()

        metadata.update(
            {
                "height": clipped.shape[1],
                "width": clipped.shape[2],
                "transform": clipped_transform,
                "driver": "GTiff",
            }
        )

    # Output
    output_file = (
        OUTPUT_DIR / f"{band}_10m.tif"
    )

    with rasterio.open(
        output_file,
        "w",
        **metadata,
    ) as dst:

        dst.write(clipped)

    print("Input :", input_file)
    print("Output:", output_file)
    print("Shape :", clipped.shape)
    print("CRS   :", metadata["crs"])
    print("Resolution:", metadata["transform"].a)