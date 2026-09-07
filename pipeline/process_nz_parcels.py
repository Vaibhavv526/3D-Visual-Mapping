"""
process_nz_parcels.py
=====================
Processing pipeline for LINZ NZ Primary Parcels (Layer 50772).

Responsibilities:
1. Load raw LINZ parcel data (GeoJSON or Shapefile) from data/inputs/parcels/.
2. Validate and verify CRS (reprojecting to EPSG:2193 if needed).
3. Validate and repair polygon/multipolygon geometries using Shapely.
4. Clip/filter to the active NZ Digital Twin AOI plus buffer.
5. Calculate analytical geometry metadata (calculated area, centroid, bounds).
6. Build building ↔ parcel associations for all 56 reconstructed LiDAR buildings.
7. Save machine-readable output to data/outputs/nz_lidar/parcels.json.

Strict Rules:
- NO generated ULPINs (internal reference used: parcel_id).
- NO floor-level cadastral units or floor splitting.
- NO inferred ownership or title conclusions.
- Disconnected buildings are marked strictly as "Unassociated" (no nearest-parcel guessing).
- Geometric conditions are termed analytically ("Building footprint intersects parcel boundary").
"""

import json
from datetime import datetime, timezone
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pyproj
import pyvista as pv
from shapely.geometry import MultiPolygon, Point, Polygon, box, shape
from shapely.strtree import STRtree
from shapely.validation import make_valid

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
from pipeline.vertical_structure import estimate_vertical_structure

INPUT_PARCELS_DIR = BASE_DIR / "data" / "inputs" / "parcels"
OUTPUT_DIR = BASE_DIR / "data" / "outputs" / "nz_lidar"
OUTPUT_PARCELS_FILE = OUTPUT_DIR / "parcels.json"
TERRAIN_FILE = OUTPUT_DIR / "terrain_fused.vtp"
BUILDING_FILE = OUTPUT_DIR / "building_fused.vtp"

CANONICAL_CRS = "EPSG:2193"
DEFAULT_AOI_BUFFER = 50.0  # meters


def get_aoi_box(buffer_m: float = DEFAULT_AOI_BUFFER) -> Tuple[box, Dict[str, float]]:
    """Derive clipping AOI polygon from terrain mesh."""
    if TERRAIN_FILE.exists():
        mesh = pv.read(TERRAIN_FILE)
        min_x, max_x = float(mesh.bounds[0]), float(mesh.bounds[1])
        min_y, max_y = float(mesh.bounds[2]), float(mesh.bounds[3])
    else:
        min_x, max_x = 1774720.0, 1775680.0
        min_y, max_y = 5882640.0, 5884080.0

    aoi_bounds = {
        "min_x": min_x - buffer_m,
        "max_x": max_x + buffer_m,
        "min_y": min_y - buffer_m,
        "max_y": max_y + buffer_m,
        "raw_min_x": min_x,
        "raw_max_x": max_x,
        "raw_min_y": min_y,
        "raw_max_y": max_y,
    }
    return box(aoi_bounds["min_x"], aoi_bounds["min_y"], aoi_bounds["max_x"], aoi_bounds["max_y"]), aoi_bounds


def find_input_parcel_file() -> Optional[Path]:
    """Find available raw parcel file in data/inputs/parcels/."""
    if not INPUT_PARCELS_DIR.exists():
        return None

    # Priority 1: linz_primary_parcels_raw.geojson
    raw_default = INPUT_PARCELS_DIR / "linz_primary_parcels_raw.geojson"
    if raw_default.exists() and raw_default.stat().st_size > 0:
        return raw_default

    # Priority 2: any other geojson
    geojsons = sorted(INPUT_PARCELS_DIR.glob("*.geojson"))
    for g in geojsons:
        if g.stat().st_size > 0:
            return g

    # Priority 3: any json
    jsons = sorted(INPUT_PARCELS_DIR.glob("*.json"))
    for j in jsons:
        if j.name != "source_metadata.json" and j.stat().st_size > 0:
            return j

    return None


