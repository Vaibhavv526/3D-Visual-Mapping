from pathlib import Path
import json

import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling


def compare_terrain(
    reference_dem: Path,
    comparison_dem: Path,
    difference_output: Path,
    report_output: Path,
):
    """
    Compare two terrain rasters.

    The reference DEM defines the output grid.
    The comparison DEM is reprojected/resampled onto
    the reference grid before calculating differences.

    Difference:
        comparison DEM - reference DEM
    """

    reference_dem = Path(reference_dem)
    comparison_dem = Path(comparison_dem)
    difference_output = Path(difference_output)
    report_output = Path(report_output)

    print()
    print("=" * 70)
    print("TERRAIN COMPARISON")
    print("=" * 70)

    if not reference_dem.exists():
        raise FileNotFoundError(
            f"Reference DEM not found: {reference_dem}"
        )

    if not comparison_dem.exists():
        raise FileNotFoundError(
            f"Comparison DEM not found: {comparison_dem}"
        )

    print()
    print("Reference DEM :")
    print(reference_dem)

    print()
    print("Comparison DEM:")
    print(comparison_dem)

    # -----------------------------------------------------
    # Load reference DEM
    # -----------------------------------------------------

    with rasterio.open(reference_dem) as ref:

        reference = ref.read(1).astype(
            np.float32
        )

        reference_crs = ref.crs
        reference_transform = ref.transform
        reference_width = ref.width
        reference_height = ref.height
        reference_nodata = ref.nodata

        reference_bounds = ref.bounds

    # -----------------------------------------------------
    # Load comparison DEM metadata
    # -----------------------------------------------------

    with rasterio.open(comparison_dem) as src:

        comparison_crs = src.crs
        comparison_transform = src.transform

        comparison_bounds = src.bounds

        comparison = src.read(1).astype(
            np.float32
        )

        comparison_nodata = src.nodata

    print()
    print("REFERENCE GRID")
    print("-" * 70)

    print("CRS       :", reference_crs)
    print(
        "Grid      :",
        reference_width,
        "x",
        reference_height,
    )
    print(
        "Resolution:",
        reference_transform.a,
        "x",
        abs(reference_transform.e),
        "m",
    )
    print("Bounds    :", reference_bounds)

    print()
    print("COMPARISON GRID")
    print("-" * 70)

    print("CRS       :", comparison_crs)
    print(
        "Grid      :",
        comparison.shape[1],
        "x",
        comparison.shape[0],
    )
    print("Bounds    :", comparison_bounds)

    # -----------------------------------------------------
    # Reproject comparison DEM onto reference grid
    # -----------------------------------------------------

    comparison_aligned = np.full(
        (
            reference_height,
            reference_width,
        ),
        np.nan,
        dtype=np.float32,
    )

    source_nodata = (
        comparison_nodata
        if comparison_nodata is not None
        else np.nan
    )

    reproject(
        source=comparison,
        destination=comparison_aligned,
        src_transform=comparison_transform,
        src_crs=comparison_crs,
        src_nodata=source_nodata,
        dst_transform=reference_transform,
        dst_crs=reference_crs,
        dst_nodata=np.nan,
        resampling=Resampling.bilinear,
    )

    # -----------------------------------------------------
    # Build valid comparison mask
    # -----------------------------------------------------

    reference_valid = np.isfinite(
        reference
    )

    if reference_nodata is not None:

        reference_valid &= (
            reference != reference_nodata
        )

    comparison_valid = np.isfinite(
        comparison_aligned
    )

    valid = (
        reference_valid
        & comparison_valid
    )

    valid_count = int(
        valid.sum()
    )

    total_count = (
        reference_width *
        reference_height
    )

    if valid_count == 0:
        raise ValueError(
            "No overlapping valid pixels "
            "available for terrain comparison."
        )

    # -----------------------------------------------------
    # Calculate differences
    # -----------------------------------------------------

    difference = np.full(
        reference.shape,
        np.nan,
        dtype=np.float32,
    )

    difference[valid] = (
        comparison_aligned[valid]
        - reference[valid]
    )

    values = difference[valid].astype(
        np.float64
    )

    abs_values = np.abs(values)

    squared_values = values ** 2

    mean_bias = float(
        np.mean(values)
    )

    mae = float(
        np.mean(abs_values)
    )

    rmse = float(
        np.sqrt(
            np.mean(squared_values)
        )
    )

    minimum_difference = float(
        np.min(values)
    )

    maximum_difference = float(
        np.max(values)
    )

    mean_absolute_difference = float(
        np.mean(abs_values)
    )

    overlap_percent = (
        valid_count /
        total_count *
        100.0
    )

    # -----------------------------------------------------
    # Save difference raster
    # -----------------------------------------------------

    difference_output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    profile = {
        "driver": "GTiff",
        "height": reference_height,
        "width": reference_width,
        "count": 1,
        "dtype": "float32",
        "crs": reference_crs,
        "transform": reference_transform,
        "nodata": -9999.0,
        "compress": "deflate",
    }

    output_array = np.where(
        np.isfinite(difference),
        difference,
        -9999.0,
    ).astype(np.float32)

    with rasterio.open(
        difference_output,
        "w",
        **profile,
    ) as dst:

        dst.write(
            output_array,
            1,
        )

    # -----------------------------------------------------
    # Build comparison report
    # -----------------------------------------------------

    report = {
        "reference": {
            "path": str(reference_dem),
            "crs": str(reference_crs),
            "width": reference_width,
            "height": reference_height,
            "resolution_m": float(
                abs(reference_transform.a)
            ),
            "bounds": {
                "x_min": float(reference_bounds.left),
                "y_min": float(reference_bounds.bottom),
                "x_max": float(reference_bounds.right),
                "y_max": float(reference_bounds.top),
            },
        },

        "comparison": {
            "path": str(comparison_dem),
            "crs": str(comparison_crs),
            "width": int(comparison.shape[1]),
            "height": int(comparison.shape[0]),
            "bounds": {
                "x_min": float(comparison_bounds.left),
                "y_min": float(comparison_bounds.bottom),
                "x_max": float(comparison_bounds.right),
                "y_max": float(comparison_bounds.top),
            },
        },

        "comparison_method": {
            "difference_definition":
                "comparison - reference",
            "resampling":
                "bilinear",
            "reference_grid":
                "reference DEM",
        },

        "statistics": {
            "valid_pixels": valid_count,
            "total_reference_pixels": total_count,
            "overlap_percent": overlap_percent,
            "mean_bias_m": mean_bias,
            "mae_m": mae,
            "rmse_m": rmse,
            "minimum_difference_m":
                minimum_difference,
            "maximum_difference_m":
                maximum_difference,
            "mean_absolute_difference_m":
                mean_absolute_difference,
        },

        "outputs": {
            "difference_raster":
                str(difference_output),
            "report":
                str(report_output),
        },
    }

    report_output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    report_output.write_text(
        json.dumps(
            report,
            indent=2,
        )
    )

    print()
    print("=" * 70)
    print("TERRAIN COMPARISON COMPLETE")
    print("=" * 70)

    print()
    print("Valid pixels :", f"{valid_count:,}")
    print(
        "Overlap      :",
        f"{overlap_percent:.2f}%"
    )
    print(
        "Mean bias    :",
        f"{mean_bias:.4f} m"
    )
    print(
        "MAE          :",
        f"{mae:.4f} m"
    )
    print(
        "RMSE         :",
        f"{rmse:.4f} m"
    )
    print(
        "Difference   :",
        f"{minimum_difference:.4f}",
        "->",
        f"{maximum_difference:.4f}",
        "m",
    )

    print()
    print("Difference raster:")
    print(difference_output)

    print()
    print("Report:")
    print(report_output)

    return report


if __name__ == "__main__":

    BASE_DIR = Path(__file__).resolve().parents[1]

    reference_dem = (
        BASE_DIR
        / "data"
        / "outputs"
        / "terrain"
        / "DEM_10m_aligned.tif"
    )

    comparison_dem = (
        BASE_DIR
        / "data"
        / "outputs"
        / "terrain"
        / "lidar_dtm.tif"
    )

    difference_output = (
        BASE_DIR
        / "data"
        / "outputs"
        / "terrain"
        / "terrain_difference.tif"
    )

    report_output = (
        BASE_DIR
        / "data"
        / "outputs"
        / "terrain"
        / "terrain_comparison.json"
    )

    compare_terrain(
        reference_dem,
        comparison_dem,
        difference_output,
        report_output,
    )
