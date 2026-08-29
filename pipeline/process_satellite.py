from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject


def find_band(
    satellite_dir: Path,
    band: str,
) -> Path:

    matches = sorted(
        satellite_dir.rglob(
            f"*_{band}_10m.jp2"
        )
    )

    if not matches:
        raise FileNotFoundError(
            f"Sentinel-2 {band} 10m band not found"
        )

    return matches[0]


def read_band(path: Path):

    with rasterio.open(path) as src:

        data = src.read(1).astype(
            np.float32
        )

        profile = src.profile.copy()

        return (
            data,
            src.transform,
            src.crs,
            src.bounds,
            profile,
        )


def normalize_to_uint8(
    data: np.ndarray,
) -> np.ndarray:

    data = np.nan_to_num(
        data,
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    minimum = np.percentile(
        data,
        2,
    )

    maximum = np.percentile(
        data,
        98,
    )

    if maximum <= minimum:
        return np.zeros_like(
            data,
            dtype=np.uint8,
        )

    normalized = (
        (data - minimum)
        / (maximum - minimum)
        * 255.0
    )

    return np.clip(
        normalized,
        0,
        255,
    ).astype(np.uint8)


def build_satellite_products(
    satellite_dir: Path,
    reference_path: Path,
    rgb_output: Path,
    ndvi_output: Path,
):

    print("Searching Sentinel-2 bands...")

    blue_path = find_band(
        satellite_dir,
        "B02",
    )

    green_path = find_band(
        satellite_dir,
        "B03",
    )

    red_path = find_band(
        satellite_dir,
        "B04",
    )

    nir_path = find_band(
        satellite_dir,
        "B08",
    )

    print("Blue :", blue_path)
    print("Green:", green_path)
    print("Red  :", red_path)
    print("NIR  :", nir_path)

    with rasterio.open(
        reference_path
    ) as ref:

        reference_shape = (
            ref.height,
            ref.width,
        )

        reference_transform = (
            ref.transform
        )

        reference_crs = ref.crs

        reference_profile = (
            ref.profile.copy()
        )

    def reproject_band(
        source_path: Path,
    ):

        destination = np.empty(
            reference_shape,
            dtype=np.float32,
        )

        with rasterio.open(
            source_path
        ) as src:

            reproject(
                source=rasterio.band(
                    src,
                    1,
                ),
                destination=destination,
                src_transform=src.transform,
                src_crs=src.crs,
                dst_transform=reference_transform,
                dst_crs=reference_crs,
                resampling=Resampling.bilinear,
            )

        return destination

    print("Aligning satellite bands to LiDAR grid...")

    blue = reproject_band(
        blue_path
    )

    green = reproject_band(
        green_path
    )

    red = reproject_band(
        red_path
    )

    nir = reproject_band(
        nir_path
    )

    # -----------------------------------------------------
    # RGB
    # -----------------------------------------------------

    rgb = np.stack(
        [
            normalize_to_uint8(red),
            normalize_to_uint8(green),
            normalize_to_uint8(blue),
        ],
        axis=0,
    )

    rgb_profile = reference_profile.copy()

    rgb_profile.update(
        driver="GTiff",
        count=3,
        dtype="uint8",
        compress="deflate",
        nodata=None,
    )

    rgb_output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with rasterio.open(
        rgb_output,
        "w",
        **rgb_profile,
    ) as dst:

        dst.write(rgb)

    # -----------------------------------------------------
    # NDVI
    # -----------------------------------------------------

    denominator = nir + red

    ndvi = np.divide(
        nir - red,
        denominator,
        out=np.zeros_like(nir),
        where=denominator != 0,
    )

    ndvi = np.clip(
        ndvi,
        -1.0,
        1.0,
    ).astype(np.float32)

    ndvi_profile = reference_profile.copy()

    ndvi_profile.update(
        driver="GTiff",
        count=1,
        dtype="float32",
        compress="deflate",
        nodata=-9999.0,
    )

    ndvi_output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with rasterio.open(
        ndvi_output,
        "w",
        **ndvi_profile,
    ) as dst:

        dst.write(
            ndvi,
            1,
        )

    print()
    print("=" * 60)
    print("SATELLITE PROCESSING COMPLETE")
    print("=" * 60)
    print("RGB :", rgb_output)
    print("NDVI:", ndvi_output)
    print(
        "NDVI range:",
        float(ndvi.min()),
        "→",
        float(ndvi.max()),
    )

    return {
        "rgb": rgb_output,
        "ndvi": ndvi_output,
    }
