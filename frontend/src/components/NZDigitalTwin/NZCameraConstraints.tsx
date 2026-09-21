import { useEffect } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";

/**
 * Camera constraints for the NZ Digital Twin.
 *
 * Zero new scene objects: every frame this reads the live camera + the default
 * OrbitControls (registered via makeDefault) and clamps the PAN TARGET against
 * the REAL terrain bounds passed in via props. Nothing is allocated inside
 * useFrame; all temporary math goes through a module-level scratch vector.
 *
 * The terrain mesh is a 960 x 1,440 m site translated by -centerX/-centerY at
 * geometry build time, so the world-space footprint is centred on the origin:
 * roughly x ∈ [-480, 480], z ∈ [-720, 720], y ≈ terrain elevations (~70–156 m).
 *
 * Polar angle and zoom distance are handled natively by OrbitControls props
 * (minPolarAngle / maxPolarAngle / minDistance / maxDistance set in
 * NZDigitalTwin). This component backstops the zoom band against programmatic
 * animations landing outside it, and clamps panning — the part OrbitControls
 * cannot do natively in the installed three version.
 *
 * Padded so every existing camera preset and building-focus animation stays a
 * no-op inside the box (preset targets reach y = -25, so padY = 110).
 */

// Module-level scratch — no per-frame allocation.
const _camOffset = new THREE.Vector3();

export interface CameraBounds {
  /** Half-extent of the terrain footprint on X (world units, metres). */
  halfX: number;
  /** Half-extent of the terrain footprint on Z. */
  halfZ: number;
  /** Lowest terrain elevation (world Y). */
  minY: number;
  /** Highest terrain elevation (world Y). */
  maxY: number;
}

/** Pan freedom beyond the terrain footprint (fraction of its half-extent). */
const PAN_MARGIN = 0.15;
/** Vertical pan freedom beyond the elevation range (covers preset targets). */
const PAD_Y = 110;
/** Backstop zoom band — looser than OrbitControls' own min/maxDistance. */
const MIN_DISTANCE = 40;
const MAX_DISTANCE_FACTOR = 3.2;

interface CameraConstraintsProps {
  bounds: CameraBounds | null;
}

export function NZCameraConstraints({ bounds }: CameraConstraintsProps) {
  const { camera, controls } = useThree() as any;

  // Immediate clamp once on mount/bounds-change so a stale target can't persist.
  useEffect(() => {
    if (!controls || !bounds) return;
    const corrected = clampTarget(controls.target, bounds, false);
    if (corrected) controls.update();
  }, [controls, bounds]);

  // ── Pan clamp (the important one) + zoom backstop ─────────────────────────
  useFrame(() => {
    if (!controls || !bounds) return;
    let corrected = clampTarget(controls.target, bounds, true);

    // Zoom backstop: distance measured target → camera. Guards against
    // programmatic animations (building focus, presets) landing outside the
    // band; OrbitControls re-clamps user zoom on its own update.
    _camOffset.copy(camera.position).sub(controls.target);
    const dist = _camOffset.length();
    const maxD = Math.max(bounds.halfX, bounds.halfZ) * MAX_DISTANCE_FACTOR;
    if (dist > maxD) {
      _camOffset.multiplyScalar(maxD / dist);
      camera.position.copy(controls.target).add(_camOffset);
      corrected = true;
    } else if (dist < MIN_DISTANCE && dist > 1e-4) {
      _camOffset.multiplyScalar(MIN_DISTANCE / dist);
      camera.position.copy(controls.target).add(_camOffset);
      corrected = true;
    }

    // Only force an OrbitControls update when we actually corrected something
    // (drei's OrbitControls already runs its own damped update each frame).
    if (corrected) controls.update();
  });

  return null;
}

/**
 * Clamps the orbit target into the walkable site box. Returns true when the
 * target actually moved (so callers can skip redundant controls.update()).
 * `ease` lerps 20% toward the clamped position per frame so panning into the
 * boundary feels like soft resistance, never a hard wall.
 */
function clampTarget(
  target: THREE.Vector3,
  bounds: CameraBounds,
  ease: boolean
): boolean {
  const maxX = bounds.halfX * (1 + PAN_MARGIN);
  const maxZ = bounds.halfZ * (1 + PAN_MARGIN);
  const minY = bounds.minY - PAD_Y;
  const maxY = bounds.maxY + PAD_Y;

  const cx = THREE.MathUtils.clamp(target.x, -maxX, maxX);
  const cy = THREE.MathUtils.clamp(target.y, minY, maxY);
  const cz = THREE.MathUtils.clamp(target.z, -maxZ, maxZ);

  if (cx === target.x && cy === target.y && cz === target.z) return false;

  if (ease) {
    target.x = THREE.MathUtils.lerp(target.x, cx, 0.2);
    target.y = THREE.MathUtils.lerp(target.y, cy, 0.2);
    target.z = THREE.MathUtils.lerp(target.z, cz, 0.2);
  } else {
    target.set(cx, cy, cz);
  }
  return true;
}
