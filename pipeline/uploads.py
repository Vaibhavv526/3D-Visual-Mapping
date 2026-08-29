from pathlib import Path
import shutil

BASE_DIR = Path(__file__).resolve().parents[1]

SATELLITE_DIR = BASE_DIR / "data" / "inputs" / "satellite"
LIDAR_DIR = BASE_DIR / "data" / "inputs" / "lidar"

SATELLITE_DIR.mkdir(parents=True, exist_ok=True)
LIDAR_DIR.mkdir(parents=True, exist_ok=True)


SATELLITE_EXTENSIONS = {
    ".tif",
    ".tiff",
    ".jp2",
}

LIDAR_EXTENSIONS = {
    ".las",
    ".laz",
}


def save_uploaded_file(
    source,
    filename: str,
    destination: Path,
):
    extension = Path(filename).suffix.lower()

    if destination == SATELLITE_DIR:
        allowed = SATELLITE_EXTENSIONS
    else:
        allowed = LIDAR_EXTENSIONS

    if extension not in allowed:
        raise ValueError(
            f"Unsupported file type: {extension}"
        )

    output = destination / Path(filename).name

    with open(source, "rb") as src:
        with open(output, "wb") as dst:
            shutil.copyfileobj(src, dst)

    return output
