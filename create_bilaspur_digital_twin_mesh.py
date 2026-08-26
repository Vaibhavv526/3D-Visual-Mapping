import rasterio
import numpy as np
import pyvista as pv

DEM = "digital_twin_data/AOI-01_Bilaspur/processed/terrain/DEM_10m_aligned.tif"
RGB = "digital_twin_data/AOI-01_Bilaspur/processed/satellite/RGB_10m.tif"
NDVI = "digital_twin_data/AOI-01_Bilaspur/processed/satellite/NDVI_10m.tif"
SLOPE = "digital_twin_data/AOI-01_Bilaspur/processed/terrain_analysis/slope_10m.tif"

print("Loading Bilaspur datasets...")

with rasterio.open(DEM) as src:
    dem = src.read(1).astype(np.float32)
    transform = src.transform
    crs = src.crs
    shape = src.shape

with rasterio.open(RGB) as src:
    rgb = src.read()
    rgb_transform = src.transform
    rgb_crs = src.crs

with rasterio.open(NDVI) as src:
    ndvi = src.read(1).astype(np.float32)

    if src.nodata is not None:
        ndvi[ndvi == src.nodata] = np.nan
    ndvi_transform = src.transform
    ndvi_crs = src.crs

with rasterio.open(SLOPE) as src:
    slope = src.read(1).astype(np.float32)

    if src.nodata is not None:
        slope[slope == src.nodata] = np.nan
    slope_transform = src.transform
    slope_crs = src.crs

# ---------------------------------------------------------
# Validate spatial alignment
# ---------------------------------------------------------

assert rgb.shape[1:] == shape, f"RGB shape mismatch: {rgb.shape}"
assert ndvi.shape == shape, f"NDVI shape mismatch: {ndvi.shape}"
assert slope.shape == shape, f"Slope shape mismatch: {slope.shape}"

assert rgb_crs == crs, "RGB CRS mismatch"
assert ndvi_crs == crs, "NDVI CRS mismatch"
assert slope_crs == crs, "Slope CRS mismatch"

assert rgb_transform == transform, "RGB grid alignment mismatch"
assert ndvi_transform == transform, "NDVI grid alignment mismatch"
assert slope_transform == transform, "Slope grid alignment mismatch"

print("Spatial alignment: VERIFIED")
print("CRS:", crs)
print("Grid:", shape[1], "x", shape[0])
print("Resolution:", transform.a, "m")

# ---------------------------------------------------------
# Build coordinates
# ---------------------------------------------------------

rows, cols = np.indices(shape)

xs = transform.c + (cols + 0.5) * transform.a
ys = transform.f + (rows + 0.5) * transform.e

# Shift coordinates to local AOI coordinates.
# This keeps the mesh numerically stable and easier to visualize.
x = xs - xs.min()
y = ys.max() - ys

z = dem

points = np.column_stack([
    x.ravel(),
    y.ravel(),
    z.ravel()
])

# ---------------------------------------------------------
# Build triangular terrain faces
# ---------------------------------------------------------

nrows, ncols = shape

faces = []

for r in range(nrows - 1):
    for c in range(ncols - 1):

        p1 = r * ncols + c
        p2 = p1 + 1
        p3 = (r + 1) * ncols + c
        p4 = p3 + 1

        faces.append([3, p1, p2, p3])
        faces.append([3, p2, p4, p3])

faces = np.asarray(faces, dtype=np.int64).ravel()

# ---------------------------------------------------------
# Create PyVista mesh
# ---------------------------------------------------------

mesh = pv.PolyData(points, faces)

# ---------------------------------------------------------
# Attach analytical layers
# ---------------------------------------------------------

mesh["Elevation"] = z.ravel()
mesh["NDVI"] = ndvi.ravel()
mesh["Slope"] = slope.ravel()

# RGB → vertex colors
rgb_pixels = np.moveaxis(rgb, 0, -1).reshape(-1, 3)

# Ensure valid uint8 RGB
rgb_pixels = np.clip(rgb_pixels, 0, 255).astype(np.uint8)

mesh["RGB"] = rgb_pixels

# ---------------------------------------------------------
# Save unified Digital Twin mesh
# ---------------------------------------------------------

output = "digital_twin_data/AOI-01_Bilaspur/processed/terrain_analysis/bilaspur_digital_twin_mesh.vtp"

mesh.save(output)

print()
print("=" * 65)
print("       BILASPUR DIGITAL TWIN MESH CREATED")
print("=" * 65)
print("Vertices       :", mesh.n_points)
print("Triangles      :", mesh.n_cells)
print("Elevation      :", f"{z.min():.2f} - {z.max():.2f} m")
print("Mean Elevation :", f"{z.mean():.2f} m")
print(
    "NDVI           :",
    f"{np.nanmin(ndvi):.3f} - {np.nanmax(ndvi):.3f}"
)

print(
    "Slope          :",
    f"{np.nanmin(slope):.2f} - {np.nanmax(slope):.2f} degrees"
)
print("CRS            :", crs)
print("Mesh           :", output)
print("=" * 65)
