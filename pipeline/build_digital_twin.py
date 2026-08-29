from pathlib import Path

import numpy as np
import pyvista as pv
import rasterio


def build_digital_twin(
    dem_path: Path,
    rgb_path: Path,
    ndvi_path: Path,
    slope_path: Path,
    output_path: Path,
):
    print()
    print("=" * 65)
    print("        BUILDING DIGITAL TWIN")
    print("=" * 65)

    # -----------------------------------------------------
    # Validate inputs
    # -----------------------------------------------------

    inputs = {
        "DEM": dem_path,
        "RGB": rgb_path,
        "NDVI": ndvi_path,
        "Slope": slope_path,
    }

    for name, path in inputs.items():

        if not path.exists():
            raise FileNotFoundError(
                f"{name} not found: {path}"
            )

        print(
            f"{name:<8}: {path}"
        )

    # -----------------------------------------------------
    # Load DEM
    # -----------------------------------------------------

    with rasterio.open(dem_path) as src:

        dem = src.read(1).astype(
            np.float32
        )

        dem_transform = src.transform
        dem_crs = src.crs
        dem_shape = src.shape

    # -----------------------------------------------------
    # Load RGB
    # -----------------------------------------------------

    with rasterio.open(rgb_path) as src:

        rgb = src.read()

        rgb_transform = src.transform
        rgb_crs = src.crs
        rgb_shape = src.shape

    # -----------------------------------------------------
    # Load NDVI
    # -----------------------------------------------------

    with rasterio.open(ndvi_path) as src:

        ndvi = src.read(1).astype(
            np.float32
        )

        ndvi_transform = src.transform
        ndvi_crs = src.crs
        ndvi_shape = src.shape

    # -----------------------------------------------------
    # Load slope
    # -----------------------------------------------------

    with rasterio.open(slope_path) as src:

        slope = src.read(1).astype(
            np.float32
        )

        slope_transform = src.transform
        slope_crs = src.crs
        slope_shape = src.shape

    # -----------------------------------------------------
    # Spatial validation
    # -----------------------------------------------------

    print()
    print("Validating spatial alignment...")

    if rgb_shape[1:] != dem_shape:
        raise ValueError(
            f"RGB grid mismatch: "
            f"{rgb_shape[1:]} != {dem_shape}"
        )

    if ndvi_shape != dem_shape:
        raise ValueError(
            "NDVI grid does not match DEM"
        )

    if slope_shape != dem_shape:
        raise ValueError(
            "Slope grid does not match DEM"
        )

    if rgb_crs != dem_crs:
        raise ValueError(
            "RGB CRS does not match DEM"
        )

    if ndvi_crs != dem_crs:
        raise ValueError(
            "NDVI CRS does not match DEM"
        )

    if slope_crs != dem_crs:
        raise ValueError(
            "Slope CRS does not match DEM"
        )

    if rgb_transform != dem_transform:
        raise ValueError(
            "RGB transform does not match DEM"
        )

    if ndvi_transform != dem_transform:
        raise ValueError(
            "NDVI transform does not match DEM"
        )

    if slope_transform != dem_transform:
        raise ValueError(
            "Slope transform does not match DEM"
        )

    print("Spatial alignment: VERIFIED")
    print("CRS:", dem_crs)
    print(
        "Grid:",
        dem_shape[1],
        "x",
        dem_shape[0],
    )

    # -----------------------------------------------------
    # Clean numerical data
    # -----------------------------------------------------

    dem = np.nan_to_num(
        dem,
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    ndvi = np.nan_to_num(
        ndvi,
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    slope = np.nan_to_num(
        slope,
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    # -----------------------------------------------------
    # Build local coordinates
    # -----------------------------------------------------

    rows, cols = np.indices(
        dem_shape
    )

    xs = (
        dem_transform.c
        + (cols + 0.5)
        * dem_transform.a
    )

    ys = (
        dem_transform.f
        + (rows + 0.5)
        * dem_transform.e
    )

    # Local coordinates make browser rendering stable.
    x = xs - xs.min()
    y = ys.max() - ys

    z = dem

    points = np.column_stack(
        [
            x.ravel(),
            y.ravel(),
            z.ravel(),
        ]
    )

    # -----------------------------------------------------
    # Build triangles
    # -----------------------------------------------------

    nrows, ncols = dem_shape

    faces = []

    for row in range(nrows - 1):

        for col in range(ncols - 1):

            p1 = row * ncols + col
            p2 = p1 + 1
            p3 = (row + 1) * ncols + col
            p4 = p3 + 1

            faces.append(
                [3, p1, p2, p3]
            )

            faces.append(
                [3, p2, p4, p3]
            )

    faces = np.asarray(
        faces,
        dtype=np.int64,
    ).ravel()

    # -----------------------------------------------------
    # Create mesh
    # -----------------------------------------------------

    mesh = pv.PolyData(
        points,
        faces,
    )

    mesh["Elevation"] = (
        dem.ravel()
    )

    mesh["NDVI"] = (
        ndvi.ravel()
    )

    mesh["Slope"] = (
        slope.ravel()
    )

    # -----------------------------------------------------
    # RGB vertex colors
    # -----------------------------------------------------

    if rgb.shape[0] < 3:
        raise ValueError(
            "RGB raster must contain 3 bands"
        )

    rgb_pixels = np.moveaxis(
        rgb[:3],
        0,
        -1,
    ).reshape(-1, 3)

    rgb_pixels = np.nan_to_num(
        rgb_pixels,
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    rgb_pixels = np.clip(
        rgb_pixels,
        0,
        255,
    ).astype(np.uint8)

    mesh["RGB"] = rgb_pixels

    # -----------------------------------------------------
    # Save
    # -----------------------------------------------------

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    mesh.save(
        output_path
    )

    print()
    print("=" * 65)
    print("        DIGITAL TWIN CREATED")
    print("=" * 65)

    print(
        "Vertices   :",
        mesh.n_points,
    )

    print(
        "Triangles  :",
        mesh.n_cells,
    )

    print(
        "Elevation  :",
        f"{float(z.min()):.2f}"
        f" → "
        f"{float(z.max()):.2f} m",
    )

    print(
        "CRS        :",
        dem_crs,
    )

    print(
        "Resolution :",
        dem_transform.a,
        "m",
    )

    print(
        "Output     :",
        output_path,
    )

    return {
        "status": "completed",
        "vertices": mesh.n_points,
        "triangles": mesh.n_cells,
        "crs": str(dem_crs),
        "resolution_m": float(
            dem_transform.a
        ),
        "output": str(output_path),
    }
