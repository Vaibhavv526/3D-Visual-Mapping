# Agents

## Purpose
Tell the AI how it should behave while working on your codebase.

## Project overview
A geospatial 3D Digital Twin platform that combines LiDAR point-cloud data and Sentinel-2 satellite imagery to generate terrain, building meshes, and extract environmental information (NDVI/RGB). The current primary focus is a New Zealand AOI. It features a FastAPI backend and a React + Three.js interactive 3D frontend.

## Tech stack
- **Backend / Geospatial**: Python, FastAPI, Uvicorn, NumPy, PyVista, VTK, Laspy, Rasterio, Shapely.
- **ML Environment**: PyTorch, OpenCV, scikit-learn, etc. (kept in `ml/requirements.txt`).
- **Frontend**: React, TypeScript, Vite, Three.js, `@react-three/fiber`, `@react-three/drei`, Axios.

## Repository structure
- `backend/app/`: FastAPI backend and API routers.
- `frontend/`: React + Vite frontend source code.
- `pipeline/`: Data processing scripts for Sentinel-2 and LiDAR fusion.
- `data/inputs/` & `data/outputs/`: Geospatial datasets (tracked via Git LFS).
- `ml/`: Machine learning models and isolated ML dependencies.

## Coding conventions
- Prefer incremental implementation over large rewrites. Make the smallest change required for the current task.
- Understand existing data flow and APIs before changing them.
- Standard Python (snake_case) and TypeScript/React (PascalCase for components, camelCase for functions) conventions apply.

## Naming conventions
- Keep API endpoints semantic (e.g., `/api/nz/terrain`, `/api/nz/buildings`).
- Output files follow established formats (e.g., `terrain_layers.vtp`, `building_fused.vtp`).

## Architecture rules
- Backend serves geospatial metadata and 3D data to the frontend.
- Frontend uses Three.js to render data. Focus on optimizing frontend 3D rendering scalability.
- ML dependencies (`ml/requirements.txt`) MUST be kept separate from the main backend requirements (`requirements.txt`).

## Dependency rules
- Do not unnecessarily merge ML dependencies into the main backend requirements.
- Use `npm install` for frontend dependencies and `pip install -r requirements.txt` for backend.

## Security rules
- Exclude virtual environments (`myvenv/`) and massive datasets (`ml/dataset/`) from Git.
- Ensure API routes validate geospatial inputs before processing.

## Testing requirements
- Run relevant syntax, build, and test checks after major changes.
- If a processing algorithm is modified, generate new outputs separately and compare them against the old outputs before replacing the baseline.

## Git rules
- The repository relies heavily on **Git LFS** for large files (`*.laz`, `*.las`, `*.vtp`, `*.tif`, `*.pth`, etc.).
- Do not remove, bypass, or break the existing Git LFS configuration.
- Never commit `myvenv/` or `ml/dataset/` (the ~27GB ML dataset).

## Documentation rules
- Always read `PROJECT_CONTEXT.md` first when starting a new session or encountering architectural questions.
- Preserve working functionality and document any breaking changes to the API endpoints.

## UI rules
- **Top Priority**: Frontend 3D rendering optimization. The full terrain has ~690k triangles. Do not overwhelm the browser memory. Use LOD, frustum loading, progressive loading, or geometry simplification where needed.
- Add user-friendly interactions like building selection, layer toggles, and terrain controls once rendering is stable.

## Backend rules
- Before changing API response formats, inspect the current router implementation and frontend Axios calls.
- Preserve backward compatibility with existing frontend state management wherever possible.

## Database rules
- The project currently uses generated `.vtp` and `.tif` files instead of a traditional relational database for 3D data.
- Database-backed metadata might be introduced later; do not implement it prematurely if it complicates the MVP.

## AI/API rules
- Do not regenerate expensive geospatial datasets unless explicitly required.
- Treat existing processed outputs as the baseline. Do not run processing scripts like `pipeline/process_sentinel2.py` casually.

## Things the agent must not do
- **Do not rebuild the project from scratch.**
- Do not delete existing generated outputs (`data/outputs/nz_lidar/`, `data/outputs/terrain/`, etc.).
- Do not replace the current building mesh generation or terrain generation algorithms without a strong reason.
- Do not commit the `ml/dataset/` directory.

## Definition of done
- The requested feature or bug fix is fully implemented and tested.
- Existing functionality, especially the New Zealand Digital Twin rendering, is preserved.
- The browser does not crash from memory overload when rendering 3D scenes.
- No massive geospatial datasets or virtual environments were accidentally committed to Git.
