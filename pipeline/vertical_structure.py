"""
vertical_structure.py
=====================
Backend and data foundation for Phase 9A: Estimated Vertical Structure & Levels.

Hierarchy:
  Parcel
    ↓
  Building
    ↓
  Estimated Vertical Structure
    ↓
  Estimated Levels

Note:
  The New Zealand LiDAR dataset contains building heights reconstructed from
  airborne point clouds, but does NOT contain interior floor plans, architectural
  drawings, or confirmed legal storey counts.
  Every level produced here is: "Estimated · LiDAR-derived".
  Vertical unit IDs (e.g. 3DP-5077201-NZ-B001-L01) are project-defined identifiers,
  NOT official government ULPINs or legal cadastral units.
"""

import math
from typing import Any, Dict, List, Optional


DEFAULT_FLOOR_HEIGHT_METRES: float = 3.2
SOURCE_DESCRIPTION: str = "Estimated · LiDAR-derived"


import numpy as np

def estimate_structural_roof_elevation(building_points: np.ndarray, ground_elev: float) -> float:
    """
    Robust LiDAR-derived structural roof estimation.
    Identifies the dominant upper structural surface instead of blindly using max(Z).
    """
    if building_points is None or len(building_points) == 0:
        return ground_elev

    z_values = building_points[:, 2]
    roof_mask = z_values > ground_elev + 2.0
    roof_pts = building_points[roof_mask]

    if len(roof_pts) < 10:
        return float(np.max(z_values))

    total_w = building_points[:, 0].max() - building_points[:, 0].min()
    total_d = building_points[:, 1].max() - building_points[:, 1].min()
    total_area = total_w * total_d

    sorted_z = np.sort(roof_pts[:, 2])[::-1]

    for z_test in sorted_z:
        band_mask = (roof_pts[:, 2] >= z_test - 1.0) & (roof_pts[:, 2] <= z_test + 0.1)
        band_pts = roof_pts[band_mask]

        if len(band_pts) > 0:
            bw = band_pts[:, 0].max() - band_pts[:, 0].min()
            bd = band_pts[:, 1].max() - band_pts[:, 1].min()
            band_area = bw * bd

            point_ratio = len(band_pts) / len(roof_pts)
            area_ratio = band_area / total_area if total_area > 0 else 0

            # Must have substantial horizontal extent or point mass to be the structural roof
            if (point_ratio >= 0.15 or len(band_pts) >= 50) and (area_ratio >= 0.15 or band_area >= 50.0):
                return float(z_test)

    return float(np.max(z_values))

def estimate_floor_count(building_height: Optional[float]) -> Optional[int]:
    """
    Calculate estimated floor count based on standard LiDAR height assumption (3.2m / floor).
    Formula: max(1, round(building_height / 3.2))
    Returns None if building_height is missing, non-numeric, or <= 0.
    """
    if building_height is None:
        return None
    try:
        h = float(building_height)
    except (ValueError, TypeError):
        return None

    if math.isnan(h) or math.isinf(h) or h <= 0.0:
        return None

    return max(1, int(round(h / DEFAULT_FLOOR_HEIGHT_METRES)))