def detect_and_build_transformer(raw_data: dict, first_geom: Any) -> Optional[pyproj.Transformer]:
    """
    Detect source CRS from GeoJSON or geometry coordinates.
    If already EPSG:2193, returns None.
    If geographic (EPSG:4167 or EPSG:4326), returns pyproj transformer to EPSG:2193.
    """
    # Check explicit crs name in GeoJSON
    crs_name = ""
    if "crs" in raw_data and isinstance(raw_data["crs"], dict):
        crs_props = raw_data["crs"].get("properties", {})
        crs_name = str(crs_props.get("name", "")).upper()

    if "2193" in crs_name or "NZTM" in crs_name:
        return None

    # Sample coordinate values from the first geometry
    try:
        sample_pt = first_geom.representative_point()
        sx, sy = sample_pt.x, sample_pt.y
        # If coordinates are in degrees (longitude ~170..179, latitude ~-34..-47)
        if 160.0 <= sx <= 180.0 and -50.0 <= sy <= -30.0:
            print(f"[INFO] Source coordinates appear to be geographic ({sx:.4f}, {sy:.4f}). Setting up transform to EPSG:2193.")
            source_crs = "EPSG:4167" if ("4167" in crs_name or "NZGD2000" in crs_name) else "EPSG:4326"
            return pyproj.Transformer.from_crs(source_crs, CANONICAL_CRS, always_xy=True)
    except Exception:
        pass

    return None


def reproject_geom(geom: Any, transformer: pyproj.Transformer) -> Any:
    """Reproject a Shapely geometry using pyproj transformer."""
    from shapely.ops import transform
    return transform(transformer.transform, geom)


def extract_building_footprints() -> List[Dict[str, Any]]:
    """
    Extract 2D analytical footprints and centroids for all 56 buildings from building_fused.vtp.
    Footprints are LiDAR-derived analytical convex hulls (not legal or architectural building footprints).
    """
    if not BUILDING_FILE.exists():
        print(f"[WARN] Building mesh not found at {BUILDING_FILE}")
        return []

    mesh = pv.read(BUILDING_FILE)
    points = np.asarray(mesh.points, dtype=np.float64)
    building_ids = np.asarray(mesh.point_data["BuildingID"], dtype=np.int32)
    height_all = np.asarray(
        mesh.point_data.get("Height", np.zeros(mesh.n_points, dtype=np.float32)),
        dtype=np.float32
    )
    ground_all = np.asarray(
        mesh.point_data.get("GroundElevation", np.zeros(mesh.n_points, dtype=np.float32)),
        dtype=np.float32
    )
    roof_all = np.asarray(
        mesh.point_data.get("RoofElevation", np.zeros(mesh.n_points, dtype=np.float32)),
        dtype=np.float32
    )
    unique_ids = np.unique(building_ids)

    buildings = []
    for b_num in unique_ids:
        indices = np.where(building_ids == b_num)[0]
        if len(indices) < 3:
            continue

        b_points = points[indices]
        # 2D points (X, Y in EPSG:2193)
        pts_2d = b_points[:, :2]
        
        # Build 2D polygon via convex hull of building points
        from shapely.geometry import MultiPoint
        mp = MultiPoint(pts_2d)
        hull = mp.convex_hull
        if not isinstance(hull, (Polygon, MultiPolygon)) or hull.is_empty:
            continue

        b_id = f"NZ-B{int(b_num):03d}"
        centroid = hull.centroid

        b_height = float(np.max(height_all[indices])) if "Height" in mesh.point_data else float(b_points[:, 2].max() - b_points[:, 2].min())
        b_ground = float(np.mean(ground_all[indices])) if "GroundElevation" in mesh.point_data else float(b_points[:, 2].min())
        b_roof = float(np.max(roof_all[indices])) if "RoofElevation" in mesh.point_data else float(b_points[:, 2].max())

        buildings.append({
            "building_id": b_id,
            "numeric_id": int(b_num),
            "polygon": hull,
            "centroid": centroid,
            "centroid_coords": [round(float(centroid.x), 2), round(float(centroid.y), 2)],
            "footprint_area": round(float(hull.area), 2),
            "height": b_height,
            "ground_elevation": b_ground,
            "roof_elevation": b_roof,
            "min_elevation": float(b_points[:, 2].min()),
            "max_elevation": float(b_points[:, 2].max()),
            "bounds": {
                "min_x": round(float(pts_2d[:, 0].min()), 2),
                "max_x": round(float(pts_2d[:, 0].max()), 2),
                "min_y": round(float(pts_2d[:, 1].min()), 2),
                "max_y": round(float(pts_2d[:, 1].max()), 2),
            },
        })

    print(f"[INFO] Extracted {len(buildings)} building footprints from {BUILDING_FILE.name}")
    return buildings


