from pathlib import Path

import laspy
import numpy as np
import pyvista as pv
from scipy.spatial import cKDTree, ConvexHull
from shapely.geometry import Polygon, Point


BASE_DIR = Path(__file__).resolve().parents[1]

INPUT_DIR = (
    BASE_DIR
    / "data"
    / "inputs"
    / "lidar"
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

EXPECTED_CRS = "EPSG:2193"


def discover_lidar_files():
    """
    Discover the four Auckland NZ LiDAR tiles used by
    the current prototype.
    """

    files = [
        INPUT_DIR / "CL2_BB32_2024_1000_3840.laz",
        INPUT_DIR / "nz_tiles" / "CL2_BB32_2024_1000_3740.laz",
        INPUT_DIR / "nz_tiles" / "CL2_BB32_2024_1000_3741.laz",
        INPUT_DIR / "nz_tiles" / "CL2_BB32_2024_1000_3841.laz",
    ]

    missing = [
        str(p)
        for p in files
        if not p.exists()
    ]

    if missing:
        raise FileNotFoundError(
            "Missing LiDAR tiles:\n"
            + "\n".join(missing)
        )

    return files


def validate_crs(las, path):
    """
    Validate horizontal CRS of a LiDAR tile.

    The source LAS/LAZ uses a compound CRS containing
    NZTM2000 + NZVD2016. The horizontal project CRS is
    EPSG:2193.
    """

    crs = las.header.parse_crs()

    if crs is None:
        raise RuntimeError(
            f"{path.name}: CRS metadata is missing."
        )

    epsg = None

    try:
        epsg = crs.to_epsg()
    except Exception:
        pass

    if epsg != 2193:

        # Compound CRS may not resolve directly to EPSG 2193.
        crs_text = str(crs)

        if (
            "EPSG:2193" not in crs_text
            and
            "NZGD2000 / New Zealand Transverse Mercator 2000"
            not in crs_text
        ):
            raise RuntimeError(
                f"{path.name}: incompatible CRS.\n"
                f"Detected: {crs}"
            )

    return crs


def read_tiles():
    """
    Read and validate all LiDAR tiles.

    Only arrays required by the digital twin are retained.
    """

    files = discover_lidar_files()

    all_x = []
    all_y = []
    all_z = []
    all_classification = []

    total = 0

    print()
    print("=" * 70)
    print("MULTI-TILE LiDAR INPUT")
    print("=" * 70)

    for path in files:

        print()
        print("Reading:", path.name)

        las = laspy.read(path)

        crs = validate_crs(
            las,
            path
        )

        print(
            "Points:",
            f"{len(las.points):,}"
        )

        print(
            "CRS:",
            EXPECTED_CRS
        )

        x = np.asarray(
            las.x,
            dtype=np.float64
        )

        y = np.asarray(
            las.y,
            dtype=np.float64
        )

        z = np.asarray(
            las.z,
            dtype=np.float64
        )

        classification = np.asarray(
            las.classification,
            dtype=np.uint8
        )

        all_x.append(x)
        all_y.append(y)
        all_z.append(z)
        all_classification.append(
            classification
        )

        total += len(x)

    print()
    print("-" * 70)
    print(
        "Total LiDAR points:",
        f"{total:,}"
    )

    x = np.concatenate(all_x)
    y = np.concatenate(all_y)
    z = np.concatenate(all_z)

    classification = np.concatenate(
        all_classification
    )

    print(
        "Combined X:",
        float(x.min()),
        "->",
        float(x.max())
    )

    print(
        "Combined Y:",
        float(y.min()),
        "->",
        float(y.max())
    )

    print("-" * 70)

    return (
        x,
        y,
        z,
        classification
    )


def make_grid_mesh(
    x,
    y,
    z,
    resolution=2.0,
):
    """
    Create a terrain mesh from ground-classified
    LiDAR points.
    """

    xmin = np.floor(x.min())
    xmax = np.ceil(x.max())

    ymin = np.floor(y.min())
    ymax = np.ceil(y.max())

    nx = (
        int(
            np.ceil(
                (xmax - xmin)
                / resolution
            )
        )
        + 1
    )

    ny = (
        int(
            np.ceil(
                (ymax - ymin)
                / resolution
            )
        )
        + 1
    )

    grid = np.full(
        (ny, nx),
        np.nan,
        dtype=np.float32,
    )

    ix = (
        (x - xmin)
        / resolution
    ).astype(np.int32)

    iy = (
        (y - ymin)
        / resolution
    ).astype(np.int32)

    valid = (
        (ix >= 0)
        & (ix < nx)
        & (iy >= 0)
        & (iy < ny)
    )

    ix = ix[valid]
    iy = iy[valid]
    zv = z[valid]

    # Efficient minimum-per-cell aggregation.
    flat_index = iy * nx + ix

    order = np.argsort(
        flat_index
    )

    sorted_index = flat_index[order]
    sorted_z = zv[order]

    unique_index, first = np.unique(
        sorted_index,
        return_index=True
    )

    minimum_z = np.minimum.reduceat(
        sorted_z,
        first
    )

    grid.flat[
        unique_index
    ] = minimum_z.astype(
        np.float32
    )

    # Fill empty cells using nearest
    # valid ground cell.
    from scipy.ndimage import (
        distance_transform_edt
    )

    missing = np.isnan(grid)

    if (
        missing.any()
        and
        (~missing).any()
    ):

        indices = distance_transform_edt(
            missing,
            return_distances=False,
            return_indices=True,
        )

        grid[missing] = grid[
            tuple(indices)
        ][missing]

    yy, xx = np.meshgrid(
        np.arange(ny)
        * resolution
        + ymin,

        np.arange(nx)
        * resolution
        + xmin,

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

            faces.append(
                [3, a, b, d]
            )

            faces.append(
                [3, a, d, c]
            )

    mesh = pv.PolyData(
        points,
        np.asarray(
            faces,
            dtype=np.int64
        ).ravel(),
    )

    mesh["Elevation"] = (
        grid.ravel()
    )

    return mesh


def create_building_mesh(
    bx,
    by,
    bz,
    local_ground,
):
    """
    Reconstruct a clean 3D building mesh from classified LiDAR.

    LiDAR roof points are converted into a regular XY elevation grid
    using local inverse-distance weighting. This avoids the very long,
    skinny and crossing triangles produced by Delaunay triangulation
    directly on the raw roof point cloud.
    """

    if len(bx) < 10:
        return None, None

    bx = np.asarray(bx, dtype=np.float64)
    by = np.asarray(by, dtype=np.float64)
    bz = np.asarray(bz, dtype=np.float64)
    local_ground = np.asarray(
        local_ground,
        dtype=np.float64,
    )

    # ---------------------------------------------------------
    # Building base and robust roof reference
    # ---------------------------------------------------------

    base = float(
        np.percentile(
            local_ground,
            50
        )
    )

    roof_reference = float(
        np.percentile(
            bz,
            95
        )
    )

    height = roof_reference - base

    if height <= 0.5:
        return None, None

    # ---------------------------------------------------------
    # Building footprint
    # ---------------------------------------------------------

    xy = np.column_stack(
        (
            bx,
            by,
        )
    )

    try:
        hull_xy = ConvexHull(xy)
    except Exception:
        return None, None

    footprint = xy[
        hull_xy.vertices
    ]

    if len(footprint) < 3:
        return None, None

    footprint_polygon = Polygon(
        footprint
    )

    if not footprint_polygon.is_valid:
        footprint_polygon = footprint_polygon.buffer(0)

    if footprint_polygon.is_empty:
        return None, None

    # ---------------------------------------------------------
    # Select high LiDAR points representing the roof
    # ---------------------------------------------------------

    roof_threshold = float(
        np.percentile(
            bz,
            70
        )
    )

    roof_mask = bz >= roof_threshold

    rx = bx[roof_mask]
    ry = by[roof_mask]
    rz = bz[roof_mask]

    # Small / sparse buildings
    if len(rx) < 6:

        roof_threshold = float(
            np.percentile(
                bz,
                60
            )
        )

        roof_mask = bz >= roof_threshold

        rx = bx[roof_mask]
        ry = by[roof_mask]
        rz = bz[roof_mask]

    if len(rx) < 3:
        return None, None

    # ---------------------------------------------------------
    # Remove extreme roof outliers
    # ---------------------------------------------------------

    roof_low = float(
        np.percentile(
            rz,
            2
        )
    )

    roof_high = float(
        np.percentile(
            rz,
            98
        )
    )

    valid = (
        (rz >= roof_low)
        &
        (rz <= roof_high)
    )

    rx = rx[valid]
    ry = ry[valid]
    rz = rz[valid]

    if len(rx) < 3:
        return None, None

    # ---------------------------------------------------------
    # Keep roof points inside the footprint
    # ---------------------------------------------------------

    inside = np.array(
        [
            footprint_polygon.contains(
                Point(px, py)
            )
            or footprint_polygon.touches(
                Point(px, py)
            )
            for px, py in zip(rx, ry)
        ],
        dtype=bool,
    )

    rx = rx[inside]
    ry = ry[inside]
    rz = rz[inside]

    if len(rx) < 3:
        return None, None

    # ---------------------------------------------------------
    # Roof elevation interpolation
    #
    # Build a regular grid instead of triangulating raw points.
    # This produces local, stable triangles.
    # ---------------------------------------------------------

    min_x = float(
        footprint[:, 0].min()
    )

    max_x = float(
        footprint[:, 0].max()
    )

    min_y = float(
        footprint[:, 1].min()
    )

    max_y = float(
        footprint[:, 1].max()
    )

    width = max_x - min_x
    depth = max_y - min_y

    # Adapt resolution to building size.
    # Keep enough points for small buildings while avoiding
    # excessive meshes for large buildings.
    grid_resolution = 1.5

    if max(width, depth) < 12.0:
        grid_resolution = 1.0
    elif max(width, depth) > 60.0:
        grid_resolution = 2.0

    xs = np.arange(
        min_x,
        max_x + grid_resolution * 0.5,
        grid_resolution,
    )

    ys = np.arange(
        min_y,
        max_y + grid_resolution * 0.5,
        grid_resolution,
    )

    grid_points = []

    for py in ys:

        for px in xs:

            if (
                footprint_polygon.contains(
                    Point(px, py)
                )
                or footprint_polygon.touches(
                    Point(px, py)
                )
            ):
                grid_points.append(
                    [
                        px,
                        py,
                    ]
                )

    # ---------------------------------------------------------
    # Add footprint boundary samples.
    #
    # This makes the roof reach the actual building perimeter.
    # ---------------------------------------------------------

    boundary_samples = []

    for i in range(
        len(footprint)
    ):

        p0 = footprint[i]
        p1 = footprint[
            (i + 1) % len(footprint)
        ]

        distance = float(
            np.linalg.norm(
                p1 - p0
            )
        )

        segments = max(
            1,
            int(
                np.ceil(
                    distance /
                    grid_resolution
                )
            )
        )

        for j in range(
            segments
        ):

            t = j / segments

            boundary_samples.append(
                [
                    p0[0] * (1.0 - t)
                    + p1[0] * t,

                    p0[1] * (1.0 - t)
                    + p1[1] * t,
                ]
            )

    if boundary_samples:
        grid_points.extend(
            boundary_samples
        )

    grid_points = np.asarray(
        grid_points,
        dtype=np.float64,
    )

    if len(grid_points) < 3:
        return None, None

    # Remove duplicate XY locations.
    grid_points = np.unique(
        grid_points,
        axis=0,
    )

    # ---------------------------------------------------------
    # Local inverse-distance roof interpolation
    # ---------------------------------------------------------

    roof_xy = np.column_stack(
        (
            rx,
            ry,
        )
    )

    roof_tree = cKDTree(
        roof_xy
    )

    roof_vertices = []

    k = min(
        12,
        len(rz)
    )

    for px, py in grid_points:

        distances, indices = roof_tree.query(
            [
                px,
                py,
            ],
            k=k,
        )

        distances = np.atleast_1d(
            distances
        )

        indices = np.atleast_1d(
            indices
        )

        local_z = rz[
            indices
        ]

        # Exact LiDAR point.
        if distances[0] < 1e-8:

            z = float(
                local_z[0]
            )

        else:

            weights = 1.0 / (
                distances + 0.25
            )

            z = float(
                np.sum(
                    weights * local_z
                )
                /
                np.sum(
                    weights
                )
            )

        # Prevent interpolation from creating
        # physically impossible building heights.
        z = float(
            np.clip(
                z,
                base + 0.5,
                roof_reference,
            )
        )

        roof_vertices.append(
            [
                px,
                py,
                z,
            ]
        )

    roof_vertices = np.asarray(
        roof_vertices,
        dtype=np.float64,
    )

    # ---------------------------------------------------------
    # Clean roof triangulation
    # ---------------------------------------------------------

    roof_cloud = pv.PolyData(
        roof_vertices
    )

    try:
        roof_surface = roof_cloud.delaunay_2d()
    except Exception:
        return None, None

    if roof_surface.n_cells == 0:
        return None, None

    roof_points = np.asarray(
        roof_surface.points,
        dtype=np.float64,
    )

    roof_faces = np.asarray(
        roof_surface.faces,
        dtype=np.int64,
    )

    # ---------------------------------------------------------
    # Remove any triangles outside the building footprint.
    #
    # ConvexHull footprint normally prevents this, but checking
    # triangle centroids makes the reconstruction robust.
    # ---------------------------------------------------------

    clean_faces = []

    offset = 0

    while offset < len(
        roof_faces
    ):

        count = int(
            roof_faces[offset]
        )

        ids = roof_faces[
            offset + 1:
            offset + 1 + count
        ]

        if count >= 3:

            for k_face in range(
                1,
                count - 1
            ):

                tri_ids = [
                    int(ids[0]),
                    int(ids[k_face]),
                    int(ids[k_face + 1]),
                ]

                centroid = (
                    roof_points[
                        tri_ids,
                        :2
                    ].mean(axis=0)
                )

                if (
                    footprint_polygon.contains(
                        Point(
                            float(centroid[0]),
                            float(centroid[1]),
                        )
                    )
                    or footprint_polygon.touches(
                        Point(
                            float(centroid[0]),
                            float(centroid[1]),
                        )
                    )
                ):
                    clean_faces.append(
                        tri_ids
                    )

        offset += count + 1

    if not clean_faces:
        return None, None

    # ---------------------------------------------------------
    # Build roof boundary ring with LiDAR-derived elevations
    # ---------------------------------------------------------

    boundary_points = []

    k_boundary = min(
        12,
        len(rz)
    )

    for px, py in footprint:

        distances, indices = roof_tree.query(
            [
                px,
                py,
            ],
            k=k_boundary,
        )

        distances = np.atleast_1d(
            distances
        )

        indices = np.atleast_1d(
            indices
        )

        local_z = rz[
            indices
        ]

        weights = 1.0 / (
            distances + 0.5
        )

        boundary_z = float(
            np.sum(
                weights * local_z
            )
            /
            np.sum(
                weights
            )
        )

        boundary_z = float(
            np.clip(
                boundary_z,
                base + 0.5,
                roof_reference,
            )
        )

        boundary_points.append(
            [
                px,
                py,
                boundary_z,
            ]
        )

    roof_boundary = np.asarray(
        boundary_points,
        dtype=np.float64,
    )

    # ---------------------------------------------------------
    # Vertices
    # ---------------------------------------------------------

    n = len(
        footprint
    )

    bottom_vertices = np.column_stack(
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

    vertices = np.vstack(
        (
            bottom_vertices,
            roof_boundary,
            roof_points,
        )
    )

    roof_offset = 2 * n

    # ---------------------------------------------------------
    # Faces
    # ---------------------------------------------------------

    faces = []

    # ---------------------------------------------------------
    # Walls
    # ---------------------------------------------------------

    for i in range(
        n
    ):

        j = (
            i + 1
        ) % n

        b0 = i
        b1 = j

        r0 = n + i
        r1 = n + j

        faces.append(
            [
                3,
                b0,
                b1,
                r1,
            ]
        )

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
    # ---------------------------------------------------------

    for tri in clean_faces:

        faces.append(
            [
                3,
                roof_offset + tri[0],
                roof_offset + tri[1],
                roof_offset + tri[2],
            ]
        )

    # ---------------------------------------------------------
    # Bottom
    # ---------------------------------------------------------

    for i in range(
        1,
        n - 1
    ):

        faces.append(
            [
                3,
                0,
                i + 1,
                i,
            ]
        )

    if not faces:
        return None, None

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
    # Attributes
    # ---------------------------------------------------------

    mesh["Height"] = np.full(
        mesh.n_points,
        height,
        dtype=np.float32,
    )

    mesh["GroundElevation"] = np.full(
        mesh.n_points,
        base,
        dtype=np.float32,
    )

    mesh["RoofElevation"] = (
        vertices[:, 2].astype(
            np.float32
        )
    )

    return mesh, height

def save_building_points(
    bx,
    by,
    bz,
):
    points = np.column_stack(
        (
            bx,
            by,
            bz,
        )
    )

    cloud = pv.PolyData(
        points
    )

    cloud["Classification"] = np.full(
        len(points),
        6,
        dtype=np.uint8
    )

    cloud.save(
        BUILDING_POINTS
    )


def main():

    print("=" * 70)
    print("NEW ZEALAND MULTI-TILE LiDAR PROCESSING")
    print("=" * 70)

    x, y, z, classification = (
        read_tiles()
    )

    ground = (
        classification == 2
    )

    buildings = (
        classification == 6
    )

    vegetation = (
        classification == 5
    )

    print()
    print("CLASSIFICATION SUMMARY")
    print(
        "Ground:",
        f"{int(ground.sum()):,}"
    )

    print(
        "Buildings:",
        f"{int(buildings.sum()):,}"
    )

    print(
        "Vegetation:",
        f"{int(vegetation.sum()):,}"
    )

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    # -------------------------------------------------
    # Building points
    # -------------------------------------------------

    bx = x[buildings]
    by = y[buildings]
    bz = z[buildings]

    save_building_points(
        bx,
        by,
        bz
    )

    print()
    print(
        "Building points saved:",
        BUILDING_POINTS
    )

    # -------------------------------------------------
    # Local ground estimation
    # -------------------------------------------------

    gx = x[ground]
    gy = y[ground]
    gz = z[ground]

    print()
    print(
        "Building reconstruction"
    )

    ground_tree = cKDTree(
        np.column_stack(
            (
                gx,
                gy
            )
        )
    )

    distances, indices = (
        ground_tree.query(
            np.column_stack(
                (
                    bx,
                    by
                )
            ),
            k=1
        )
    )

    local_ground = gz[
        indices
    ]

    # -------------------------------------------------
    # Current prototype contains multiple
    # buildings across the combined scene.
    #
    # We initially create connected building
    # regions using a 2D spatial clustering radius.
    # -------------------------------------------------

    building_xy = np.column_stack(
        (
            bx,
            by
        )
    )

    building_tree = cKDTree(
        building_xy
    )

    # Connected components with a conservative
    # 3 metre neighborhood.
    pairs = building_tree.query_pairs(
        r=3.0
    )

    parent = np.arange(
        len(bx)
    )

    def find(a):

        while parent[a] != a:

            parent[a] = parent[
                parent[a]
            ]

            a = parent[a]

        return a

    def union(a, b):

        ra = find(a)
        rb = find(b)

        if ra != rb:
            parent[rb] = ra

    for a, b in pairs:
        union(a, b)

    roots = {}

    for i in range(
        len(bx)
    ):

        root = find(i)

        roots.setdefault(
            root,
            []
        ).append(i)

    groups = [
        np.asarray(
            indices_,
            dtype=np.int64
        )
        for indices_ in roots.values()
        if len(indices_) >= 20
    ]

    groups.sort(
        key=len,
        reverse=True
    )

    print(
        "Detected building regions:",
        len(groups)
    )

    building_meshes = []

    for number, ids in enumerate(
        groups,
        start=1
    ):

        mesh, height = (
            create_building_mesh(
                bx[ids],
                by[ids],
                bz[ids],
                local_ground[ids],
            )
        )

        if mesh is None:
            continue

        mesh["BuildingID"] = np.full(
            mesh.n_points,
            number,
            dtype=np.int32
        )

        building_meshes.append(
            mesh
        )

        print(
            f"  NZ-B{number:03d}: "
            f"{len(ids):,} LiDAR points, "
            f"height={height:.2f} m"
        )

    # -------------------------------------------------
    # Combine building meshes
    # -------------------------------------------------

    if building_meshes:

        combined = (
            building_meshes[0]
            .copy()
        )

        for mesh in building_meshes[1:]:

            combined = combined.merge(
                mesh
            )

        combined.save(
            BUILDING_MESH
        )

        print()
        print(
            "Building mesh:",
            BUILDING_MESH
        )

        print(
            "Building mesh points:",
            combined.n_points
        )

        print(
            "Building mesh cells:",
            combined.n_cells
        )

    else:

        raise RuntimeError(
            "No building regions could be reconstructed."
        )

    # -------------------------------------------------
    # Terrain
    # -------------------------------------------------

    print()
    print(
        "Creating multi-tile terrain..."
    )

    terrain = make_grid_mesh(
        gx,
        gy,
        gz,
        resolution=2.0
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
    print(
        "MULTI-TILE LiDAR PROCESSING COMPLETE"
    )
    print("=" * 70)


if __name__ == "__main__":
    main()
