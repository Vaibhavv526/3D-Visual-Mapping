from pathlib import Path

import laspy
import numpy as np
import pyvista as pv
from scipy.spatial import cKDTree
from scipy.spatial import ConvexHull
from scipy.interpolate import griddata


BASE_DIR = Path(__file__).resolve().parents[1]

INPUT = (
    BASE_DIR
    / "data"
    / "inputs"
    / "lidar"
    / "CL2_BB32_2024_1000_3840.laz"
)

OUTPUT_DIR = (
    BASE_DIR
    / "data"
    / "outputs"
    / "nz_lidar"
)

BUILDING_POINTS = OUTPUT_DIR / "building_points.vtp"
BUILDING_MESH = OUTPUT_DIR / "building_mesh.vtp"
TERRAIN_MESH = OUTPUT_DIR / "terrain.vtp"


def make_grid_mesh(x, y, z, resolution=2.0):

    xmin = np.floor(x.min())
    xmax = np.ceil(x.max())
    ymin = np.floor(y.min())
    ymax = np.ceil(y.max())

    nx = int(np.ceil((xmax - xmin) / resolution)) + 1
    ny = int(np.ceil((ymax - ymin) / resolution)) + 1

    grid = np.full(
        (ny, nx),
        np.nan,
        dtype=np.float32,
    )

    ix = ((x - xmin) / resolution).astype(int)
    iy = ((y - ymin) / resolution).astype(int)

    valid = (
        (ix >= 0)
        & (ix < nx)
        & (iy >= 0)
        & (iy < ny)
    )

    ix = ix[valid]
    iy = iy[valid]
    zv = z[valid]

    for i, j, value in zip(iy, ix, zv):

        if np.isnan(grid[i, j]) or value < grid[i, j]:
            grid[i, j] = value

    from scipy.ndimage import distance_transform_edt

    missing = np.isnan(grid)

    if missing.any() and (~missing).any():

        indices = distance_transform_edt(
            missing,
            return_distances=False,
            return_indices=True,
        )

        grid[missing] = grid[
            tuple(indices)
        ][missing]

    yy, xx = np.meshgrid(
        np.arange(ny) * resolution + ymin,
        np.arange(nx) * resolution + xmin,
        indexing="ij",
    )

    points = np.column_stack(
        (
            xx.ravel(),
            yy.ravel(),
            grid.ravel(),
        )
    )

    faces = []

    for row in range(ny - 1):

        for col in range(nx - 1):

            a = row * nx + col
            b = a + 1
            c = (row + 1) * nx + col
            d = c + 1

            faces.append([3, a, b, d])
            faces.append([3, a, d, c])

    mesh = pv.PolyData(
        points,
        np.asarray(
            faces,
            dtype=np.int64
        ).ravel(),
    )

    mesh["Elevation"] = grid.ravel()

    return mesh


