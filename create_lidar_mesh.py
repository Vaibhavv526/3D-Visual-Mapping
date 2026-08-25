import rasterio
import numpy as np
import pyvista as pv
import os
import json


# =========================================================
# INPUT / OUTPUT
# =========================================================

DTM = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain_analysis/lidar_dtm_1m.tif"
)

OUTPUT = "lidar_data/bilaspur_lidar_mesh.ply"

METADATA_OUTPUT = "lidar_data/bilaspur_lidar_mesh_metadata.json"


# =========================================================
# LOAD DTM
# =========================================================

print("Loading LiDAR DTM...")

with rasterio.open(DTM) as src:

    elevation = src.read(1)

    transform = src.transform
    crs = src.crs

    width = src.width
    height = src.height

    resolution_x = transform.a
    resolution_y = abs(transform.e)

    x_origin = transform.c
    y_origin = transform.f


print(f"Grid: {width} x {height}")
print(f"Resolution: {resolution_x} m")
print(f"CRS: {crs}")


# =========================================================
# CREATE COORDINATE GRID
# =========================================================

print("Creating mesh vertices...")

x = (
    x_origin
    + np.arange(width, dtype=np.float32) * resolution_x
)

y = (
    y_origin
    - np.arange(height, dtype=np.float32) * resolution_y
)

X, Y = np.meshgrid(x, y)

Z = elevation.astype(np.float32)


# =========================================================
# CENTER COORDINATES
# =========================================================
# This improves 3D rendering precision because the original
# projected coordinates are around hundreds of thousands.

center_x = float(X.mean())
center_y = float(Y.mean())

X = X - center_x
Y = Y - center_y


vertices = np.column_stack(
    (
        X.ravel(),
        Y.ravel(),
        Z.ravel()
    )
).astype(np.float32)


print(f"Vertices: {len(vertices):,}")


# =========================================================
# CREATE TRIANGLES
# =========================================================

print("Creating triangular faces...")

rows = np.arange(
    height - 1,
    dtype=np.int32
)

cols = np.arange(
    width - 1,
    dtype=np.int32
)

C, R = np.meshgrid(cols, rows)

top_left = (
    R * width + C
).ravel()

top_right = top_left + 1

bottom_left = (
    top_left + width
)

bottom_right = bottom_left + 1


# Two triangles per grid cell

faces = np.empty(
    (len(top_left) * 2, 4),
    dtype=np.int32
)

faces[:, 0] = 3

faces[0::2, 1] = top_left
faces[0::2, 2] = bottom_left
faces[0::2, 3] = top_right

faces[1::2, 1] = top_right
faces[1::2, 2] = bottom_left
faces[1::2, 3] = bottom_right


faces = faces.ravel()


print(
    f"Faces: {len(top_left) * 2:,}"
)


# =========================================================
# CREATE PYVISTA MESH
# =========================================================

print("Creating PyVista mesh...")

mesh = pv.PolyData(
    vertices,
    faces
)


# Store elevation as point data

mesh.point_data["Elevation"] = Z.ravel()


# =========================================================
# SAVE MESH
# =========================================================

os.makedirs(
    os.path.dirname(OUTPUT),
    exist_ok=True
)

print("Saving LiDAR mesh...")

mesh.save(
    OUTPUT,
    binary=True
)


# =========================================================
# SAVE GEOREFERENCING METADATA
# =========================================================

metadata = {
    "source": DTM,
    "mesh": OUTPUT,
    "vertices": int(mesh.n_points),
    "faces": int(mesh.n_cells),
    "resolution_m": float(resolution_x),
    "crs": str(crs),
    "original_origin_x": x_origin,
    "original_origin_y": y_origin,
    "render_center_x": center_x,
    "render_center_y": center_y,
    "elevation_min_m": float(Z.min()),
    "elevation_max_m": float(Z.max()),
    "elevation_mean_m": float(Z.mean())
}


with open(
    METADATA_OUTPUT,
    "w"
) as f:

    json.dump(
        metadata,
        f,
        indent=4
    )


# =========================================================
# SUMMARY
# =========================================================

print()
print("=" * 60)
print("          LiDAR 3D TERRAIN MESH CREATED")
print("=" * 60)

print(
    f"Vertices       : {mesh.n_points:,}"
)

print(
    f"Triangles      : {mesh.n_cells:,}"
)

print(
    f"Resolution     : {resolution_x:.1f} m"
)

print(
    f"Elevation      : "
    f"{Z.min():.2f} - {Z.max():.2f} m"
)

print(
    f"CRS            : {crs}"
)

print(
    f"Mesh           : {OUTPUT}"
)

print(
    f"Metadata       : {METADATA_OUTPUT}"
)

print("=" * 60)