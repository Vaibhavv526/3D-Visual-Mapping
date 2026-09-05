from pathlib import Path

import numpy as np
import pyvista as pv


BASE_DIR = Path(__file__).resolve().parents[1]

TERRAIN_FILE = (
    BASE_DIR
    / "data"
    / "outputs"
    / "nz_lidar"
    / "terrain.vtp"
)

OUTPUT_FILE = (
    BASE_DIR
    / "data"
    / "outputs"
    / "nz_lidar"
    / "terrain_layers.vtp"
)


def main():

    print("=" * 70)
    print("CREATING FULL NZ TERRAIN ANALYTICS")
    print("=" * 70)

    terrain = pv.read(TERRAIN_FILE)

    points = np.asarray(
        terrain.points,
        dtype=np.float64
    )

    elevation = np.asarray(
        terrain.point_data["Elevation"],
        dtype=np.float64
    )

    print()
    print("Input terrain:")
    print("Points :", terrain.n_points)
    print("Cells  :", terrain.n_cells)
    print("Bounds :", terrain.bounds)

    # ---------------------------------------------------------
    # Recover the actual terrain grid
    # ---------------------------------------------------------

    xs = np.unique(
        points[:, 0]
    )

    ys = np.unique(
        points[:, 1]
    )

    nx = len(xs)
    ny = len(ys)

    print()
    print("Grid:")
    print("X vertices:", nx)
    print("Y vertices:", ny)
    print("Total     :", nx * ny)

    if nx * ny != len(points):
        raise RuntimeError(
            "Terrain is not a complete regular grid."
        )

    # ---------------------------------------------------------
    # Map every terrain point to its grid position.
    #
    # This avoids assuming that PyVista's point ordering
    # matches reshape(ny, nx).
    # ---------------------------------------------------------

    x_index = np.searchsorted(
        xs,
        points[:, 0]
    )

    y_index = np.searchsorted(
        ys,
        points[:, 1]
    )

    elevation_grid = np.empty(
        (ny, nx),
        dtype=np.float64
    )

    elevation_grid[
        y_index,
        x_index
    ] = elevation

    # ---------------------------------------------------------
    # Validate grid reconstruction
    # ---------------------------------------------------------

    if not np.all(
        np.isfinite(elevation_grid)
    ):
        raise RuntimeError(
            "Terrain grid contains invalid elevation values."
        )

    dx = float(
        np.median(
            np.diff(xs)
        )
    )

    dy = float(
        np.median(
            np.diff(ys)
        )
    )

    print()
    print("Resolution:")
    print("dx:", dx, "m")
    print("dy:", dy, "m")

    # ---------------------------------------------------------
    # Calculate slope
    # ---------------------------------------------------------

    dz_dy, dz_dx = np.gradient(
        elevation_grid,
        dy,
        dx
    )

    slope_grid = np.degrees(
        np.arctan(
            np.sqrt(
                dz_dx ** 2
                +
                dz_dy ** 2
            )
        )
    )

    # Convert grid back to original point order.
    slope = slope_grid[
        y_index,
        x_index
    ].astype(
        np.float32
    )

    # ---------------------------------------------------------
    # Relative elevation
    # ---------------------------------------------------------

    elevation_min = float(
        np.min(elevation)
    )

    elevation_max = float(
        np.max(elevation)
    )

    elevation_range = (
        elevation_max -
        elevation_min
    )

    if elevation_range <= 0:

        relative_elevation = np.zeros(
            len(elevation),
            dtype=np.float32
        )

    else:

        relative_elevation = (
            (
                elevation -
                elevation_min
            )
            /
            elevation_range
        ).astype(
            np.float32
        )

    # ---------------------------------------------------------
    # Sanitize
    # ---------------------------------------------------------

    slope = np.nan_to_num(
        slope,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    relative_elevation = np.nan_to_num(
        relative_elevation,
        nan=0.0,
        posinf=1.0,
        neginf=0.0
    )

    # ---------------------------------------------------------
    # Attach analytics
    # ---------------------------------------------------------

    terrain["Elevation"] = (
        elevation.astype(
            np.float32
        )
    )

    terrain["Slope"] = slope

    terrain["RelativeElevation"] = (
        relative_elevation
    )

    # ---------------------------------------------------------
    # Save
    # ---------------------------------------------------------

    terrain.save(
        OUTPUT_FILE
    )

    print()
    print("=" * 70)
    print("TERRAIN ANALYTICS CREATED")
    print("=" * 70)

    print("Output :", OUTPUT_FILE)
    print("Points :", terrain.n_points)
    print("Cells  :", terrain.n_cells)
    print("Bounds :", terrain.bounds)

    print()
    print("Elevation:")
    print(
        "Min:",
        elevation_min,
        "m"
    )
    print(
        "Max:",
        elevation_max,
        "m"
    )

    print()
    print("Slope:")
    print(
        "Min:",
        float(slope.min()),
        "degrees"
    )
    print(
        "Max:",
        float(slope.max()),
        "degrees"
    )
    print(
        "Mean:",
        float(slope.mean()),
        "degrees"
    )

    print()
    print("Relative elevation:")
    print(
        "Min:",
        float(relative_elevation.min())
    )
    print(
        "Max:",
        float(relative_elevation.max())
    )

    print("=" * 70)


if __name__ == "__main__":
    main()
