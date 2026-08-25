import json
import numpy as np
import rasterio
import trimesh


# =========================================================
# PATHS
# =========================================================

BASE = "digital_twin_data/AOI-01_Bilaspur/processed"

OBJ_PATH = f"{BASE}/terrain/terrain_aligned.obj"
SLOPE_PATH = f"{BASE}/terrain_analysis/slope_10m.tif"
NDVI_PATH = f"{BASE}/satellite/NDVI_10m.tif"

OUTPUT_PATH = f"{BASE}/terrain_analysis/terrain_analytics.json"


# =========================================================
# LOAD TERRAIN
# =========================================================

mesh = trimesh.load(
    OBJ_PATH,
    force="mesh"
)

vertices = np.asarray(mesh.vertices)

x = vertices[:, 0]
y = vertices[:, 1]
z = vertices[:, 2]


# =========================================================
# TERRAIN GEOMETRY
# =========================================================

x_min = float(x.min())
x_max = float(x.max())

y_min = float(y.min())
y_max = float(y.max())

z_min = float(z.min())
z_max = float(z.max())

width = x_max - x_min
height = y_max - y_min

planar_area = width * height

surface_area = float(mesh.area)


# =========================================================
# SLOPE ANALYSIS
# =========================================================

with rasterio.open(SLOPE_PATH) as src:
    slope = src.read(1, masked=True)

slope = slope.compressed()

# =========================================================
# NDVI ANALYSIS
# =========================================================

with rasterio.open(NDVI_PATH) as src:
    ndvi = src.read(1, masked=True)

ndvi = ndvi.compressed()

# =========================================================
# NDVI CLASSIFICATION
# =========================================================

very_low = np.sum(ndvi < 0.0)

low = np.sum(
    (ndvi >= 0.0) &
    (ndvi < 0.2)
)

moderate = np.sum(
    (ndvi >= 0.2) &
    (ndvi < 0.5)
)

high = np.sum(ndvi >= 0.5)

total_pixels = len(ndvi)


# =========================================================
# ANALYTICS
# =========================================================

analytics = {

    "terrain": {

        "vertices": int(len(vertices)),

        "faces": int(len(mesh.faces)),

        "elevation_min_m": z_min,

        "elevation_max_m": z_max,

        "elevation_mean_m": float(z.mean()),

        "elevation_range_m":
            float(z_max - z_min),

        "width_m": width,

        "height_m": height,

        "planar_area_m2": planar_area,

        "surface_area_m2": surface_area,

    },


    "slope": {

        "minimum_degrees":
            float(slope.min()),

        "maximum_degrees":
            float(slope.max()),

        "mean_degrees":
            float(slope.mean()),

        "stddev_degrees":
            float(slope.std()),

    },


    "ndvi": {

        "minimum":
            float(ndvi.min()),

        "maximum":
            float(ndvi.max()),

        "mean":
            float(ndvi.mean()),

        "stddev":
            float(ndvi.std()),

        "pixels": int(total_pixels),

        "very_low_count":
            int(very_low),

        "low_count":
            int(low),

        "moderate_count":
            int(moderate),

        "high_count":
            int(high),

        "very_low_percent":
            float(very_low / total_pixels * 100),

        "low_percent":
            float(low / total_pixels * 100),

        "moderate_percent":
            float(moderate / total_pixels * 100),

        "high_percent":
            float(high / total_pixels * 100),

    },


    "bounds": {

        "x_min": x_min,

        "x_max": x_max,

        "y_min": y_min,

        "y_max": y_max,

    }

}


# =========================================================
# SAVE JSON
# =========================================================

with open(
    OUTPUT_PATH,
    "w"
) as f:

    json.dump(
        analytics,
        f,
        indent=4
    )


# =========================================================
# TERMINAL SUMMARY
# =========================================================

print()
print("=" * 55)
print("        BILASPUR DIGITAL TWIN ANALYTICS")
print("=" * 55)

print()

print("TERRAIN")
print("-" * 55)

print(
    f"Vertices       : {len(vertices):,}"
)

print(
    f"Faces          : {len(mesh.faces):,}"
)

print(
    f"Elevation      : {z_min:.2f} - {z_max:.2f} m"
)

print(
    f"Mean Elevation : {z.mean():.2f} m"
)

print(
    f"Terrain Size   : {width:.0f} × {height:.0f} m"
)

print(
    f"Planar Area    : {planar_area:,.2f} m²"
)

print(
    f"Surface Area   : {surface_area:,.2f} m²"
)

print()

print("SLOPE")
print("-" * 55)

print(
    f"Minimum        : {slope.min():.2f}°"
)

print(
    f"Maximum        : {slope.max():.2f}°"
)

print(
    f"Mean           : {slope.mean():.2f}°"
)

print(
    f"Std Dev        : {slope.std():.2f}°"
)

print()

print("NDVI")
print("-" * 55)

print(
    f"Minimum        : {ndvi.min():.3f}"
)

print(
    f"Maximum        : {ndvi.max():.3f}"
)

print(
    f"Mean           : {ndvi.mean():.3f}"
)

print()

print("VEGETATION")
print("-" * 55)

print(
    f"Very Low       : {very_low / total_pixels * 100:.2f}%"
)

print(
    f"Low            : {low / total_pixels * 100:.2f}%"
)

print(
    f"Moderate       : {moderate / total_pixels * 100:.2f}%"
)

print(
    f"High           : {high / total_pixels * 100:.2f}%"
)

print()

print("=" * 55)

print(
    f"Analytics saved: {OUTPUT_PATH}"
)

print("=" * 55)