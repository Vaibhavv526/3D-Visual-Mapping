import pyvista as pv


MESH = (
    "digital_twin_data/AOI-01_Bilaspur/"
    "processed/terrain_analysis/"
    "bilaspur_digital_twin_mesh.vtp"
)


print("Loading Bilaspur Digital Twin...")

mesh = pv.read(MESH)

print(f"Vertices: {mesh.n_points:,}")
print(f"Triangles: {mesh.n_cells:,}")
print("Layers:", list(mesh.point_data.keys()))


# =========================================================
# PLOTTER
# =========================================================

plotter = pv.Plotter()

plotter.set_background("white")


# =========================================================
# CREATE ALL LAYERS ONCE
# IMPORTANT: NO SCALAR BARS HERE
# =========================================================

rgb_actor = plotter.add_mesh(
    mesh,
    scalars="RGB",
    rgb=True,
    show_edges=False,
    show_scalar_bar=False,
    name="rgb_layer"
)

elevation_actor = plotter.add_mesh(
    mesh,
    scalars="Elevation",
    cmap="terrain",
    show_edges=False,
    show_scalar_bar=False,
    name="elevation_layer"
)

elevation_actor.SetVisibility(False)


slope_actor = plotter.add_mesh(
    mesh,
    scalars="Slope",
    cmap="viridis",
    show_edges=False,
    show_scalar_bar=False,
    name="slope_layer"
)

slope_actor.SetVisibility(False)


ndvi_actor = plotter.add_mesh(
    mesh,
    scalars="NDVI",
    cmap="RdYlGn",
    clim=(-1, 1),
    show_edges=False,
    show_scalar_bar=False,
    name="ndvi_layer"
)

ndvi_actor.SetVisibility(False)


# =========================================================
# LAYER LABEL
# =========================================================

plotter.add_text(
    "RGB",
    position="upper_left",
    font_size=16,
    name="layer_label"
)


# =========================================================
# REMOVE SCALAR BAR SAFELY
# =========================================================

def remove_scalar_bars():

    titles = [
        "Elevation (m)",
        "Slope (degrees)",
        "NDVI"
    ]

    for title in titles:

        try:
            if title in plotter.scalar_bars:
                plotter.remove_scalar_bar(title)

        except (KeyError, RuntimeError):
            pass


# =========================================================
# SHOW ONLY ONE LAYER
# =========================================================

def set_layer(actor_to_show, label):

    # -----------------------------------------------------
    # Hide all layers
    # -----------------------------------------------------

    rgb_actor.SetVisibility(False)
    elevation_actor.SetVisibility(False)
    slope_actor.SetVisibility(False)
    ndvi_actor.SetVisibility(False)

    # -----------------------------------------------------
    # Remove currently visible scalar bar
    # -----------------------------------------------------

    remove_scalar_bars()

    # -----------------------------------------------------
    # Show selected layer
    # -----------------------------------------------------

    actor_to_show.SetVisibility(True)

    # -----------------------------------------------------
    # Update title
    # -----------------------------------------------------

    plotter.remove_actor("layer_label")

    plotter.add_text(
        label,
        position="upper_left",
        font_size=16,
        name="layer_label"
    )

    # -----------------------------------------------------
    # Add scalar bar ONLY for analytical layers
    # -----------------------------------------------------

    if actor_to_show == elevation_actor:

        plotter.add_scalar_bar(
            title="Elevation (m)",
            mapper=elevation_actor.mapper,
            vertical=False
        )

    elif actor_to_show == slope_actor:

        plotter.add_scalar_bar(
            title="Slope (degrees)",
            mapper=slope_actor.mapper,
            vertical=False
        )

    elif actor_to_show == ndvi_actor:

        plotter.add_scalar_bar(
            title="NDVI",
            mapper=ndvi_actor.mapper,
            vertical=False
        )

    # -----------------------------------------------------
    # Refresh
    # -----------------------------------------------------

    plotter.render()


# =========================================================
# KEYBOARD CONTROLS
# =========================================================

def show_rgb():
    set_layer(rgb_actor, "RGB")


def show_elevation():
    set_layer(elevation_actor, "Elevation")


def show_slope():
    set_layer(slope_actor, "Slope (degrees)")


def show_ndvi():
    set_layer(ndvi_actor, "NDVI")


def reset_camera():

    plotter.reset_camera()

    plotter.render()


plotter.add_key_event("1", show_rgb)
plotter.add_key_event("2", show_elevation)
plotter.add_key_event("3", show_slope)
plotter.add_key_event("4", show_ndvi)
plotter.add_key_event("r", reset_camera)


# =========================================================
# UI
# =========================================================

plotter.add_text(
    "1 RGB   |   2 Elevation   |   3 Slope   |   4 NDVI   |   R Reset",
    position="lower_left",
    font_size=11,
    name="controls"
)

plotter.add_axes()


# =========================================================
# START
# =========================================================

print()
print("Controls:")
print("  1 → RGB")
print("  2 → Elevation")
print("  3 → Slope")
print("  4 → NDVI")
print("  R → Reset camera")
print()

plotter.show()