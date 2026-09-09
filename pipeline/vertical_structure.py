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
) -> Optional[Dict[str, Any]]:
    """
    Generate an estimated vertical property model between ground_elevation and roof_elevation.

    Args:
        building_id: Existing building identifier (e.g. "NZ-B001").
        building_height: LiDAR-derived structure height in metres.
        ground_elevation: Local ground base elevation in metres.
        roof_elevation: Apex/roof elevation in metres.
        property_id_3d: Optional Phase 8A 3D Property ID (e.g. "3DP-5077201-NZ-B001").

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

        floors.append({
            "floor_index": i,
            "label": label,
            "base_elevation": base_elev,
            "top_elevation": top_elev,
            "height": level_height,
            "vertical_unit_id": unit_id,
        })
        
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
        "building_height": round(h, 2),
        "ground_elevation": round(g, 2),
        "roof_elevation": round(r, 2),
        "estimated_floor_height": round(floor_thickness, 3),
        "estimated_floor_count": floor_count,
        "description": SOURCE_DESCRIPTION,
        "consistency": consistency,
        "floors": floors,
    }
