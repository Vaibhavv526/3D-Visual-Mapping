from pathlib import Path

from pipeline.process_lidar import build_dtm
from pipeline.process_satellite import build_satellite_products
from pipeline.build_digital_twin import build_digital_twin


BASE_DIR = Path(__file__).resolve().parents[1]

LIDAR_DIR = (
    BASE_DIR
    / "data"
    / "inputs"
    / "lidar"
)

UPLOADED_SATELLITE_DIR = (
    BASE_DIR
    / "data"
    / "inputs"
    / "satellite"
)

EXISTING_SATELLITE_DIR = (
    BASE_DIR
    / "digital_twin_data"
    / "AOI-01_Bilaspur"
    / "row"
)

OUTPUT_DIR = (
    BASE_DIR
    / "data"
    / "outputs"
)

TERRAIN_DIR = OUTPUT_DIR / "terrain"
SATELLITE_OUTPUT_DIR = OUTPUT_DIR / "satellite"


def find_lidar():

    files = sorted(
        list(LIDAR_DIR.glob("*.las"))
        + list(LIDAR_DIR.glob("*.laz"))
    )

    if not files:
        raise FileNotFoundError(
            "No LiDAR LAS/LAZ file found in data/inputs/lidar"
        )

    return files[-1]


def find_satellite_data():

    uploaded_files = (
        list(UPLOADED_SATELLITE_DIR.rglob("*.jp2"))
        + list(UPLOADED_SATELLITE_DIR.rglob("*.tif"))
        + list(UPLOADED_SATELLITE_DIR.rglob("*.tiff"))
    )

    if uploaded_files:
        return UPLOADED_SATELLITE_DIR, uploaded_files

    existing_files = (
        list(EXISTING_SATELLITE_DIR.rglob("*.jp2"))
        + list(EXISTING_SATELLITE_DIR.rglob("*.tif"))
        + list(EXISTING_SATELLITE_DIR.rglob("*.tiff"))
    )

    if existing_files:
        return EXISTING_SATELLITE_DIR, existing_files

    raise FileNotFoundError(
        "No satellite data found."
    )


def run_pipeline():

    print()
    print("=" * 70)
    print("       FULL DIGITAL TWIN PIPELINE")
    print("=" * 70)

    lidar_file = find_lidar()
    satellite_dir, satellite_files = find_satellite_data()

    print()
    print("INPUT DATA")
    print("-" * 70)
    print("LiDAR:", lidar_file)
    print("Satellite files:", len(satellite_files))

    # -----------------------------------------------------
    # 1. LiDAR → DTM + slope
    # -----------------------------------------------------

    dtm_path = (
        TERRAIN_DIR
        / "lidar_dtm.tif"
    )

    slope_path = (
        TERRAIN_DIR
        / "slope.tif"
    )

    print()
    print("STEP 1/3 — Processing LiDAR")

    lidar_result = build_dtm(
        lidar_file,
        dtm_path,
        slope_path,
        resolution=10.0,
    )

    # -----------------------------------------------------
    # 2. Satellite → RGB + NDVI
    # -----------------------------------------------------

    rgb_path = (
        SATELLITE_OUTPUT_DIR
        / "RGB.tif"
    )

    ndvi_path = (
        SATELLITE_OUTPUT_DIR
        / "NDVI.tif"
    )

    print()
    print("STEP 2/3 — Processing satellite imagery")

    satellite_result = build_satellite_products(
        satellite_dir,
        dtm_path,
        rgb_path,
        ndvi_path,
    )

    # -----------------------------------------------------
    # 3. Build 3D mesh
    # -----------------------------------------------------

    mesh_path = (
        TERRAIN_DIR
        / "digital_twin_mesh.vtp"
    )

    print()
    print("STEP 3/3 — Building 3D Digital Twin")

    mesh_result = build_digital_twin(
        dem_path=dtm_path,
        rgb_path=rgb_path,
        ndvi_path=ndvi_path,
        slope_path=slope_path,
        output_path=mesh_path,
    )

    print()
    print("=" * 70)
    print("       FULL PIPELINE COMPLETE")
    print("=" * 70)

    return {
        "status": "completed",

        "inputs": {
            "lidar": str(lidar_file),
            "satellite_files": [
                str(path)
                for path in satellite_files
            ],
        },

        "lidar": {
            "dtm": str(lidar_result["dtm"]),
            "slope": str(lidar_result["slope"]),
            "resolution_m": lidar_result["resolution"],
        },

        "satellite": {
            "rgb": str(satellite_result["rgb"]),
            "ndvi": str(satellite_result["ndvi"]),
        },

        "mesh": mesh_result,
    }
