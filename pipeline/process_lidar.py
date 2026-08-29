from pathlib import Path

import laspy
import numpy as np
import rasterio
from rasterio.transform import from_origin
from scipy.ndimage import distance_transform_edt
from rasterio.enums import Resampling


def build_dtm(
    lidar_path: Path,
    output_path: Path,
    slope_output_path: Path,
    resolution: float = 10.0,
):
    print("Loading LiDAR:")
    print(lidar_path)

    las = laspy.read(lidar_path)

    x = np.asarray(las.x)
    y = np.asarray(las.y)
    z = np.asarray(las.z)

    if len(z) == 0:
        raise ValueError("LiDAR file contains no points")

    # -----------------------------------------------------
    # Prefer ground-classified LiDAR points
    # LAS classification 2 = ground
    # -----------------------------------------------------

    try:
        classification = np.asarray(
            las.classification
        )

        ground_mask = classification == 2

        if ground_mask.any():
            print(
                f"Ground-classified points: "
                f"{int(ground_mask.sum()):,}"
            )

            x = x[ground_mask]
            y = y[ground_mask]
            z = z[ground_mask]

        else:
            print(
                "No ground-classified points found; "
                "using all LiDAR points."
            )

    except AttributeError:
        print(
            "LiDAR classification unavailable; "
            "using all LiDAR points."
        )

    if len(z) == 0:
        raise ValueError(
            "No usable ground points found"
        )

    print(f"LiDAR points: {len(z):,}")

    crs = las.header.parse_crs()

    if crs is None:
        raise ValueError(
            "LiDAR file has no CRS information"
        )

    print("LiDAR CRS:", crs)

    xmin = np.floor(x.min())
    xmax = np.ceil(x.max())

    ymin = np.floor(y.min())
    ymax = np.ceil(y.max())

    width = int(
        np.ceil(
            (xmax - xmin) / resolution
        )
    )

    height = int(
        np.ceil(
            (ymax - ymin) / resolution
        )
    )

    if width < 2 or height < 2:
        raise ValueError(
            "LiDAR coverage is too small for mesh generation"
        )

    print(
        f"DTM grid: {width} x {height}"
    )

    col = (
        (x - xmin) / resolution
    ).astype(np.int32)

    row = (
        (ymax - y) / resolution
    ).astype(np.int32)

    valid = (
        (row >= 0)
        & (row < height)
        & (col >= 0)
        & (col < width)
        & np.isfinite(z)
    )

    row = row[valid]
    col = col[valid]
    z = z[valid]

    if len(z) == 0:
        raise ValueError(
            "No valid LiDAR points remain"
        )

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

    missing = np.isnan(dtm)

    if missing.any():

        if not (~missing).any():
            raise ValueError(
                "Unable to construct DTM"
            )

        indices = distance_transform_edt(
            missing,
            return_distances=False,
            return_indices=True,
        )

        filled = dtm[
            tuple(indices)
        ]

        dtm[missing] = filled[missing]

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

    with rasterio.open(
        output_path,
        "w",
        **profile,
    ) as dst:
        dst.write(dtm, 1)

    # -----------------------------------------------------
    # Calculate slope from DTM
    # -----------------------------------------------------

    dz_dy, dz_dx = np.gradient(
        dtm,
        resolution,
        resolution,
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
        slope_output_path,
        "w",
        **profile,
    ) as dst:
        dst.write(slope, 1)

    print()
    print("=" * 60)
    print("LIDAR PROCESSING COMPLETE")
    print("=" * 60)
    print("Points     :", len(z))
    print("Resolution :", resolution, "m")
    print(
        "Elevation  :",
        float(dtm.min()),
        "→",
        float(dtm.max()),
    )
    print(
        "Slope      :",
        float(slope.min()),
        "→",
        float(slope.max()),
    )
    print("DTM        :", output_path)
    print("Slope      :", slope_output_path)

    return {
        "dtm": output_path,
        "slope": slope_output_path,
        "crs": crs,
        "resolution": resolution,
        "width": width,
        "height": height,
    }
