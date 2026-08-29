from pathlib import Path

import laspy
import rasterio
from rasterio.warp import transform_bounds


BASE_DIR = Path(__file__).resolve().parents[1]

SATELLITE_DIR = (
    BASE_DIR
    / "digital_twin_data"
    / "AOI-01_Bilaspur"
    / "row"
)


def find_satellite_band(band):
    matches = sorted(
        SATELLITE_DIR.rglob(
            f"*_{band}_10m.jp2"
        )
    )

    if not matches:
        raise FileNotFoundError(
            f"Satellite {band} band not found"
        )

    return matches[0]


def inspect_satellite():

    path = find_satellite_band("B04")

    with rasterio.open(path) as src:
        return {
            "path": path,
            "crs": src.crs,
            "bounds": src.bounds,
        }


def inspect_lidar(path):

    las = laspy.read(path)

    crs = las.header.parse_crs()

    if crs is None:
        raise ValueError(
            f"LiDAR has no CRS: {path}"
        )

    return {
        "path": path,
        "crs": crs,
        "bounds": (
            float(las.x.min()),
            float(las.y.min()),
            float(las.x.max()),
            float(las.y.max()),
        ),
    }


def validate(lidar_path):

    satellite = inspect_satellite()
    lidar = inspect_lidar(lidar_path)

    print()
    print("=" * 70)
    print("GEOSPATIAL INPUT VALIDATION")
    print("=" * 70)

    print()
    print("SATELLITE")
    print("Path :", satellite["path"])
    print("CRS  :", satellite["crs"])
    print("Bounds:", satellite["bounds"])

    print()
    print("LiDAR")
    print("Path :", lidar["path"])
    print("CRS  :", lidar["crs"])
    print("Bounds:", lidar["bounds"])

    print()
    print("Checking CRS compatibility...")

    satellite_crs = satellite["crs"]
    lidar_crs = lidar["crs"]

    if satellite_crs != lidar_crs:

        print()
        print("WARNING: CRS DIFFERENCE")
        print("Satellite:", satellite_crs)
        print("LiDAR    :", lidar_crs)

        print()
        print("LiDAR bounds transformed to satellite CRS:")

        transformed = transform_bounds(
            lidar_crs,
            satellite_crs,
            *lidar["bounds"],
        )

        print(transformed)

    else:
        print("CRS: MATCH")

    print()
    print("=" * 70)
    print("VALIDATION COMPLETE")
    print("=" * 70)


if __name__ == "__main__":

    import sys

    if len(sys.argv) != 2:
        raise SystemExit(
            "Usage: python -m pipeline.validate_geospatial_inputs <lidar.laz>"
        )

    validate(
        Path(sys.argv[1])
    )