def create_building_mesh(
    x,
    y,
    z,
    local_ground,
):
    """
    Reconstruct a building from classified LiDAR points.

    Strategy:
      1. Estimate building ground/base elevation.
      2. Extract roof points.
      3. Build a footprint from the XY convex hull.
      4. Build a roof surface from actual roof LiDAR elevations.
      5. Create vertical walls from the footprint to the roof.
      6. Return one watertight-ish triangle mesh.
    """

    from scipy.spatial import ConvexHull

    # ---------------------------------------------------------
    # Basic validation
    # ---------------------------------------------------------

    if len(x) < 10:
        raise RuntimeError(
            "Not enough building points."
        )

    xy = np.column_stack((x, y))

    # ---------------------------------------------------------
    # Estimate local ground
    # ---------------------------------------------------------

    base = float(
        np.median(local_ground)
    )

    # ---------------------------------------------------------
    # Estimate roof elevation
    #
    # Ignore points very close to the ground.
    # This removes lower returns / edge noise.
    # ---------------------------------------------------------

    height_above_ground = z - base

    roof_mask = height_above_ground > 1.5

    if roof_mask.sum() < 20:
        roof_mask = height_above_ground > 0.5

    roof_x = x[roof_mask]
    roof_y = y[roof_mask]
    roof_z = z[roof_mask]

    # Remove extreme outliers from the roof.
    roof_limit = np.percentile(
        roof_z,
        98
    )

    roof_mask2 = roof_z <= roof_limit

    roof_x = roof_x[roof_mask2]
    roof_y = roof_y[roof_mask2]
    roof_z = roof_z[roof_mask2]

    print(
        "Roof points used:",
        len(roof_x)
    )

    # ---------------------------------------------------------
    # Building footprint
    # ---------------------------------------------------------

    footprint_xy = np.column_stack(
        (
            x,
            y,
        )
    )

    hull = ConvexHull(
        footprint_xy
    )

    footprint = footprint_xy[
        hull.vertices
    ]

    n = len(footprint)

    if n < 3:
        raise RuntimeError(
            "Unable to create building footprint."
        )

    print(
        "Footprint vertices:",
        n
    )

    # ---------------------------------------------------------
    # Create roof surface from ACTUAL LiDAR roof points
    # ---------------------------------------------------------

    roof_cloud = pv.PolyData(
        np.column_stack(
            (
                roof_x,
                roof_y,
                roof_z,
            )
        )
    )

    # Delaunay in XY.
    roof_surface = roof_cloud.delaunay_2d()

    if roof_surface.n_cells == 0:
        raise RuntimeError(
            "Unable to reconstruct roof surface."
        )

    # ---------------------------------------------------------
    # Clip roof to building footprint
    #
    # Delaunay can extend slightly outside the footprint.
    # Keep only cells whose centers fall inside the footprint.
    # ---------------------------------------------------------

    footprint_3d = np.column_stack(
        (
            footprint[:, 0],
            footprint[:, 1],
            np.zeros(n),
        )
    )

    footprint_polygon = pv.PolyData(
        footprint_3d
    )

    footprint_polygon = (
        footprint_polygon
        .delaunay_2d()
    )

    try:
        roof_surface = roof_surface.clip_surface(
            footprint_polygon,
            invert=False,
        )
    except Exception:
        # If clipping fails, keep the original roof.
        pass

    # ---------------------------------------------------------
    # Roof mesh
    # ---------------------------------------------------------

    roof_points = np.asarray(
        roof_surface.points,
        dtype=np.float64
    )

    raw_roof_faces = np.asarray(
        roof_surface.faces,
        dtype=np.int64
    )

    roof_faces = []

    offset = 0

    while offset < len(raw_roof_faces):

        count = int(
            raw_roof_faces[offset]
        )

        vertices = raw_roof_faces[
            offset + 1:
            offset + 1 + count
        ]

        if count >= 3:

            for i in range(
                1,
                count - 1
            ):

                roof_faces.append(
                    [
                        3,
                        int(vertices[0]),
                        int(vertices[i]),
                        int(vertices[i + 1]),
                    ]
                )

        offset += count + 1

    # ---------------------------------------------------------
    # Create walls.
    #
    # For every footprint vertex:
    #   bottom = local ground
    #   top    = interpolated roof height
    # ---------------------------------------------------------

    from scipy.spatial import cKDTree

    roof_xy = roof_points[:, :2]

    roof_tree = cKDTree(
        roof_xy
    )

    distances, indices = roof_tree.query(
        footprint,
        k=1
    )

    roof_at_footprint = roof_points[
        indices,
        2
    ]

    # Prevent roof from going below ground.
    roof_at_footprint = np.maximum(
        roof_at_footprint,
        base + 1.0,
    )

    # ---------------------------------------------------------
    # Final vertices
    #
    # First:
    #   footprint bottom
    #
    # Then:
    #   footprint roof edge
    #
    # Then:
    #   interior roof points
    # ---------------------------------------------------------

    base_vertices = np.column_stack(
        (
            footprint[:, 0],
            footprint[:, 1],
            np.full(
                n,
                base,
                dtype=np.float64,
            ),
        )
    )

    roof_edge_vertices = np.column_stack(
        (
            footprint[:, 0],
            footprint[:, 1],
            roof_at_footprint,
        )
    )

    vertices = np.vstack(
        (
            base_vertices,
            roof_edge_vertices,
            roof_points,
        )
    )

    bottom_offset = 0
    edge_offset = n
    roof_offset = 2 * n

    faces = []

    # ---------------------------------------------------------
    # Walls
    # ---------------------------------------------------------

    for i in range(n):

        j = (
            i + 1
        ) % n

        b0 = bottom_offset + i
        b1 = bottom_offset + j

        r0 = edge_offset + i
        r1 = edge_offset + j

        # Triangle 1
        faces.append(
            [
                3,
                b0,
                b1,
                r1,
            ]
        )

        # Triangle 2
        faces.append(
            [
                3,
                b0,
                r1,
                r0,
            ]
        )

    # ---------------------------------------------------------
    # Roof
    #
    # Re-map Delaunay roof vertices into the final mesh.
    # Roof points occupy vertices starting at roof_offset.
    # ---------------------------------------------------------

    for face in roof_faces:

        faces.append(
            [
                3,
                roof_offset + face[1],
                roof_offset + face[2],
                roof_offset + face[3],
            ]
        )

    # ---------------------------------------------------------
    # Add roof edge connection triangles.
    #
    # Connect footprint roof edge to nearby roof surface.
    # ---------------------------------------------------------

    for i in range(n):

        j = (
            i + 1
        ) % n

        # Find nearest roof points.
        p0 = roof_tree.query(
            footprint[i]
        )[1]

        p1 = roof_tree.query(
            footprint[j]
        )[1]

        r0 = edge_offset + i
        r1 = edge_offset + j

        q0 = roof_offset + int(p0)
        q1 = roof_offset + int(p1)

        faces.append(
            [
                3,
                r0,
                r1,
                q1,
            ]
        )

        faces.append(
            [
                3,
                r0,
                q1,
                q0,
            ]
        )

    # ---------------------------------------------------------
    # Convert to PyVista face stream
    # ---------------------------------------------------------

    face_stream = np.concatenate(
        [
            np.asarray(
                face,
                dtype=np.int64,
            )
            for face in faces
        ]
    )

    mesh = pv.PolyData(
        vertices,
        face_stream,
    )

    # ---------------------------------------------------------
    # Height attributes
    # ---------------------------------------------------------

    heights = (
        vertices[:, 2] - base
    )

    mesh["Height"] = (
        heights.astype(
            np.float32
        )
    )

    print()
    print(
        "Building base:",
        base
    )

    print(
        "Roof minimum:",
        float(roof_z.min())
    )

    print(
        "Roof maximum:",
        float(roof_z.max())
    )

    print(
        "Estimated building height:",
        float(
            np.percentile(
                roof_z,
                95
            ) - base
        )
    )

    return mesh

    print()
    print("=" * 70)
    print("BUILDING RECONSTRUCTION")
    print("=" * 70)

    # ---------------------------------------------------------
    # Building footprint
    # ---------------------------------------------------------

    xy = np.column_stack(
        (bx, by)
    )

    hull = ConvexHull(xy)

    footprint = xy[hull.vertices]

    print(
        "Footprint vertices:",
        len(footprint)
    )

    # ---------------------------------------------------------
    # Local ground
    # ---------------------------------------------------------

    base_z = float(
        np.median(local_ground)
    )

    # ---------------------------------------------------------
    # Roof elevation
    #
    # Use high percentile to represent the roof
    # rather than isolated low building returns.
    # ---------------------------------------------------------

    roof_reference = float(
        np.percentile(
            bz,
            95
        )
    )

    print(
        "Building base:",
        base_z
    )

    print(
        "Roof reference:",
        roof_reference
    )

    print(
        "Estimated height:",
        roof_reference - base_z
    )

    # ---------------------------------------------------------
    # Roof points
    #
    # Keep upper building returns so the roof retains
    # measured elevation variation.
    # ---------------------------------------------------------

    roof_threshold = np.percentile(
        bz,
        75
    )

    roof_mask = bz >= roof_threshold

    rx = bx[roof_mask]
    ry = by[roof_mask]
    rz = bz[roof_mask]

    print(
        "Roof points:",
        len(rx)
    )

    # ---------------------------------------------------------
    # Create roof vertices
    #
    # Start with footprint vertices and estimate roof
    # elevations from nearby LiDAR roof returns.
    # ---------------------------------------------------------

    roof_vertices = []

    roof_tree = cKDTree(
        np.column_stack(
            (rx, ry)
        )
    )

    for px, py in footprint:

        distances, indices = roof_tree.query(
            [px, py],
            k=min(12, len(rx))
        )

        if np.isscalar(indices):

            roof_z = rz[indices]

        else:

            roof_z = rz[
                np.asarray(indices)
            ]

        # Robust local roof estimate.
        value = float(
            np.median(
                roof_z
            )
        )

        roof_vertices.append(
            [
                px,
                py,
                value,
            ]
        )

    roof_vertices = np.asarray(
        roof_vertices,
        dtype=np.float64
    )

    # ---------------------------------------------------------
    # Build base + roof vertices
    # ---------------------------------------------------------

    base_vertices = np.column_stack(
        (
            footprint[:, 0],
            footprint[:, 1],
            np.full(
                len(footprint),
                base_z
            )
        )
    )

    vertices = np.vstack(
        (
            base_vertices,
            roof_vertices,
        )
    )

    n = len(footprint)

    faces = []

    # ---------------------------------------------------------
    # Roof
    # ---------------------------------------------------------

    roof_faces = []


    # ---------------------------------------------------------
    # Walls
    # ---------------------------------------------------------

    for i in range(n):

        j = (i + 1) % n

        b0 = i
        b1 = j

        r0 = n + i
        r1 = n + j

        # Side 1
        faces.append(
            [
                4,
                b0,
                b1,
                r1,
                r0,
            ]
        )

    # ---------------------------------------------------------
    # Roof triangulation
    # ---------------------------------------------------------

    roof_cloud = pv.PolyData(
        roof_vertices
    )

    roof_surface = roof_cloud.delaunay_2d()

    roof_faces_raw = roof_surface.faces.reshape(
        -1,
        4
    )

    for face in roof_faces_raw:

        a = int(face[1])
        b = int(face[2])
        c = int(face[3])

        faces.append(
            [
                3,
                n + a,
                n + b,
                n + c,
            ]
        )

    # ---------------------------------------------------------
    # Bottom face
    # ---------------------------------------------------------

    for i in range(1, n - 1):

        faces.append(
            [
                3,
                0,
                i + 1,
                i,
            ]
        )

    # ---------------------------------------------------------
    # Final building mesh
    # ---------------------------------------------------------

    # PyVista accepts mixed triangle/quad faces when the
    # complete face stream is flattened directly.
    face_stream = np.concatenate([
        np.asarray(face, dtype=np.int64)
        for face in faces
    ])

    mesh = pv.PolyData(
        vertices,
        face_stream,
    )

    # Point-level height
    mesh["Height"] = (
        mesh.points[:, 2]
        - base_z
    )

    return mesh