def geometry_to_geojson_coords(geom: Any) -> Any:
    """Convert a Shapely polygon/multipolygon to serializable GeoJSON coordinates."""
    if isinstance(geom, Polygon):
        coords = [list(geom.exterior.coords)]
        for interior in geom.interiors:
            coords.append(list(interior.coords))
        return [[round(x, 2) for x in pt] for ring in coords for pt in [ring]]
    elif isinstance(geom, MultiPolygon):
        multi_coords = []
        for poly in geom.geoms:
            poly_coords = [list(poly.exterior.coords)]
            for interior in poly.interiors:
                poly_coords.append(list(interior.coords))
            multi_coords.append(poly_coords)
        return multi_coords
    return None


def serialize_polygon_rings(geom: Any) -> List[List[List[float]]]:
    """Serialize geometry to standard list of polygon coordinate rings for Three.js."""
    rings = []
    if isinstance(geom, Polygon):
        rings.append([[round(float(c[0]), 2), round(float(c[1]), 2)] for c in geom.exterior.coords])
        for interior in geom.interiors:
            rings.append([[round(float(c[0]), 2), round(float(c[1]), 2)] for c in interior.coords])
    elif isinstance(geom, MultiPolygon):
        for poly in geom.geoms:
            rings.append([[round(float(c[0]), 2), round(float(c[1]), 2)] for c in poly.exterior.coords])
            for interior in poly.interiors:
                rings.append([[round(float(c[0]), 2), round(float(c[1]), 2)] for c in interior.coords])
    return rings


