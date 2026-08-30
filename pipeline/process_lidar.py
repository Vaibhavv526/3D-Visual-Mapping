from pathlib import Path

import laspy
import numpy as np
import rasterio
from rasterio.transform import from_origin
from scipy.ndimage import distance_transform_edt


def build_dtm(
    lidar_path: Path,
    output_path: Path,
    slope_output_path: Path,
    resolution: float = 10.0,
    max_fill_distance: float = 30.0,
):
    """
    Build a Digital Terrain Model from classified LiDAR.

    Processing:
        1. Load LAS/LAZ
        2. Prefer ground class (LAS class 2)
        3. Bin points into raster cells
        4. Use the lowest ground elevation per cell
        5. Fill only small gaps
        6. Preserve large gaps as NoData
        7. Calculate slope
    """

    lidar_path = Path(lidar_path)
    output_path = Path(output_path)
    slope_output_path = Path(slope_output_path)

    print()
    print("=" * 70)
    print("LIDAR → DTM")
    print("=" * 70)

    print()
    print("Loading LiDAR:")
    print(lidar_path)

    if not lidar_path.exists():
        raise FileNotFoundError(
            f"LiDAR file not found: {lidar_path}"
        )

    las = laspy.read(lidar_path)

    if len(las.points) == 0:
        raise ValueError(
            "LiDAR file contains no points"
        )

    print(
        "Total LiDAR points:",
        f"{len(las.points):,}"
    )

    # -----------------------------------------------------
    # CRS
    # -----------------------------------------------------

    crs = las.header.parse_crs()

    if crs is None:
        raise ValueError(
            "LiDAR file has no CRS information"
        )

    print("LiDAR CRS:", crs)

    # -----------------------------------------------------
    # Coordinates
    # -----------------------------------------------------

    x = np.asarray(las.x)
    y = np.asarray(las.y)
    z = np.asarray(las.z)

    # -----------------------------------------------------
    # Ground classification
    # LAS classification:
    # 2 = Ground
    # -----------------------------------------------------

    try:

        classification = np.asarray(
            las.classification
        )

        ground_mask = classification == 2

        ground_count = int(
            ground_mask.sum()
        )

        print(
            "Ground-classified points:",
            f"{ground_count:,}"
        )

        if ground_count > 0:

            x = x[ground_mask]
            y = y[ground_mask]
            z = z[ground_mask]

        else:

            print(
                "WARNING: No class-2 ground points found."
            )

            print(
                "Using all LiDAR points."
            )

    except AttributeError:

        print(
            "WARNING: LiDAR classification unavailable."
        )

        print(
            "Using all LiDAR points."
        )

    if len(z) == 0:
        raise ValueError(
            "No usable LiDAR points remain"
        )

    # -----------------------------------------------------
    # Remove invalid values
    # -----------------------------------------------------

    valid = (
        np.isfinite(x)
        & np.isfinite(y)
        & np.isfinite(z)
    )

    x = x[valid]
    y = y[valid]
    z = z[valid]

    if len(z) == 0:
        raise ValueError(
            "No finite LiDAR points remain"
        )

    print(
        "Usable points:",
        f"{len(z):,}"
    )

    # -----------------------------------------------------
    # Spatial extent
    # -----------------------------------------------------

    xmin = np.floor(x.min())
    xmax = np.ceil(x.max())

    ymin = np.floor(y.min())
    ymax = np.ceil(y.max())

    width = int(
        np.ceil(
            (xmax - xmin) /
            resolution
        )
    )

    height = int(
        np.ceil(
            (ymax - ymin) /
            resolution
        )
    )

    if width < 2 or height < 2:
        raise ValueError(
            "LiDAR coverage is too small "
            "for DTM generation"
        )

    print()
    print(
        "DTM grid:",
        f"{width} x {height}"
    )

    print(
        "Resolution:",
        f"{resolution} m"
    )

    print(
        "Coverage:",
        f"{xmax - xmin:.2f} x "
        f"{ymax - ymin:.2f} m"
    )

    # -----------------------------------------------------
    # Convert points → raster cells
    # -----------------------------------------------------

    col = (
        (x - xmin) /
        resolution
    ).astype(np.int32)

    row = (
        (ymax - y) /
        resolution
    ).astype(np.int32)

    valid = (
        (row >= 0)
        & (row < height)
        & (col >= 0)
        & (col < width)
    )

    row = row[valid]
    col = col[valid]
    z = z[valid]

    if len(z) == 0:
        raise ValueError(
            "No LiDAR points fall inside "
            "the generated DTM grid"
        )

    # -----------------------------------------------------
    # Build DTM
    #
    # Multiple LiDAR points can fall inside one cell.
    # For ground terrain, choose the lowest elevation.
    # -----------------------------------------------------

    dtm = np.full(
        (height, width),
        np.nan,
        dtype=np.float32,
    )

    flat_index = (
        row * width + col
    )

    order = np.argsort(z)

    flat_sorted = flat_index[order]
    z_sorted = z[order]

    unique_cells, first_indices = np.unique(
        flat_sorted,
        return_index=True,
    )

    dtm.flat[unique_cells] = (
        z_sorted[first_indices]
    ).astype(np.float32)

    valid_cells = np.isfinite(dtm)

    valid_count = int(
        valid_cells.sum()
    )

    total_cells = (
        height * width
    )

    coverage_percent = (
        valid_count /
        total_cells *
        100.0
    )

    print()
    print(
        "Initial DTM coverage:",
        f"{coverage_percent:.2f}%"
    )

    if valid_count == 0:
        raise ValueError(
            "Unable to construct DTM"
        )

    # -----------------------------------------------------
    # Fill ONLY small gaps
    # -----------------------------------------------------

    missing = ~valid_cells

    fill_distance_cells = (
        max_fill_distance /
        resolution
    )

    if missing.any():

        distances, indices = (
            distance_transform_edt(
                missing,
                return_distances=True,
                return_indices=True,
            )
        )

        small_gap_mask = (
            missing
            & (
                distances <=
                fill_distance_cells
            )
        )

        fill_count = int(
            small_gap_mask.sum()
        )

        if fill_count > 0:

            nearest_values = dtm[
                tuple(indices)
            ]

            dtm[small_gap_mask] = (
                nearest_values[
                    small_gap_mask
                ]
            )

        remaining_missing = int(
            np.isnan(dtm).sum()
        )

    else:

        fill_count = 0
        remaining_missing = 0

    print(
        "Small-gap cells filled:",
        f"{fill_count:,}"
    )

    print(
        "Remaining NoData cells:",
        f"{remaining_missing:,}"
    )

    # -----------------------------------------------------
    # Calculate slope
    # -----------------------------------------------------

    valid_mask = np.isfinite(dtm)

    slope = np.full(
        dtm.shape,
        np.nan,
        dtype=np.float32,
    )

    if valid_mask.all():

        dz_dy, dz_dx = np.gradient(
            dtm,
            resolution,
            resolution,
        )

        slope = np.degrees(
            np.arctan(
                np.sqrt(
                    dz_dx ** 2 +
                    dz_dy ** 2
                )
            )
        ).astype(np.float32)

    else:

        # Work on a temporary surface for gradient
        # calculation, then restore NoData areas.
        temp = dtm.copy()

        distances, indices = (
            distance_transform_edt(
                ~valid_mask,
                return_distances=True,
                return_indices=True,
            )
        )

        nearest_values = temp[
            tuple(indices)
        ]

        temp[~valid_mask] = (
            nearest_values[
                ~valid_mask
            ]
        )

        dz_dy, dz_dx = np.gradient(
            temp,
            resolution,
            resolution,
        )

        slope = np.degrees(
            np.arctan(
                np.sqrt(
                    dz_dx ** 2 +
                    dz_dy ** 2
                )
            )
        ).astype(np.float32)

        slope[~valid_mask] = np.nan

    # -----------------------------------------------------
    # Raster metadata
    # -----------------------------------------------------

    transform = from_origin(
        xmin,
        ymax,
        resolution,
        resolution,
    )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    slope_output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    profile = {
        "driver": "GTiff",
        "height": height,
        "width": width,
        "count": 1,
        "dtype": "float32",
        "crs": crs,
        "transform": transform,
        "nodata": -9999.0,
        "compress": "deflate",
    }

    # -----------------------------------------------------
    # Write DTM
    # -----------------------------------------------------

    dtm_output = np.where(
        np.isfinite(dtm),
        dtm,
        -9999.0,
    ).astype(np.float32)

    with rasterio.open(
        output_path,
        "w",
        **profile,
    ) as dst:

        dst.write(
            dtm_output,
            1,
        )

    # -----------------------------------------------------
    # Write slope
    # -----------------------------------------------------

    slope_output = np.where(
        np.isfinite(slope),
        slope,
        -9999.0,
    ).astype(np.float32)

    with rasterio.open(
        slope_output_path,
        "w",
        **profile,
    ) as dst:

        dst.write(
            slope_output,
            1,
        )

    # -----------------------------------------------------
    # Statistics
    # -----------------------------------------------------

    valid_dtm = dtm[
        np.isfinite(dtm)
    ]

    valid_slope = slope[
        np.isfinite(slope)
    ]

    print()
    print("=" * 70)
    print("LIDAR PROCESSING COMPLETE")
    print("=" * 70)

    print(
        "Points:",
        f"{len(z):,}"
    )

    print(
        "Resolution:",
        f"{resolution} m"
    )

    print(
        "DTM coverage:",
        f"{np.isfinite(dtm).sum() / total_cells * 100:.2f}%"
    )

    print(
        "Elevation:",
        f"{float(valid_dtm.min()):.3f}",
        "→",
        f"{float(valid_dtm.max()):.3f}",
        "m",
    )

    if len(valid_slope) > 0:

        print(
            "Slope:",
            f"{float(valid_slope.min()):.3f}",
            "→",
            f"{float(valid_slope.max()):.3f}",
            "degrees",
        )

    print(
        "DTM:",
        output_path
    )

    print(
        "Slope:",
        slope_output_path
    )

    return {
        "dtm": output_path,
        "slope": slope_output_path,
        "crs": crs,
        "resolution": resolution,
        "width": width,
        "height": height,
        "point_count": len(z),
        "coverage_percent": (
            np.isfinite(dtm).sum()
            / total_cells
            * 100.0
        ),
    }