def estimate_vertical_structure(
    building_id: str,
    building_height: Optional[float],
    ground_elevation: Optional[float],
    roof_elevation: Optional[float],
    property_id_3d: Optional[str] = None,
    building_points: Optional[Any] = None, # np.ndarray
) -> Optional[Dict[str, Any]]:
    """
    Generate an estimated vertical property model between ground_elevation and roof_elevation.

    Args:
        building_id: Existing building identifier (e.g. "NZ-B001").
        building_height: LiDAR-derived structure height in metres.
        ground_elevation: Local ground base elevation in metres.
        roof_elevation: Apex/roof elevation in metres.
        property_id_3d: Optional Phase 8A 3D Property ID (e.g. "3DP-5077201-NZ-B001").
        building_points: Optional numpy array of building vertices (N, 3) for per-level footprint.

    Returns:
        Dictionary representing the vertical structure, or None if vertical structure
        is unavailable due to missing/inconsistent inputs.
    """
    # Safe validation of required numeric inputs
    if building_height is None or ground_elevation is None or roof_elevation is None:
        return None

    try:
        h = float(building_height)
        g = float(ground_elevation)
        r = float(roof_elevation)
    except (ValueError, TypeError):
        return None

    if math.isnan(h) or math.isnan(g) or math.isnan(r):
        return None
    if math.isinf(h) or math.isinf(g) or math.isinf(r):
        return None

    raw_r = r
    raw_h = h
    roof_estimation_method = "max_z"

    if building_points is not None:
        try:
            est_roof = estimate_structural_roof_elevation(building_points, g)
            if est_roof < r:
                r = est_roof
                h = r - g
                roof_estimation_method = "dominant_upper_surface_cluster"
        except Exception:
            pass

    # Edge cases B, E, F: height must be positive, and roof must exceed ground
    if h <= 0.0 or r <= g:
        return None

    floor_count = max(1, int(round(h / DEFAULT_FLOOR_HEIGHT_METRES)))
    vertical_extent = r - g
    floor_thickness = vertical_extent / floor_count

    # Clean property_id_3d string if provided
    valid_pid = str(property_id_3d).strip() if property_id_3d and str(property_id_3d).strip() else None

    # Calculate consistency
    height_residual = abs(h - floor_count * DEFAULT_FLOOR_HEIGHT_METRES)
    extent_residual = abs(h - vertical_extent)
    total_residual = height_residual + extent_residual

    if total_residual < 0.8:
        overall_status = "HIGH"
        explanation = "Estimated level structure is highly consistent with the measured LiDAR-derived building height and vertical extent."
    elif total_residual < 2.0:
        overall_status = "MODERATE"
        explanation = "Estimated level structure is reasonably consistent with the measured LiDAR-derived building height and vertical extent."
    else:
        overall_status = "LIMITED"
        explanation = "Available measurements provide limited consistency for the estimated level structure."

    consistency = {
        "building_id": building_id,
        "overall_status": overall_status,
        "available_signal_count": 2,
        "disclaimer": "Vertical structure consistency is derived from available LiDAR building geometry and the 3.2m/floor estimation model. It does not confirm architectural floors or legal vertical property boundaries.",
        "levels": []
    }

    # Attempt to import shapely for concave_hull
    has_shapely = False
    try:
        from shapely.geometry import MultiPoint
        from shapely import concave_hull
        has_shapely = True
    except ImportError:
        pass

    overall_area = None
    building_envelope = None
    envelope_area = None
    envelope_width = None
    envelope_depth = None

    if building_points is not None and has_shapely:
        try:
            mp = MultiPoint(building_points[:, :2])
            poly = concave_hull(mp, ratio=0.1)
            if poly.is_empty or poly.geom_type != 'Polygon':
                poly = mp.convex_hull
            if not poly.is_empty and poly.geom_type == 'Polygon':
                overall_area = poly.area
                coords = list(poly.exterior.coords)[:-1]
                building_envelope = [list(c) for c in coords]
                envelope_area = round(poly.area, 2)
                bounds = poly.bounds
                envelope_width = round(bounds[2] - bounds[0], 2)
                envelope_depth = round(bounds[3] - bounds[1], 2)
        except Exception:
            pass

    floors: List[Dict[str, Any]] = []
    for i in range(1, floor_count + 1):
        base_elev = round(g + (i - 1) * floor_thickness, 3)
        if i == floor_count:
            # Preserve exact roof elevation on top floor
            top_elev = round(r, 3)
        else:
            top_elev = round(g + i * floor_thickness, 3)

        level_height = round(top_elev - base_elev, 3)
        label = f"Level {i:02d}"

        # Vertical Unit ID: generated strictly when property_id_3d is available
        unit_id = f"{valid_pid}-L{i:02d}" if valid_pid else None
        
        floor_data = {
            "floor_index": i,
            "label": label,
            "base_elevation": base_elev,
            "top_elevation": top_elev,
            "height": level_height,
            "vertical_unit_id": unit_id,
            "geometry_status": "Estimated vertical zone",
            "geometry_source": "building_envelope",
        }
        
        if building_envelope:
            floor_data["footprint"] = building_envelope
            floor_data["footprint_area"] = envelope_area
            floor_data["footprint_width"] = envelope_width
            floor_data["footprint_depth"] = envelope_depth
        else:
            floor_data["geometry_status"] = "Floor-specific geometry unavailable"
            floor_data["geometry_source"] = "unavailable"

        floors.append(floor_data)
        
        consistency["levels"].append({
            "level_index": i,
            "consistency_status": overall_status,
            "explanation": explanation,
            "signals": [
                {
                    "name": "Height consistency",
                    "description": f"Residual vs standard floor height is {height_residual:.2f}m",
                    "value": round(height_residual, 2)
                },
                {
                    "name": "Vertical extent consistency",
                    "description": f"Height vs (roof - ground) difference is {extent_residual:.2f}m",
                    "value": round(extent_residual, 2)
                }
            ]
        })

    return {
        "building_id": building_id,
        "property_id_3d": valid_pid,
        "building_height": round(h, 2), # structural
        "ground_elevation": round(g, 2),
        "roof_elevation": round(r, 2), # structural
        "structural_height": round(h, 2),
        "structural_roof_elevation": round(r, 2),
        "raw_max_z": round(raw_r, 2),
        "raw_height": round(raw_h, 2),
        "roof_estimation_method": roof_estimation_method,
        "estimated_floor_height": round(floor_thickness, 3),
        "estimated_floor_count": floor_count,
        "description": SOURCE_DESCRIPTION,
        "consistency": consistency,
        "floors": floors,
    }
