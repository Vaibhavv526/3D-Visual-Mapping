from pathlib import Path

import numpy as np
import rasterio
from rasterio.io import MemoryFile
from rasterio.merge import merge
from rasterio.warp import calculate_default_transform, reproject, Resampling
from rasterio.windows import from_bounds
from pyproj import CRS


BASE_DIR = Path(__file__).resolve().parents[1]

NZ_DATA = BASE_DIR / "New Zealand data"

OUTPUT_DIR = (
    BASE_DIR
    / "data"
    / "outputs"
    / "nz_lidar"
    / "sentinel2"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

TARGET_CRS = "EPSG:2193"

LIDAR_TERRAIN = (
    BASE_DIR
    / "data"
    / "outputs"
    / "nz_lidar"
    / "terrain.vtp"
)

ARCHIVES = [
    (
        NZ_DATA
        / "S2C_MSIL2A_20260825T222541_N0512_R029_T60HTF_20260826T023315.SAFE.zip",
        "T60HTF",
    ),
    (
        NZ_DATA
        / "S2C_MSIL2A_20260825T222541_N0512_R029_T60HTG_20260826T023315.SAFE.zip",
        "T60HTG",
    ),
]

BANDS = [
    "B02",
    "B03",
    "B04",
    "B08",
]


def sentinel_path(
    archive,
    tile,
    band,
):

    safe_name = archive.name[:-4]

    granule = (
        f"GRANULE/"
        f"L2A_{tile}_A010295_20260825T222539/"
        f"IMG_DATA/R10m/"
    )

    filename = (
        f"{tile}_20260825T222541_{band}_10m.jp2"
    )

    return (
        f"/vsizip/{archive.resolve()}/"
        f"{safe_name}/"
        f"{granule}"
        f"{filename}"
    )


def get_lidar_bounds():

    import pyvista as pv

    terrain = pv.read(
        LIDAR_TERRAIN
    )

    bounds = terrain.bounds

    return (
        float(bounds[0]),
        float(bounds[1]),
        float(bounds[2]),
        float(bounds[3]),
    )


def read_band(
    archive,
    tile,
    band,
):

    path = sentinel_path(
        archive,
        tile,
        band,
    )

    src = rasterio.open(path)

    return src


def main():

    print("=" * 80)
    print("SENTINEL-2 RGB + NDVI PROCESSING")
    print("=" * 80)

    # ---------------------------------------------------------
    # Validate CRS
    # ---------------------------------------------------------

    print()
    print("Target CRS:", TARGET_CRS)

    target_crs = CRS.from_user_input(
        TARGET_CRS
    )

    print(
        "Target CRS name:",
        target_crs.name
    )

    # ---------------------------------------------------------
    # LiDAR bounds
    # ---------------------------------------------------------

    xmin, xmax, ymin, ymax = (
        get_lidar_bounds()
    )

    print()
    print("LiDAR bounds:")
    print("X:", xmin, "->", xmax)
    print("Y:", ymin, "->", ymax)

    # ---------------------------------------------------------
    # Open Sentinel bands
    # ---------------------------------------------------------

    datasets = {}

    for archive, tile in ARCHIVES:

        print()
        print("-" * 80)
        print("Tile:", tile)
        print("-" * 80)

        datasets[tile] = {}

        for band in BANDS:

            src = read_band(
                archive,
                tile,
                band,
            )

            print(
                band,
                "| CRS:",
                src.crs,
                "| size:",
                src.width,
                "x",
                src.height,
                "| resolution:",
                src.res,
            )

            if src.width != 10980:
                raise RuntimeError(
                    f"{tile} {band}: unexpected width"
                )

            if src.height != 10980:
                raise RuntimeError(
                    f"{tile} {band}: unexpected height"
                )

            if src.res != (10.0, 10.0):
                raise RuntimeError(
                    f"{tile} {band}: expected 10m resolution"
                )

            datasets[tile][band] = src

    # ---------------------------------------------------------
    # Verify band alignment within each tile
    # ---------------------------------------------------------

    for tile in datasets:

        reference = datasets[tile]["B04"]

        for band in BANDS:

            src = datasets[tile][band]

            if src.crs != reference.crs:
                raise RuntimeError(
                    f"{tile}: CRS mismatch for {band}"
                )

            if src.transform != reference.transform:
                raise RuntimeError(
                    f"{tile}: transform mismatch for {band}"
                )

    print()
    print("Band alignment validation: PASSED")

    # ---------------------------------------------------------
    # Build merged RGB / NDVI in Sentinel native CRS
    # ---------------------------------------------------------

    def merge_band(band):

        sources = [
            datasets[tile][band]
            for tile in datasets
        ]

        array, transform = merge(
            sources,
            bounds=(
                # Keep the complete Sentinel coverage.
                None
                if False
                else sources[0].bounds.left,
                sources[0].bounds.bottom,
                sources[-1].bounds.right,
                sources[0].bounds.top,
            ),
        )

        return (
            array[0].astype(
                np.float32
            ),
            transform,
            sources[0].crs,
        )

    # ---------------------------------------------------------
    # Use rasterio.merge directly without manually assuming
    # the tile arrangement.
    # ---------------------------------------------------------

    def merge_band_safe(band):

        sources = [
            datasets[tile][band]
            for tile in datasets
        ]

        array, transform = merge(
            sources
        )

        return (
            array[0].astype(
                np.float32
            ),
            transform,
            sources[0].crs,
        )

    blue, transform, native_crs = (
        merge_band_safe("B02")
    )

    green, _, _ = (
        merge_band_safe("B03")
    )

    red, _, _ = (
        merge_band_safe("B04")
    )

    nir, _, _ = (
        merge_band_safe("B08")
    )

    print()
    print("Sentinel native CRS:")
    print(native_crs)

    print()
    print("Merged raster:")
    print("Width :", red.shape[1])
    print("Height:", red.shape[0])

    # ---------------------------------------------------------
    # NDVI
    # ---------------------------------------------------------

    denominator = (
        nir + red
    )

    ndvi = np.zeros_like(
        denominator,
        dtype=np.float32
    )

    valid = (
        denominator != 0
    )

    ndvi[valid] = (
        (
            nir[valid] -
            red[valid]
        )
        /
        denominator[valid]
    )

    ndvi = np.clip(
        ndvi,
        -1.0,
        1.0
    )

    # ---------------------------------------------------------
    # RGB
    # ---------------------------------------------------------

    rgb = np.stack(
        [
            red,
            green,
            blue,
        ],
        axis=0
    )

    # ---------------------------------------------------------
    # Reproject function
    # ---------------------------------------------------------

    def reproject_array(
        array,
        source_transform,
        source_crs,
        resampling,
        dtype=np.float32,
    ):

        height, width = (
            array.shape[-2],
            array.shape[-1],
        )

        left = source_transform.c
        top = source_transform.f

        right = (
            left
            +
            width
            *
            source_transform.a
        )

        bottom = (
            top
            +
            height
            *
            source_transform.e
        )

        dst_transform, dst_width, dst_height = (
            calculate_default_transform(
                source_crs,
                TARGET_CRS,
                width,
                height,
                left,
                bottom,
                right,
                top,
                resolution=10,
            )
        )

        destination = np.zeros(
            (
                dst_height,
                dst_width,
            ),
            dtype=dtype,
        )

        reproject(
            source=array,
            destination=destination,
            src_transform=source_transform,
            src_crs=source_crs,
            dst_transform=dst_transform,
            dst_crs=TARGET_CRS,
            resampling=resampling,
        )

        return (
            destination,
            dst_transform,
        )

    # ---------------------------------------------------------
    # Reproject RGB
    # ---------------------------------------------------------

    print()
    print("Reprojecting RGB to EPSG:2193...")

    rgb_2193 = []

    for channel in rgb:

        channel_2193, dst_transform = (
            reproject_array(
                channel,
                transform,
                native_crs,
                Resampling.bilinear,
            )
        )

        rgb_2193.append(
            channel_2193
        )

    rgb_2193 = np.stack(
        rgb_2193,
        axis=0
    )

    # ---------------------------------------------------------
    # Reproject NDVI
    # ---------------------------------------------------------

    print(
        "Reprojecting NDVI to EPSG:2193..."
    )

    ndvi_2193, ndvi_transform = (
        reproject_array(
            ndvi,
            transform,
            native_crs,
            Resampling.bilinear,
        )
    )

    # ---------------------------------------------------------
    # Save RGB
    # ---------------------------------------------------------

    rgb_path = (
        OUTPUT_DIR
        / "rgb_epsg2193.tif"
    )

    with rasterio.open(
        rgb_path,
        "w",
        driver="GTiff",
        height=rgb_2193.shape[1],
        width=rgb_2193.shape[2],
        count=3,
        dtype="float32",
        crs=TARGET_CRS,
        transform=dst_transform,
        compress="deflate",
    ) as dst:

        dst.write(
            rgb_2193
        )

    # ---------------------------------------------------------
    # Save NDVI
    # ---------------------------------------------------------

    ndvi_path = (
        OUTPUT_DIR
        / "ndvi_epsg2193.tif"
    )

    with rasterio.open(
        ndvi_path,
        "w",
        driver="GTiff",
        height=ndvi_2193.shape[0],
        width=ndvi_2193.shape[1],
        count=1,
        dtype="float32",
        crs=TARGET_CRS,
        transform=ndvi_transform,
        compress="deflate",
    ) as dst:

        dst.write(
            ndvi_2193,
            1
        )

    # ---------------------------------------------------------
    # Validation
    # ---------------------------------------------------------

    print()
    print("=" * 80)
    print("SENTINEL-2 PROCESSING COMPLETE")
    print("=" * 80)

    print()
    print("RGB:")
    print("  Output:", rgb_path)
    print("  CRS:", TARGET_CRS)
    print("  Shape:", rgb_2193.shape)

    print()
    print("NDVI:")
    print("  Output:", ndvi_path)
    print("  CRS:", TARGET_CRS)
    print("  Shape:", ndvi_2193.shape)
    print(
        "  Min:",
        float(np.nanmin(ndvi_2193))
    )
    print(
        "  Max:",
        float(np.nanmax(ndvi_2193))
    )
    print(
        "  Mean:",
        float(np.nanmean(ndvi_2193))
    )

    print()
    print("LiDAR CRS:")
    print(" ", TARGET_CRS)

    print()
    print("Sentinel → LiDAR CRS transformation: COMPLETE")

    print("=" * 80)


if __name__ == "__main__":
    main()
