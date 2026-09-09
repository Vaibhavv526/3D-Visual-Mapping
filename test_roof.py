import pyvista as pv
import numpy as np

mesh = pv.read("data/outputs/nz_lidar/building_fused.vtp")
building_ids = np.asarray(mesh.point_data["BuildingID"], dtype=np.int32)
ground_all = np.asarray(mesh.point_data.get("GroundElevation", np.zeros(mesh.n_points)), dtype=np.float32)

def estimate_structural_roof_elevation(pts, ground_elev, bid):
    z_values = pts[:, 2]
    roof_mask = z_values > ground_elev + 2.0
    roof_pts = pts[roof_mask]
    
    if len(roof_pts) < 10:
        return float(np.max(z_values))
        
    total_w = pts[:, 0].max() - pts[:, 0].min()
    total_d = pts[:, 1].max() - pts[:, 1].min()
    total_area = total_w * total_d
    
    sorted_z = np.sort(roof_pts[:, 2])[::-1]
    
    for z_test in sorted_z:
        band_mask = (roof_pts[:, 2] >= z_test - 1.5) & (roof_pts[:, 2] <= z_test + 0.1)
        band_pts = roof_pts[band_mask]
        
        if len(band_pts) > 0:
            bw = band_pts[:, 0].max() - band_pts[:, 0].min()
            bd = band_pts[:, 1].max() - band_pts[:, 1].min()
            band_area = bw * bd
            
            point_ratio = len(band_pts) / len(roof_pts)
            area_ratio = band_area / total_area if total_area > 0 else 0
            
            if (point_ratio >= 0.15 or len(band_pts) >= 50) and (area_ratio >= 0.20 or band_area >= 40.0):
                return float(z_test)
                
    return float(np.max(z_values))

for bid in [35, 33, 1, 6]:
    idx = np.where(building_ids == bid)[0]
    b_pts = mesh.points[idx]
    b_ground = ground_all[idx].mean()
    est = estimate_structural_roof_elevation(b_pts, b_ground, bid)
    raw_max = b_pts[:, 2].max()
    print(f"NZ-B{bid:03d}: Ground={b_ground:.2f}, Raw Max={raw_max:.2f}, Est Roof={est:.2f}")
