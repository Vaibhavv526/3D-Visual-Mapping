import pyvista as pv
import numpy as np

mesh = pv.read("data/outputs/nz_lidar/building_fused.vtp")
building_ids = np.asarray(mesh.point_data["BuildingID"], dtype=np.int32)
ground_all = np.asarray(mesh.point_data.get("GroundElevation", np.zeros(mesh.n_points)), dtype=np.float32)

for bid in [35, 33, 1, 6]:
    idx = np.where(building_ids == bid)[0]
    b_pts = mesh.points[idx]
    b_ground = ground_all[idx].mean()
    z_values = b_pts[:, 2]
    roof_pts = z_values[z_values > b_ground + 2.0]
    if len(roof_pts) > 0:
        p90 = np.percentile(roof_pts, 90)
        p95 = np.percentile(roof_pts, 95)
        p99 = np.percentile(roof_pts, 99)
        max_z = roof_pts.max()
        print(f"NZ-B{bid:03d}: Ground={b_ground:.2f}, Max={max_z:.2f}, P90={p90:.2f}, P95={p95:.2f}, P99={p99:.2f}")

