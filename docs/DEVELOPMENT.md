# DEVELOPMENT.md — BhuVista Local Setup Guide

> **Read `PROJECT_CONTEXT.md` first** before making any code changes.
> This file focuses on the mechanics of running the project locally.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Variables](#environment-variables)
4. [Running the Backend](#running-the-backend)
5. [Running the Frontend](#running-the-frontend)
6. [Running Tests](#running-tests)
7. [Linting & Formatting](#linting--formatting)
8. [Building for Production](#building-for-production)
9. [Debugging](#debugging)
10. [Common Errors](#common-errors)

---

## Prerequisites

### Required Software

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Python | **3.14+** | Confirmed in use: `3.14.7` |
| Node.js | **24+** | Confirmed in use: `v24.20.0` |
| npm | **11+** | Confirmed in use: `11.19.0` |
| Git | Any modern | Required for repo operations |
| Git LFS | Any modern | Required for large geospatial files (`.laz`, `.vtp`, `.tif`, etc.) |

### OS Notes

- All commands below are written for **Windows (PowerShell)**.
- Unix equivalents are shown where they differ meaningfully (e.g., `python3` vs `python`, path separators).

---

## Installation

### 1. Clone and Pull LFS Assets

```powershell
git clone <repo-url>
cd 3D-Visual-Mapping

# Install Git LFS and pull the tracked large files
git lfs install
git lfs pull
```

> [!IMPORTANT]
> Without `git lfs pull`, all `.vtp`, `.laz`, `.tif`, and `.npy` files will be
> LFS pointer stubs rather than real data. The backend will fail to serve meshes.

---

### 2. Backend — Virtual Environment

The virtual environment directory used in this project is `.venv` (located at the repo root).
**Never commit `myvenv/` or `.venv/` to Git.**

```powershell
# Create the virtual environment
python -m venv .venv

# Activate it (PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate it (Command Prompt)
.\.venv\Scripts\activate.bat
```

> [!TIP]
> On first run you may need to allow script execution in PowerShell:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

---

### 3. Backend — Install Dependencies

With the virtual environment active:

```powershell
pip install -r requirements.txt
```

**Main backend packages installed:**

| Package | Pinned Version |
|---------|----------------|
| `fastapi` | `0.141.1` |
| `uvicorn` | `0.52.4` |
| `numpy` | `2.5.1` |
| `pyvista` | `0.48.4` |
| `vtk` | `9.6.2` |
| `laspy` | latest |
| `lazrs` | latest |
| `pyproj` | latest |
| `rasterio` | latest |
| `scipy` | latest |
| `shapely` | latest |

> [!NOTE]
> ML dependencies (`PyTorch`, `OpenCV`, `scikit-learn`, etc.) live in
> [`ml/requirements.txt`](file:///c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/ml/requirements.txt)
> and must be installed **separately** in a separate environment.
> Do **not** merge them into the main `requirements.txt`.

---

### 4. Frontend — Install Dependencies

```powershell
cd frontend
npm install
cd ..
```

**Key frontend packages:**

| Package | Role |
|---------|------|
| `react` `react-dom` | UI framework |
| `three` | 3D rendering engine |
| `@react-three/fiber` | React renderer for Three.js |
| `@react-three/drei` | Three.js helpers |
| `axios` | HTTP client for API calls |
| `gsap` | Animation library |
| `jspdf` | PDF report generation |
| `vite` | Build tool / dev server |
| `typescript` | Type checking |
| `eslint` | Linting |

---

## Environment Variables

The project currently has **no required `.env` file** for basic local development.
The backend resolves all data paths relative to `api.py` using Python's `Path(__file__).resolve().parent`.

If you need to override ports or origins, copy and edit the example file when one is created:

```powershell
cp .env.example .env
```

`.env` is already listed in `.gitignore` — never commit it.

> [!NOTE]
> The Vite dev server proxies API requests by convention. If you change the backend
> port from the default `8000`, update the proxy target in
> [`frontend/vite.config.ts`](file:///c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/frontend/vite.config.ts).

---

## Running the Backend

The backend entrypoint is [`api.py`](file:///c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/api.py) at the repo root.

```powershell
# From the repo root, with .venv active
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

- `--reload` enables hot-reload on file changes (development only).
- The server starts at **http://localhost:8000**.
- Interactive API docs are available at **http://localhost:8000/docs**.

### Key API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/nz/metadata` | AOI metadata and dataset statistics |
| `GET /api/nz/terrain` | NZ terrain mesh (VTP, gzip-compressed) |
| `GET /api/nz/buildings` | NZ building meshes (VTP, gzip-compressed) |

> [!WARNING]
> The backend loads and caches large VTP meshes into memory on first request.
> Allow a few seconds for the first `/api/nz/terrain` call to warm the cache.

---

## Running the Frontend

```powershell
cd frontend
npm run dev
```

The Vite dev server starts at **http://localhost:5173** by default with hot module replacement (HMR).

---

## Running Tests

### Backend

There is no dedicated test suite configured yet. To run a quick syntax/import check:

```powershell
# With .venv active
python -c "import api; print('Backend imports OK')"
```

For pipeline scripts, run individual validation scripts from the project root:

```powershell
python pipeline/validate_geospatial_inputs.py
```

> [!IMPORTANT]
> **Do NOT run** `pipeline/process_sentinel2.py` unless explicitly required.
> Sentinel-2 outputs are already processed and stored as the baseline.
> Re-running will overwrite them and is time-consuming.

### Frontend

There are no Jest/Vitest test files configured yet. To check TypeScript types:

```powershell
cd frontend
npx tsc --noEmit
```

---

## Linting & Formatting

### Backend (Python)

No linter is configured in `requirements.txt`. The recommended tools are:

```powershell
# Install dev linters (not in requirements.txt, install manually)
pip install ruff black

# Lint
ruff check .

# Format
black .
```

### Frontend (TypeScript / React)

ESLint is pre-configured via [`frontend/package.json`](file:///c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/frontend/package.json):

```powershell
cd frontend
npm run lint
```

This runs `eslint .` with the `typescript-eslint`, `react-hooks`, and `react-refresh` plugins.

---

## Building for Production

### Frontend

```powershell
cd frontend
npm run build
```

This runs `tsc -b && vite build`. Output goes to `frontend/dist/`.

```powershell
# Preview the production build locally
npm run preview
```

### Backend

The backend is a standard ASGI app served by Uvicorn. For production deployment, the `Procfile` shows the intended command:

```
web: uvicorn api:app --host 0.0.0.0 --port $PORT
```

Remove `--reload` and set `$PORT` to your deployment port (e.g., `8000`).

---

## Debugging

### Backend

**Enable verbose Uvicorn logging:**

```powershell
uvicorn api:app --reload --log-level debug
```

**Log files** (generated during past sessions, kept for reference):

| File | Content |
|------|---------|
| [`backend.log`](file:///c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/backend.log) | Backend stdout |
| [`backend.err.log`](file:///c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/backend.err.log) | Backend stderr |
| [`uvicorn_out.log`](file:///c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/uvicorn_out.log) | Uvicorn stdout |
| [`uvicorn_err.log`](file:///c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/uvicorn_err.log) | Uvicorn stderr |

**Inspect cached NZ mesh data at runtime** by hitting `/docs` and exercising the NZ endpoints with the Swagger UI.

### Frontend

**Browser DevTools:**
- Open DevTools → **Performance** tab to profile Three.js frame times.
- Open **Memory** tab to take heap snapshots and track geometry allocations.
- The repo contains `webgl_profile.js`, `trace_detailed.js`, and `analyze_trace.js` in the root for bespoke profiling — run them with `node <script>.js`.

**Vite HMR issues:**
If HMR stops reflecting changes, restart the dev server (`Ctrl+C`, `npm run dev`).

**Three.js geometry leak debugging:**
Check that `geometry.dispose()` and `material.dispose()` are called when React components unmount. The `NZDigitalTwin` component manages the main mesh lifecycle.

---

## Common Errors

### `git lfs pull` not run / LFS pointer stub files

**Symptom:** Backend throws `pyvista` read errors or returns empty meshes.  
**Fix:** Run `git lfs install && git lfs pull` from the repo root.

---

### `ModuleNotFoundError: No module named 'fastapi'`

**Symptom:** `uvicorn api:app` fails immediately.  
**Fix:** The virtual environment is not active.

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

### `uvicorn: command not found` / `uvicorn is not recognized`

**Fix:** Same as above — activate `.venv` first. Uvicorn is installed inside the virtual environment.

---

### `VTK / PyVista` import errors on Windows

**Symptom:** `ImportError` related to VTK DLLs.  
**Fix:** Ensure you are using the pinned `vtk==9.6.2` and `pyvista==0.48.4`. Mismatched versions break the VTK-PyVista binding.

```powershell
pip install vtk==9.6.2 pyvista==0.48.4
```

---

### `CORS` errors in the browser

**Symptom:** Frontend fetch to `http://localhost:8000` fails with a CORS policy error.  
**Fix:** The backend mounts a `CORSMiddleware`. Ensure the backend is running on port `8000` and the frontend dev server on `5173`. If you changed either port, update the CORS `allow_origins` list in [`api.py`](file:///c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/api.py).

---

### Frontend builds but 3D scene is blank

**Symptom:** Page loads, no terrain/buildings appear.  
**Causes and fixes:**

1. **Backend not running** — start `uvicorn api:app --reload`.
2. **LFS files missing** — run `git lfs pull`.
3. **WebGL not supported** — open DevTools console; look for WebGL context creation errors.
4. **Out-of-memory** — the full terrain is ~691k triangles. On low-RAM machines the browser may silently fail to allocate the buffer. Check DevTools Memory.

---

### `npm run build` TypeScript errors

**Symptom:** `tsc` exits with type errors during `npm run build`.  
**Fix:** Run `npx tsc --noEmit` first to see all type errors, fix them, then rebuild.

---

### `rasterio` or `pyproj` PROJ data errors

**Symptom:** `CRSError` or missing PROJ database on `rasterio` import.  
**Fix:** Reinstall rasterio with its bundled PROJ data:

```powershell
pip install --force-reinstall rasterio
```

If the issue persists, set the `PROJ_DATA` environment variable to the PROJ share directory inside your venv.

---

> [!CAUTION]
> Never delete the generated outputs in `data/outputs/nz_lidar/` or run
> `pipeline/process_sentinel2.py` without understanding the consequences.
> These files are expensive to regenerate and are treated as the project baseline.
