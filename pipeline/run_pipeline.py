from pathlib import Path

from pipeline.process_lidar import build_dtm
from pipeline.process_satellite import build_satellite_products
from pipeline.build_digital_twin import build_digital_twin
from pipeline.validate_geospatial_inputs import validate
from pipeline.prepare_copernicus_dem import prepare_copernicus_dem


BASE_DIR = Path(__file__).resolve().parents[1]


# ---------------------------------------------------------
# Input locations
# ---------------------------------------------------------

LIDAR_INPUT_DIR = (
    BASE_DIR
    / "data"
    / "inputs"
    / "lidar"
)

EXISTING_LIDAR_DIR = (
    BASE_DIR
    / "lidar_data"
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

COPERNICUS_DEM = next(
    BASE_DIR.rglob(
        "Copernicus_DSM_10_N22_00_E082_00_DEM.tif"
    ),
    None
)

REFERENCE_RGB = (
    BASE_DIR
    / "digital_twin_data"
    / "AOI-01_Bilaspur"
    / "processed"
    / "satellite"
    / "RGB_10m.tif"
)


# ---------------------------------------------------------
# Output locations
# ---------------------------------------------------------

OUTPUT_DIR = (
    BASE_DIR
    / "data"
    / "outputs"
)

TERRAIN_DIR = (
    OUTPUT_DIR
    / "terrain"
)

SATELLITE_OUTPUT_DIR = (
    OUTPUT_DIR
    / "satellite"
)


# ---------------------------------------------------------
# Existing LiDAR discovery + validation
# ---------------------------------------------------------

def find_compatible_lidar():

    candidates = []

    if LIDAR_INPUT_DIR.exists():

        candidates.extend(
            LIDAR_INPUT_DIR.glob("*.las")
        )

        candidates.extend(
            LIDAR_INPUT_DIR.glob("*.laz")
        )

    if EXISTING_LIDAR_DIR.exists():

        candidates.extend(
            EXISTING_LIDAR_DIR.glob("*.las")
        )

        candidates.extend(
            EXISTING_LIDAR_DIR.glob("*.laz")
        )

    candidates = sorted(
        set(
            path.resolve()
            for path in candidates
        )
    )

    if not candidates:

        print()
        print(
            "No LiDAR files found."
        )

        return None

    print()
    print("LiDAR candidates:")
    print("-" * 70)

    for path in candidates:

        print(
            path
        )

    print()
    print(
        "Checking LiDAR compatibility..."
    )
    print("-" * 70)

    compatible = []

    for path in candidates:

        print()
        print(
            "Checking:",
            path
        )

        try:

            result = validate(path)

            if result["compatible"]:

                compatible.append(
                    path
                )

                print(
                    "✓ Compatible LiDAR"
                )

            else:

                print(
                    "✗ Rejected: "
                    "does not overlap Bilaspur AOI"
                )

        except Exception as exc:

            print(
                "✗ Rejected:",
                exc
            )

    if not compatible:

        print()
        print(
            "No compatible Bilaspur LiDAR found."
        )

        return None

    selected = compatible[0]

    print()
    print("=" * 70)
    print("LIDAR SELECTED")
    print("=" * 70)

    print(
        selected
    )

    return selected


# ---------------------------------------------------------
# Satellite discovery
# ---------------------------------------------------------

def find_satellite_data():

    uploaded_files = []

    if UPLOADED_SATELLITE_DIR.exists():

        uploaded_files = (
            list(
                UPLOADED_SATELLITE_DIR.rglob(
                    "*.jp2"
                )
            )
            + list(
                UPLOADED_SATELLITE_DIR.rglob(
                    "*.tif"
                )
            )
            + list(
                UPLOADED_SATELLITE_DIR.rglob(
                    "*.tiff"
                )
            )
        )

    if uploaded_files:

        return (
            UPLOADED_SATELLITE_DIR,
            uploaded_files,
        )

    existing_files = []

    if EXISTING_SATELLITE_DIR.exists():

        existing_files = (
            list(
                EXISTING_SATELLITE_DIR.rglob(
                    "*.jp2"
                )
            )
            + list(
                EXISTING_SATELLITE_DIR.rglob(
                    "*.tif"
                )
            )
            + list(
                EXISTING_SATELLITE_DIR.rglob(
                    "*.tiff"
                )
            )
        )

    if existing_files:

        return (
            EXISTING_SATELLITE_DIR,
            existing_files,
        )

    raise FileNotFoundError(
        "No satellite data found."
    )


# ---------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------

def run_pipeline():

    print()
    print("=" * 70)
    print("       FULL DIGITAL TWIN PIPELINE")
    print("=" * 70)


    # -----------------------------------------------------
    # Discover inputs
    # -----------------------------------------------------

    lidar_file = (
        find_compatible_lidar()
    )

    satellite_dir, satellite_files = (
        find_satellite_data()
    )


    print()
    print("INPUT DATA")
    print("-" * 70)

    print(
        "LiDAR:",
        lidar_file
        if lidar_file
        else "Not available"
    )

    print(
        "Satellite:",
        satellite_dir
    )

    print(
        "Satellite files:",
        len(satellite_files)
    )


    # -----------------------------------------------------
    # STEP 1 — Select terrain source
    # -----------------------------------------------------

    if lidar_file:

        terrain_source = "LiDAR"
        terrain_mode = "LIDAR-ENHANCED"

        dtm_path = (
            TERRAIN_DIR
            / "lidar_dtm.tif"
        )

        slope_path = (
            TERRAIN_DIR
            / "lidar_slope.tif"
        )

        print()
        print("=" * 70)
        print("STEP 1/3 — PROCESSING LiDAR")
        print("=" * 70)

        lidar_result = build_dtm(
            lidar_file,
            dtm_path,
            slope_path,
            resolution=10.0,
        )

    else:

        terrain_source = "Copernicus DEM"
        terrain_mode = "BASELINE"

        dtm_path = (
            TERRAIN_DIR
            / "DEM_10m_aligned.tif"
        )

        slope_path = (
            TERRAIN_DIR
            / "slope_10m.tif"
        )

        print()
        print("=" * 70)
        print("STEP 1/3 — USING COPERNICUS DEM FALLBACK")
        print("=" * 70)

        lidar_result = None

        prepare_copernicus_dem(
            copernicus_dem=COPERNICUS_DEM,
            reference=REFERENCE_RGB,
            target_dem=dtm_path,
            target_slope=slope_path,
        )


    # -----------------------------------------------------
    # STEP 2 — Satellite
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
    print("=" * 70)
    print("STEP 2/3 — PROCESSING SATELLITE")
    print("=" * 70)

    satellite_result = (
        build_satellite_products(
            satellite_dir,
            dtm_path,
            rgb_path,
            ndvi_path,
        )
    )


    # -----------------------------------------------------
    # STEP 3 — Digital Twin
    # -----------------------------------------------------

    mesh_path = (
        TERRAIN_DIR
        / "digital_twin_mesh.vtp"
    )

    print()
    print("=" * 70)
    print("STEP 3/3 — BUILDING DIGITAL TWIN")
    print("=" * 70)

    mesh_result = build_digital_twin(
        dem_path=dtm_path,
        rgb_path=rgb_path,
        ndvi_path=ndvi_path,
        slope_path=slope_path,
        output_path=mesh_path,
    )


    # -----------------------------------------------------
    # Complete
    # -----------------------------------------------------

    print()
    print("=" * 70)
    print("       FULL PIPELINE COMPLETE")
    print("=" * 70)

    print()
    print(
        "Terrain source:",
        terrain_source
    )

    print(
        "Terrain mode:",
        terrain_mode
    )


    return {

        "status": "completed",

        "terrain": {

            "source":
                terrain_source,

            "mode":
                terrain_mode,

            "lidar_available":
                lidar_file is not None,

            "lidar_file":
                str(lidar_file)
                if lidar_file
                else None,

            "dem":
                str(dtm_path),

            "slope":
                str(slope_path),
        },

        "inputs": {

            "satellite_files": [
                str(path)
                for path in satellite_files
            ],
        },

        "satellite": {

            "rgb":
                str(
                    satellite_result["rgb"]
                ),

            "ndvi":
                str(
                    satellite_result["ndvi"]
                ),
        },

        "mesh":
            mesh_result,
    }


if __name__ == "__main__":

    run_pipeline()
