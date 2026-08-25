import pyvista as pv
import numpy as np


MESH = "lidar_data/bilaspur_lidar_mesh.ply"


print("Loading LiDAR mesh...")

mesh = pv.read(MESH)

print(f"Points: {mesh.n_points:,}")
print(f"Faces : {mesh.n_cells:,}")


# Use Z coordinate as elevation
elevation = np.asarray(mesh.points[:, 2])

print(
    f"Elevation: "
    f"{elevation.min():.2f} - "
    f"{elevation.max():.2f} m"
)


plotter = pv.Plotter()

plotter.add_mesh(
    mesh,
    scalars=elevation,
    cmap="terrain",
    show_edges=False
)

plotter.add_axes()

plotter.show_grid()

plotter.add_text(
    "LiDAR 1m Terrain Mesh",
    position="upper_left",
    font_size=12
)

plotter.show()