def process_parcels(input_path: Path) -> Dict[str, Any]:
    """
    Process raw parcel features, clip to AOI, clean geometries,
    and associate with the 56 LiDAR buildings.
    """
    print(f"[INFO] Reading raw parcel data from: {input_path}")
    with open(input_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    features = raw_data.get("features", [])
    print(f"[INFO] Raw parcel features: {len(features)}")

    if not features:
        raise ValueError("Input parcel file contains no features.")

    aoi_polygon, aoi_bounds = get_aoi_box(DEFAULT_AOI_BUFFER)

    # Check CRS transformation
    first_raw_geom = shape(features[0]["geometry"])
    transformer = detect_and_build_transformer(raw_data, first_raw_geom)

    # Parse and clean parcels
    parsed_parcels = []
    for idx, feat in enumerate(features):
        raw_geom = feat.get("geometry")
        if not raw_geom:
            continue

        try:
            geom = shape(raw_geom)
        except Exception:
            continue

        if transformer:
            geom = reproject_geom(geom, transformer)

        if not geom.is_valid:
            geom = make_valid(geom)

        if geom.is_empty or geom.area < 1.0:
            continue

        # Clip / filter to AOI
        if not aoi_polygon.intersects(geom):
            continue

        # If parcel extends outside AOI, we keep the original geometry or clipped geometry
        # Keeping parcel geometry intact is best for cadastral integrity
        props = feat.get("properties", {})

        # Extract authentic LINZ attributes - reject features without authentic parcel identifier
        raw_id = props.get("id") or props.get("parcel_id")
        if not raw_id or not str(raw_id).strip():
            print(f"[WARN] Skipping parcel feature at index {idx}: missing authentic LINZ identifier.")
            continue
        parcel_id_val = str(raw_id).strip()
        appellation = props.get("appellation")
        parcel_intent = props.get("parcel_intent")
        land_district = props.get("land_district")
        statutory_actions = props.get("statutory_actions")
        titles = props.get("titles")
        survey_area = props.get("survey_area") or props.get("calc_area")
        topology_type = props.get("topology_type")

        # Analytical geometric properties
        calc_area = round(float(geom.area), 2)
        centroid = geom.centroid
        centroid_coords = [round(float(centroid.x), 2), round(float(centroid.y), 2)]
        b = geom.bounds
        bounds_dict = {
            "min_x": round(float(b[0]), 2),
            "max_x": round(float(b[1]), 2),
            "min_y": round(float(b[2]), 2),
            "max_y": round(float(b[3]), 2),
        }

        rings = serialize_polygon_rings(geom)

        parsed_parcels.append({
            "parcel_id": parcel_id_val,
            "appellation": appellation,
            "parcel_intent": parcel_intent,
            "land_district": land_district,
            "statutory_actions": statutory_actions,
            "titles": titles,
            "survey_area": float(survey_area) if survey_area is not None else None,
            "calculated_area": calc_area,
            "centroid": centroid_coords,
            "bounds": bounds_dict,
            "rings": rings,
            "_geom": geom,
            "associated_building_ids": [],
        })

    print(f"[INFO] Filtered and validated {len(parsed_parcels)} parcels within AOI.")

    if not parsed_parcels:
        raise ValueError("No parcels intersect the active NZ Digital Twin AOI.")

    # -------------------------------------------------------------
    # STEP 5: Building ↔ Parcel Association Engine
    # -------------------------------------------------------------
    buildings = extract_building_footprints()
    parcel_geoms = [p["_geom"] for p in parsed_parcels]
    tree = STRtree(parcel_geoms)

    associations = []
    associated_buildings_count = 0
    unassociated_buildings_count = 0
    multi_parcel_buildings_count = 0

    for b in buildings:
        b_id = b["building_id"]
        b_poly = b["polygon"]
        b_centroid = b["centroid"]
        b_area = b["footprint_area"]

        # Find candidates using spatial index
        candidate_indices = tree.query(b_poly)
        
        # Analyze exact intersections
        intersecting_parcels = []
        containing_parcel_idx: Optional[int] = None

        for c_idx in candidate_indices:
            p_obj = parsed_parcels[c_idx]
            p_geom = p_obj["_geom"]

            # Check centroid containment
            if p_geom.contains(b_centroid):
                containing_parcel_idx = c_idx

            # Check footprint intersection
            if p_geom.intersects(b_poly):
                inter_geom = p_geom.intersection(b_poly)
                inter_area = float(inter_geom.area)
                if inter_area > 0.05:  # meaningful threshold (>5 cm²)
                    overlap_frac = round(min(1.0, inter_area / max(0.1, b_area)), 4)
                    intersecting_parcels.append({
                        "parcel_idx": c_idx,
                        "parcel_id": p_obj["parcel_id"],
                        "intersection_area": round(inter_area, 2),
                        "overlap_fraction": overlap_frac,
                    })

        # Sort intersecting parcels by intersection area descending
        intersecting_parcels.sort(key=lambda x: x["intersection_area"], reverse=True)

        is_multi = len(intersecting_parcels) > 1
        if is_multi:
            multi_parcel_buildings_count += 1

        # Association Decision Hierarchy:
        # 1. Building centroid contained within parcel
        # 2. Building footprint intersection
        # 3. Unassociated
        if containing_parcel_idx is not None:
            primary_p = parsed_parcels[containing_parcel_idx]
            assoc_type = "Centroid contained"
            primary_id = primary_p["parcel_id"]
            primary_p["associated_building_ids"].append(b_id)
            associated_buildings_count += 1
            
            # Find overlap fraction with primary parcel
            primary_overlap = next(
                (item["overlap_fraction"] for item in intersecting_parcels if item["parcel_idx"] == containing_parcel_idx),
                1.0
            )

            if is_multi:
                notes = (
                    f"Building centroid contained within parcel {primary_id}. "
                    f"Building footprint intersects multiple parcel boundaries ({len(intersecting_parcels)} parcels)."
                )
                ident_status = "Multi-parcel"
            else:
                notes = f"Building centroid contained within parcel {primary_id} ({primary_overlap * 100:.1f}% footprint overlap)."
                ident_status = "Parcel associated"

            prop_id_3d = f"3DP-{primary_id}-{b_id}"
            vert_struct = estimate_vertical_structure(
                building_id=b_id,
                building_height=b.get("height"),
                ground_elevation=b.get("ground_elevation"),
                roof_elevation=b.get("roof_elevation"),
                property_id_3d=prop_id_3d,
            )

            associations.append({
                "building_id": b_id,
                "primary_parcel_id": primary_id,
                "property_id_3d": prop_id_3d,
                "vertical_unit_id": None,
                "identity_status": ident_status,
                "vertical_structure": vert_struct,
                "association_type": assoc_type,
                "overlap_fraction": primary_overlap,
                "footprint_method": "lidar_analytical_footprint",
                "is_multi_parcel": is_multi,
                "intersecting_parcels": [
                    {
                        "parcel_id": ip["parcel_id"],
                        "intersection_area": ip["intersection_area"],
                        "overlap_fraction": ip["overlap_fraction"],
                    }
                    for ip in intersecting_parcels
                ],
                "notes": notes,
            })

        elif intersecting_parcels:
            # Footprint intersection without centroid containment
            top_p_info = intersecting_parcels[0]
            top_p = parsed_parcels[top_p_info["parcel_idx"]]
            primary_id = top_p["parcel_id"]
            top_p["associated_building_ids"].append(b_id)
            associated_buildings_count += 1
            assoc_type = "Footprint intersection"

            if is_multi:
                notes = (
                    f"Building footprint intersects parcel boundary {primary_id} "
                    f"({top_p_info['overlap_fraction'] * 100:.1f}% overlap, {top_p_info['intersection_area']} m²). "
                    f"Centroid falls outside parcel. Also intersects {len(intersecting_parcels) - 1} other parcel(s)."
                )
                ident_status = "Multi-parcel"
            else:
                notes = (
                    f"Building footprint intersects parcel boundary {primary_id} "
                    f"({top_p_info['overlap_fraction'] * 100:.1f}% overlap, {top_p_info['intersection_area']} m²). "
                    f"Centroid falls outside parcel."
                )
                ident_status = "Parcel associated"

            prop_id_3d = f"3DP-{primary_id}-{b_id}"
            vert_struct = estimate_vertical_structure(
                building_id=b_id,
                building_height=b.get("height"),
                ground_elevation=b.get("ground_elevation"),
                roof_elevation=b.get("roof_elevation"),
                property_id_3d=prop_id_3d,
            )

            associations.append({
                "building_id": b_id,
                "primary_parcel_id": primary_id,
                "property_id_3d": prop_id_3d,
                "vertical_unit_id": None,
                "identity_status": ident_status,
                "vertical_structure": vert_struct,
                "association_type": assoc_type,
                "overlap_fraction": top_p_info["overlap_fraction"],
                "footprint_method": "lidar_analytical_footprint",
                "is_multi_parcel": is_multi,
                "intersecting_parcels": [
                    {
                        "parcel_id": ip["parcel_id"],
                        "intersection_area": ip["intersection_area"],
                        "overlap_fraction": ip["overlap_fraction"],
                    }
                    for ip in intersecting_parcels
                ],
                "notes": notes,
            })

        else:
            # Unassociated - DO NOT assign nearest parcel
            unassociated_buildings_count += 1
            vert_struct = estimate_vertical_structure(
                building_id=b_id,
                building_height=b.get("height"),
                ground_elevation=b.get("ground_elevation"),
                roof_elevation=b.get("roof_elevation"),
                property_id_3d=None,
            )

            associations.append({
                "building_id": b_id,
                "primary_parcel_id": None,
                "property_id_3d": None,
                "vertical_unit_id": None,
                "identity_status": "Unassociated building",
                "vertical_structure": vert_struct,
                "association_type": "Unassociated",
                "overlap_fraction": None,
                "footprint_method": "lidar_analytical_footprint",
                "is_multi_parcel": False,
                "intersecting_parcels": [],
                "notes": "No parcel intersection detected. Marked as unassociated.",
            })

    # Summary metrics
    parcels_with_buildings = sum(1 for p in parsed_parcels if len(p["associated_building_ids"]) > 0)
    vacant_parcels = len(parsed_parcels) - parcels_with_buildings
    multi_building_parcels = sum(1 for p in parsed_parcels if len(p["associated_building_ids"]) > 1)

    summary = {
        "total_parcels": len(parsed_parcels),
        "parcels_with_buildings": parcels_with_buildings,
        "vacant_parcels": vacant_parcels,
        "multi_building_parcels": multi_building_parcels,
        "total_buildings": len(buildings),
        "associated_buildings": associated_buildings_count,
        "unassociated_buildings": unassociated_buildings_count,
        "multi_parcel_buildings": multi_parcel_buildings_count,
        "identities_generated": associated_buildings_count,
    }

    # Clean internal geometry references before JSON output
    cleaned_parcels = []
    for p in parsed_parcels:
        c_p = dict(p)
        c_p.pop("_geom", None)
        cleaned_parcels.append(c_p)

    output_payload = {
        "dataset": "LINZ NZ Primary Parcels (Layer 50772)",
        "crs": CANONICAL_CRS,
        "source": "Land Information New Zealand (LINZ) Data Service",
        "licence": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
        "processed_at_utc": datetime.now(timezone.utc).isoformat(),
        "aoi_bounds": aoi_bounds,
        "summary": summary,
        "parcels": cleaned_parcels,
        "associations": associations,
    }

    return output_payload


def save_output(payload: Dict[str, Any]) -> Path:
    """Save processed parcel data to data/outputs/nz_lidar/parcels.json."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PARCELS_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"[SUCCESS] Saved {payload['summary']['total_parcels']} parcels to: {OUTPUT_PARCELS_FILE}")
    return OUTPUT_PARCELS_FILE


def main():
    print("=" * 70)
    print("NZ CADASTRAL PARCEL PROCESSING PIPELINE")
    print(f"Target CRS: {CANONICAL_CRS}")
    print("=" * 70)

    input_file = find_input_parcel_file()
    if not input_file:
        print(f"\n[NOTICE] No cadastral parcel input file found in: {INPUT_PARCELS_DIR.resolve()}")
        print("To acquire real LINZ parcel data:")
        print("  1. Run: python pipeline/acquire_linz_parcels.py (requires LINZ_API_KEY)")
        print("  2. Or manually place an exported GeoJSON from data.linz.govt.nz in that folder.")
        print("\nThe backend and frontend will remain fully functional with clean no-data state.")
        return

    try:
        payload = process_parcels(input_file)
        out_file = save_output(payload)
        s = payload["summary"]
        print("-" * 70)
        print("PROCESSING SUMMARY:")
        print(f"  Total Cadastral Parcels: {s['total_parcels']}")
        print(f"  Parcels with Buildings:   {s['parcels_with_buildings']}")
        print(f"  Vacant Parcels:           {s['vacant_parcels']}")
        print(f"  Associated Buildings:     {s['associated_buildings']} / {s['total_buildings']}")
        print(f"  Unassociated Buildings:   {s['unassociated_buildings']} / {s['total_buildings']}")
        print(f"  Multi-Parcel Buildings:   {s['multi_parcel_buildings']}")
        print("=" * 70)
    except Exception as exc:
        print(f"[ERROR] Failed to process parcels: {exc}")
        raise


if __name__ == "__main__":
    main()