def main():

    print("=" * 70)
    print("NEW ZEALAND LiDAR PROCESSING")
    print("=" * 70)

    print()
    print("Input:")
    print(INPUT)

    las = laspy.read(INPUT)

    classification = np.asarray(
        las.classification
    )

    x = np.asarray(las.x)
    y = np.asarray(las.y)
    z = np.asarray(las.z)

    print()
    print(
        "Total points:",
        len(x)
    )

    ground = classification == 2
    buildings = classification == 6
    vegetation = classification == 5

    print(
        "Ground points:",
        int(ground.sum())
    )

    print(
        "Building points:",
        int(buildings.sum())
    )

    print(
        "Vegetation points:",
        int(vegetation.sum())
    )

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ---------------------------------------------------------
    # Building point cloud
    # ---------------------------------------------------------

    building_points = np.column_stack(
        (
            x[buildings],
            y[buildings],
            z[buildings],
        )
    )

    building_cloud = pv.PolyData(
        building_points
    )

    building_cloud["Classification"] = np.full(
        len(building_points),
        6,
        dtype=np.uint8,
    )

    building_cloud.save(
        BUILDING_POINTS
    )

    print()
    print(
        "Building point cloud:",
        BUILDING_POINTS
    )

    # ---------------------------------------------------------
    # Local ground beneath building
    # ---------------------------------------------------------

    ground_xy = np.column_stack(
        (
            x[ground],
            y[ground],
        )
    )

    ground_z = z[ground]

    building_xy = np.column_stack(
        (
            x[buildings],
            y[buildings],
        )
    )

    ground_tree = cKDTree(
        ground_xy
    )

    distances, indices = ground_tree.query(
        building_xy,
        k=1
    )

    local_ground = ground_z[
        indices
    ]

    # ---------------------------------------------------------
    # Reconstruct building
    # ---------------------------------------------------------

    building_mesh = create_building_mesh(
        x[buildings],
        y[buildings],
        z[buildings],
        local_ground,
    )

    building_mesh.save(
        BUILDING_MESH
    )

    print()
    print(
        "Building mesh:",
        BUILDING_MESH
    )

    print(
        "Building mesh points:",
        building_mesh.n_points
    )

    print(
        "Building mesh cells:",
        building_mesh.n_cells
    )

    # ---------------------------------------------------------
    # Terrain
    # ---------------------------------------------------------

    terrain = make_grid_mesh(
        x[ground],
        y[ground],
        z[ground],
        resolution=2.0,
    )

    terrain.save(
        TERRAIN_MESH
    )

    print()
    print(
        "Terrain mesh:",
        TERRAIN_MESH
    )

    print(
        "Terrain points:",
        terrain.n_points
    )

    print(
        "Terrain cells:",
        terrain.n_cells
    )

    print()
    print("=" * 70)
    print("LiDAR PROCESSING COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
