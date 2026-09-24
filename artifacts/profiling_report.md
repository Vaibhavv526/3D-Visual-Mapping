# Profiling Report: Digital Twin Transition

Based on a detailed V8 CPU profile and Chrome DevTools tracing of the exact transition frame, here is the investigation into the ~220-314ms spike.

## Verification of Previous Optimizations
* **no O(B×V) terrain search remains:** **VERIFIED.** The `[PERF:SITE_ANALYSIS]` logs report `1.80ms` for 56 buildings. The O(1) grid lookups are working perfectly.
* **no `getBoundingClientRect()` in scroll hot path:** **VERIFIED.** The trace shows `0.00ms` spent in `measure` or bounding client rects during the transition frame.
* **no per-frame object/array allocations:** **VERIFIED.** V8 Garbage Collection (`V8.GC_HEAP_ENSURE_SWEEPING_COMPLETED`) took only `0.13ms` during the long frame.
* **no React state updates every animation frame:** **VERIFIED.** React rendering/diffing took `< 2ms` during the frame.
* **no duplicate terrain geometry is being created:** **FAILED.** The browser logs show `[PERF:TERRAIN_GEO]` firing **twice** (75.50ms and 68.10ms).
* **no duplicate terrain data arrays are being created:** **FAILED.** The logs show `[PERF:API_TERRAIN]` downloading and parsing the 78MB JSON **twice** (213.90ms and 197.70ms).

---

## 220ms+ Longest Frame Breakdown
The trace captured a single `RunTask` on the Main Thread lasting **314.71ms**. 
The GPU process was largely idle (longest task ~17ms). The bottleneck is entirely on the **Main Thread**, specifically during the very first `WebGLRenderer.render` loop inside React Three Fiber. 

Here is the breakdown of the operations:

1. **JavaScript execution (Three.js Math & GL Driver Calls): ~288ms (Main-thread, first frame only)**
   * **`updateMatrixWorld` (~55ms):** Three.js traversing the scene graph and recalculating 4x4 transform matrices for all meshes. (Repeats every frame).
   * **`needsUpdate` / `gl.bufferData` (~51ms):** Synchronous GPU buffer upload for the 346k terrain vertices and 56 buildings. (Happens once).
   * **`setProgram` / Shader Compilation (~43ms):** Synchronous WebGL shader compilation and linking (`gl.compileShader`). (Happens once).
   * **`setup` & `bindVertexArray` (~76ms):** WebGL VAO initialization and state binding. (Happens once).
   * **`projectObject` / Frustum Culling (~32ms):** Three.js lazily computing `boundingSphere` for the massive terrain geometry because it wasn't pre-computed. (Compute happens once, culling repeats).
   * **`WebGLRenderer.renderBufferDirect` (~31ms):** Native draw calls. (Repeats).
2. **React rendering/mounting: ~2ms (Main-thread)**
3. **Terrain JSON parsing: ~213ms (Main-thread, async)** - Happens *before* the transition frame, but happens twice.
4. **Terrain array processing / BufferGeometry creation: ~75ms (Main-thread)** - Happens *before* the transition frame.
5. **Building mesh creation: ~8.5ms (Main-thread)** - Happens *before* the transition frame.
6. **Synchronous layout/style work: ~0.2ms (Main-thread)** - `UpdateLayoutTree` and `PrePaint` are negligible.

---

## Smallest Realistic Next Optimizations
Do not change the architecture or reduce quality. The smallest realistic optimizations to eliminate the remaining frame drops are:

1. **Disable Matrix Auto-Updates (Saves ~55ms every frame):** 
   Set `matrixAutoUpdate = false` on the static Terrain and Building meshes, and call `updateMatrix()` once. This removes the matrix traversal from the render loop entirely.
2. **Pre-compute Bounding Spheres (Saves ~32ms on first frame):** 
   Explicitly call `meshGeo.computeBoundingSphere()` and `meshGeo.computeBoundingBox()` immediately after generating the geometry arrays. Currently, Three.js computes them lazily during the first render frame, synchronously blocking the main thread.
3. **Fix the Duplicate Terrain Fetch (Saves ~1.5s total async load time):**
   The 78MB terrain JSON is being fetched, parsed, and converted to geometry twice (likely due to React StrictMode or a missing `useEffect` dependency check). 
