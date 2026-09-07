"""
acquire_linz_parcels.py
=======================
Acquisition script to download real cadastral parcels from Land Information
New Zealand (LINZ) Data Service for the Auckland LiDAR Digital Twin AOI.

Data Source:
    LINZ NZ Primary Parcels
    Layer ID: 50772
    Canonical CRS: EPSG:2193 (NZTM2000)

Usage:
    # Set environment variable (recommended):
    export LINZ_API_KEY="your-api-key"
    python pipeline/acquire_linz_parcels.py

    # Or pass via command line (not logged):
    python pipeline/acquire_linz_parcels.py --api-key="your-api-key"

    # Or run interactively:
    python pipeline/acquire_linz_parcels.py
"""

import argparse
import getpass
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
import requests

BASE_DIR = Path(__file__).resolve().parents[1]
TERRAIN_FILE = BASE_DIR / "data" / "outputs" / "nz_lidar" / "terrain_fused.vtp"
INPUT_PARCELS_DIR = BASE_DIR / "data" / "inputs" / "parcels"
OUTPUT_RAW_FILE = INPUT_PARCELS_DIR / "linz_primary_parcels_raw.geojson"
OUTPUT_META_FILE = INPUT_PARCELS_DIR / "source_metadata.json"

LINZ_LAYER_ID = "50772"
LINZ_LAYER_NAME = "NZ Primary Parcels"
EXPECTED_CRS = "EPSG:2193"
DEFAULT_BUFFER_METERS = 100.0

# Default AOI if terrain mesh is not yet available
DEFAULT_BOUNDS = {
    "min_x": 1774720.0,
    "max_x": 1775680.0,
    "min_y": 5882640.0,
    "max_y": 5884080.0,
}


def get_aoi_bounds(buffer_m: float = DEFAULT_BUFFER_METERS) -> dict:
    """Derive AOI bounds from terrain mesh or default fallback, adding a buffer."""
    if TERRAIN_FILE.exists():
        try:
            import pyvista as pv
            mesh = pv.read(TERRAIN_FILE)
            bounds = mesh.bounds  # xmin, xmax, ymin, ymax, zmin, zmax
            min_x, max_x = float(bounds[0]), float(bounds[1])
            min_y, max_y = float(bounds[2]), float(bounds[3])
            print(f"[INFO] Loaded AOI bounds from {TERRAIN_FILE.name}")
        except Exception as e:
            print(f"[WARN] Could not read terrain mesh ({e}), using default AOI bounds.")
            min_x, max_x = DEFAULT_BOUNDS["min_x"], DEFAULT_BOUNDS["max_x"]
            min_y, max_y = DEFAULT_BOUNDS["min_y"], DEFAULT_BOUNDS["max_y"]
    else:
        min_x, max_x = DEFAULT_BOUNDS["min_x"], DEFAULT_BOUNDS["max_x"]
        min_y, max_y = DEFAULT_BOUNDS["min_y"], DEFAULT_BOUNDS["max_y"]

    buffered = {
        "min_x": min_x - buffer_m,
        "max_x": max_x + buffer_m,
        "min_y": min_y - buffer_m,
        "max_y": max_y + buffer_m,
        "raw_min_x": min_x,
        "raw_max_x": max_x,
        "raw_min_y": min_y,
        "raw_max_y": max_y,
        "buffer_m": buffer_m,
    }
    return buffered


def get_api_key(cli_arg: str | None = None) -> str:
    """Retrieve LINZ API key without persisting or logging it."""
    # 1. Environment variable
    key = os.environ.get("LINZ_API_KEY", "").strip()
    if key:
        return key

    # 2. Command-line argument
    if cli_arg and cli_arg.strip():
        return cli_arg.strip()

    # 3. Interactive prompt fallback
    if sys.stdin.isatty():
        print("\nLINZ API Key not found in environment variable 'LINZ_API_KEY'.")
        print("You can get a free key from: https://data.linz.govt.nz/my/api/")
        key = getpass.getpass("Enter LINZ API Key (input hidden): ").strip()
        if key:
            return key

    raise RuntimeError(
        "LINZ_API_KEY is not set.\n"
        "To acquire real cadastral data:\n"
        "  1. Obtain a free API key at https://data.linz.govt.nz/my/api/\n"
        "  2. Set the environment variable: export LINZ_API_KEY=\"<key>\"\n"
        "  3. Re-run this script: python pipeline/acquire_linz_parcels.py\n"
        "\nAlternatively, manually export a GeoJSON/Shapefile of Layer 50772\n"
        "for Auckland AOI from https://data.linz.govt.nz/layer/50772 and place it\n"
        f"into: {INPUT_PARCELS_DIR.resolve()}"
    )


