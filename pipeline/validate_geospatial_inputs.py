from pathlib import Path

import laspy
import numpy as np
import rasterio
from rasterio.warp import transform_bounds
from rasterio.coords import BoundingBox


BASE_DIR = Path(__file__).resolve().parents[1]

AOI_DIR = (
    BASE_DIR
    / "digital_twin_data"
    / "AOI-01_Bilaspur"
    / "processed"
)

REFERENCE_RASTER = (
    AOI_DIR
    / "satellite"
    / "RGB_10m.tif"
)


def bounds_intersect(a, b):
    """
    Check whether two bounding boxes intersect.

    Bounds format:
        (min_x, min_y, max_x, max_y)
    """

    a_min_x, a_min_y, a_max_x, a_max_y = a
    b_min_x, b_min_y, b_max_x, b_max_y = b

    return not (
        a_max_x <= b_min_x
        or a_min_x >= b_max_x
        or a_max_y <= b_min_y
        or a_min_y >= b_max_y
    )


def inspect_reference():
    if not REFERENCE_RASTER.exists():
        raise FileNotFoundError(
            f"Bilaspur reference raster not found: "
            f"{REFERENCE_RASTER}"
        )

    with rasterio.open(REFERENCE_RASTER) as src:

        bounds = (
            float(src.bounds.left),
            float(src.bounds.bottom),
            float(src.bounds.right),
            float(src.bounds.top),
        )

        return {
            "path": REFERENCE_RASTER,
            "crs": src.crs,
            "bounds": bounds,
            "width": src.width,
            "height": src.height,
            "resolution": src.res,
        }


def inspect_lidar(path: Path):

    if not path.exists():
        raise FileNotFoundError(
            f"LiDAR file not found: {path}"
        )

    las = laspy.read(path)

    if len(las.points) == 0:
        raise ValueError(
            f"LiDAR contains no points: {path}"
        )

    crs = las.header.parse_crs()

    if crs is None:
        raise ValueError(
            f"LiDAR has no CRS information: {path}"
        )

    x = np.asarray(las.x)
    y = np.asarray(las.y)
    z = np.asarray(las.z)

    bounds = (
        float(x.min()),
        float(y.min()),
        float(x.max()),
        float(y.max()),
    )

    classification_counts = {}

    try:
        classification = np.asarray(
            las.classification
        )

        classes, counts = np.unique(
            classification,
            return_counts=True,
        )

        classification_counts = {
            int(c): int(n)
            for c, n in zip(classes, counts)
        }

    except AttributeError:
        pass

    return {
        "path": path,
        "points": len(las.points),
        "crs": crs,
        "bounds": bounds,
        "z_min": float(z.min()),
        "z_max": float(z.max()),
        "classification": classification_counts,
    }


def validate(lidar_path: Path):

    reference = inspect_reference()
    lidar = inspect_lidar(lidar_path)

    print()
    print("=" * 70)
    print("LIDAR / BILASPUR AOI VALIDATION")
    print("=" * 70)

    print()
    print("BILASPUR REFERENCE")
    print("-" * 70)

    print("Raster :", reference["path"])
    print("CRS    :", reference["crs"])
    print(
        "Size   :",
        reference["width"],
        "x",
        reference["height"],
    )
    print("Resolution:", reference["resolution"])
    print("Bounds :", reference["bounds"])

    print()
    print("LIDAR")
    print("-" * 70)

    print("File   :", lidar["path"])
    print("Points :", f'{lidar["points"]:,}')
    print("CRS    :", lidar["crs"])
    print("Bounds :", lidar["bounds"])
    print(
        "Z range:",
        lidar["z_min"],
        "->",
        lidar["z_max"],
        "m",
    )

    print()
    print("CLASSIFICATION")
    print("-" * 70)

    if lidar["classification"]:

        for class_id, count in sorted(
            lidar["classification"].items()
        ):

            print(
                f"Class {class_id}: "
                f"{count:,} points"
            )

    else:
        print("Classification unavailable")

    print()
    print("SPATIAL COMPATIBILITY")
    print("-" * 70)

    reference_crs = reference["crs"]
    lidar_crs = lidar["crs"]

    transformed_bounds = transform_bounds(
        lidar_crs,
        reference_crs,
        *lidar["bounds"],
        densify_pts=21,
    )

    print("LiDAR bounds in Bilaspur CRS:")
    print(transformed_bounds)

    overlaps = bounds_intersect(
        transformed_bounds,
        reference["bounds"],
    )

    if overlaps:

        print()
        print("STATUS: COMPATIBLE")
        print("LiDAR overlaps the Bilaspur AOI.")

    else:

        print()
        print("STATUS: INCOMPATIBLE")
        print("LiDAR does NOT overlap the Bilaspur AOI.")

    print()
    print("=" * 70)
    print("VALIDATION COMPLETE")
    print("=" * 70)

    return {
        "compatible": overlaps,
        "lidar": lidar,
        "reference": reference,
        "transformed_bounds": transformed_bounds,
    }


if __name__ == "__main__":

    import sys

    if len(sys.argv) != 2:

        raise SystemExit(
            "Usage: "
            "python -m pipeline.validate_geospatial_inputs "
            "<lidar.laz>"
        )

    validate(
        Path(sys.argv[1]).resolve()
    )
