import pyvista as pv
import numpy as np

mesh = pv.read("data/outputs/nz_lidar/building_fused.vtp")
building_ids = np.asarray(mesh.point_data["BuildingID"], dtype=np.int32)
ground_all = np.asarray(mesh.point_data.get("GroundElevation", np.zeros(mesh.n_points)), dtype=np.float32)
roof_all = np.asarray(mesh.point_data.get("RoofElevation", np.zeros(mesh.n_points)), dtype=np.float32)
height_all = np.asarray(mesh.point_data.get("Height", np.zeros(mesh.n_points)), dtype=np.float32)

for bid in [35, 33, 1, 6]:
    idx = np.where(building_ids == bid)[0]
    g = ground_all[idx]
    r = roof_all[idx]
    h = height_all[idx]
    pts = mesh.points[idx]
    print(f"NZ-B{bid:03d}: Z range [{pts[:,2].min():.2f}, {pts[:,2].max():.2f}], "
          f"Roof_all range [{r.min():.2f}, {r.max():.2f}], Ground range [{g.min():.2f}, {g.max():.2f}]")