def download_parcels(api_key: str, aoi: dict) -> dict:
    """
    Download LINZ Primary Parcels (Layer 50772) via WFS 2.0.0.
    In EPSG:2193, LDS expects BBOX as: min_y,min_x,max_y,max_x,EPSG:2193 (Northing, Easting).
    """
    url = f"https://data.linz.govt.nz/services;key={api_key}/wfs"

    # WFS 2.0.0 BBOX format for EPSG:2193 (Northing, Easting)
    bbox_str_northing_easting = f"{aoi['min_y']},{aoi['min_x']},{aoi['max_y']},{aoi['max_x']},EPSG:2193"

    params = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": f"layer-{LINZ_LAYER_ID}",
        "outputFormat": "application/json",
        "srsName": EXPECTED_CRS,
        "bbox": bbox_str_northing_easting,
    }

    print(f"[INFO] Requesting LINZ Layer {LINZ_LAYER_ID} ({LINZ_LAYER_NAME})...")
    print(f"[INFO] BBOX (EPSG:2193 with {aoi['buffer_m']}m buffer): "
          f"E [{aoi['min_x']:.1f}, {aoi['max_x']:.1f}], "
          f"N [{aoi['min_y']:.1f}, {aoi['max_y']:.1f}]")

    response = requests.get(url, params=params, timeout=60)

    # If LDS rejects the axis order, attempt Easting, Northing order as fallback
    if response.status_code != 200 and "bbox" in response.text.lower():
        print("[WARN] Retrying with alternative BBOX axis order...")
        bbox_str_alt = f"{aoi['min_x']},{aoi['min_y']},{aoi['max_x']},{aoi['max_y']},EPSG:2193"
        params["bbox"] = bbox_str_alt
        response = requests.get(url, params=params, timeout=60)

    if response.status_code == 401 or response.status_code == 403:
        raise PermissionError("LINZ API Key was rejected (HTTP 401/403). Check that the key is valid.")

    if response.status_code != 200:
        raise RuntimeError(
            f"Failed to fetch parcels from LINZ WFS (HTTP {response.status_code}):\n"
            f"{response.text[:500]}"
        )

    try:
        data = response.json()
    except Exception as e:
        raise RuntimeError(f"Failed to parse LINZ WFS response as JSON: {e}\nResponse: {response.text[:300]}")

    return data


def validate_and_save(data: dict, aoi: dict) -> Path:
    """Validate feature count, geometry presence, and save raw output."""
    if data.get("type") != "FeatureCollection":
        raise ValueError(f"Expected GeoJSON FeatureCollection, got: {data.get('type')}")

    features = data.get("features", [])
    count = len(features)
    print(f"[INFO] Received {count} cadastral features from LINZ.")

    if count == 0:
        raise ValueError(
            "LINZ returned 0 parcel features for the given AOI. "
            "Verify AOI coordinates or buffer distance."
        )

    # Check that at least the first feature has valid geometry and attributes
    valid_geoms = 0
    for f in features:
        geom = f.get("geometry")
        if geom and geom.get("coordinates") and geom.get("type") in ("Polygon", "MultiPolygon"):
            valid_geoms += 1

    if valid_geoms == 0:
        raise ValueError("No valid Polygon or MultiPolygon geometries found in downloaded features.")

    print(f"[INFO] Valid polygon/multipolygon geometries: {valid_geoms} / {count}")

    # Ensure output directory exists
    INPUT_PARCELS_DIR.mkdir(parents=True, exist_ok=True)

    # Write raw downloaded GeoJSON
    with open(OUTPUT_RAW_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"[SUCCESS] Saved raw parcel dataset to: {OUTPUT_RAW_FILE}")

    # Record source metadata (NEVER saving the API key)
    meta = {
        "source": "Land Information New Zealand (LINZ) Data Service",
        "layer_id": LINZ_LAYER_ID,
        "layer_name": LINZ_LAYER_NAME,
        "crs": EXPECTED_CRS,
        "acquired_at_utc": datetime.now(timezone.utc).isoformat(),
        "total_features": count,
        "valid_geometries": valid_geoms,
        "aoi_bounds": aoi,
        "licence": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
    }
    with open(OUTPUT_META_FILE, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"[SUCCESS] Saved source metadata to: {OUTPUT_META_FILE}")

    return OUTPUT_RAW_FILE


def main():
    parser = argparse.ArgumentParser(description="Acquire LINZ NZ Primary Parcels for Digital Twin AOI")
    parser.add_argument("--api-key", help="LINZ API Key (or use LINZ_API_KEY env var)")
    parser.add_argument("--buffer", type=float, default=DEFAULT_BUFFER_METERS, help="AOI buffer in meters (default: 100)")
    args = parser.parse_args()

    print("=" * 70)
    print("LINZ PRIMARY PARCELS ACQUISITION")
    print(f"Layer: {LINZ_LAYER_ID} ({LINZ_LAYER_NAME}) | CRS: {EXPECTED_CRS}")
    print("=" * 70)

    try:
        api_key = get_api_key(args.api_key)
        aoi = get_aoi_bounds(args.buffer)
        data = download_parcels(api_key, aoi)
        output_path = validate_and_save(data, aoi)
        print("=" * 70)
        print(f"[DONE] Acquisition completed successfully: {output_path}")
        print("Next step: run 'python pipeline/process_nz_parcels.py'")
        print("=" * 70)
    except Exception as exc:
        print(f"\n[ERROR] {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
