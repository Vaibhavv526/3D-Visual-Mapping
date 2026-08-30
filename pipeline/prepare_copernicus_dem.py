from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from scipy.ndimage import distance_transform_edt


BASE_DIR = Path(__file__).resolve().parents[1]


def prepare_copernicus_dem(
    copernicus_dem: Path,
    reference: Path,
    target_dem: Path,
    target_slope: Path,
):
    print()
    print("=" * 70)
    print("PREPARING COPERNICUS DEM FOR BILASPUR")
    print("=" * 70)

    print()
    print("Source DEM:")
    print(copernicus_dem)

    print()
    print("Reference grid:")
    print(reference)

    if not copernicus_dem.exists():
        raise FileNotFoundError(
            f"Copernicus DEM not found: {copernicus_dem}"
        )

    if not reference.exists():
        raise FileNotFoundError(
            f"Reference raster not found: {reference}"
        )

    with rasterio.open(reference) as ref:

        target_crs = ref.crs
        target_transform = ref.transform
        target_width = ref.width
        target_height = ref.height

        print()
        print("Target CRS :", target_crs)
        print(
            "Target grid:",
            target_width,
            "x",
            target_height,
        )
        print("Resolution :", ref.res)

    with rasterio.open(copernicus_dem) as src:

        source = src.read(1).astype(np.float32)

        destination = np.full(
            (
                target_height,
                target_width,
            ),
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
            "Copernicus DEM does not overlap "
            "the Bilaspur reference grid."
        )

    print()
    print(
        "Valid DEM pixels:",
        int(valid.sum()),
    )

    print(
        "Elevation:",
        float(np.nanmin(destination)),
        "->",
        float(np.nanmax(destination)),
        "m",
    )

    print(
        "Mean elevation:",
        float(np.nanmean(destination)),
        "m",
    )

    # -----------------------------------------------------
    # Fill remaining gaps
    # -----------------------------------------------------

    if not valid.all():

        missing = ~valid

        indices = distance_transform_edt(
            missing,
            return_distances=False,
            return_indices=True,
        )

        destination[missing] = destination[
            tuple(indices)
        ][missing]

    # -----------------------------------------------------
    # Save aligned DEM
    # -----------------------------------------------------

    target_dem.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    target_slope.parent.mkdir(
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
        target_dem,
        "w",
        **profile,
    ) as dst:

        dst.write(
            destination.astype(np.float32),
            1,
        )

    # -----------------------------------------------------
    # Calculate slope
    # -----------------------------------------------------

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

    with rasterio.open(
        target_slope,
        "w",
        **profile,
    ) as dst:

        dst.write(
            slope,
            1,
        )

    print()
    print("=" * 70)
    print("COPERNICUS DEM PREPARATION COMPLETE")
    print("=" * 70)

    print("DEM   :", target_dem)
    print("Slope :", target_slope)

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
    print(
        "Resolution:",
        resolution_x,
        "m",
    )

    return {
        "dem": target_dem,
        "slope": target_slope,
        "crs": str(target_crs),
        "resolution_m": resolution_x,
    }


if __name__ == "__main__":

    copernicus_dem = next(
        BASE_DIR.rglob(
            "Copernicus_DSM_10_N22_00_E082_00_DEM.tif"
        )
    )

    reference = (
        BASE_DIR
        / "digital_twin_data"
        / "AOI-01_Bilaspur"
        / "processed"
        / "satellite"
        / "RGB_10m.tif"
    )

    target_dem = (
        BASE_DIR
        / "digital_twin_data"
        / "AOI-01_Bilaspur"
        / "processed"
        / "terrain"
        / "DEM_10m_aligned.tif"
    )

    target_slope = (
        BASE_DIR
        / "digital_twin_data"
        / "AOI-01_Bilaspur"
        / "processed"
        / "terrain_analysis"
        / "slope_10m.tif"
    )

    prepare_copernicus_dem(
        copernicus_dem,
        reference,
        target_dem,
        target_slope,
    )
