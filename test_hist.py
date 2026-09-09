import pyvista as pv
import numpy as np

mesh = pv.read("data/outputs/nz_lidar/building_fused.vtp")
building_ids = np.asarray(mesh.point_data["BuildingID"], dtype=np.int32)
ground_all = np.asarray(mesh.point_data.get("GroundElevation", np.zeros(mesh.n_points)), dtype=np.float32)

def estimate_structural_roof_elevation(pts, ground_elev):
    z_values = pts[:, 2]
    roof_mask = z_values > ground_elev + 2.0
    roof_pts = z_values[roof_mask]
    if len(roof_pts) < 10:
        return float(np.max(z_values))
        
    min_z = np.min(roof_pts)
    max_z = np.max(roof_pts)
    if max_z - min_z < 0.5:
        return float(max_z)
        
    bins = np.arange(min_z, max_z + 0.5, 0.5)
    counts, edges = np.histogram(roof_pts, bins=bins)
    
    threshold = max(3, len(roof_pts) * 0.15)
    dense_bins = np.where(counts >= threshold)[0]
    
    if len(b_pts) == 163: # Hack to identify B033
        print(f"B035: threshold={threshold:.1f}")
        for c, e in zip(counts, edges):
            if c > 0:
                print(f"  {e:.2f}-{e+0.5:.2f}: {c} pts")
    
    if len(dense_bins) == 0:
        return float(np.max(z_values))
        
    highest_dense_bin_idx = dense_bins[-1]
    roof_limit = edges[highest_dense_bin_idx + 1]
    
    valid_pts = roof_pts[roof_pts <= roof_limit + 0.25]
    if len(valid_pts) > 0:
        return float(np.max(valid_pts))
        
    return float(roof_limit)

for bid in [35, 33, 1, 6]:
    idx = np.where(building_ids == bid)[0]
    b_pts = mesh.points[idx]
    b_ground = ground_all[idx].mean()
    est = estimate_structural_roof_elevation(b_pts, b_ground)
    raw_max = b_pts[:, 2].max()
    print(f"NZ-B{bid:03d}: Ground={b_ground:.2f}, Raw Max={raw_max:.2f}, Est Roof={est:.2f}")

