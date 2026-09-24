import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './LandingPage.css';
import NZDigitalTwin from '../NZDigitalTwin/NZDigitalTwin';
import Earth from './Earth/Earth';
import Capabilities from './Capabilities/Capabilities';

// ─────────────────────────────────────────────────────────────────────────────
// Geographic Earth stops — quaternion approach
//
// SINGLE SOURCE OF TRUTH: Earth.tsx generatePointCloud (lines 339-345):
//   nx = cos(lat) * cos(lon)   ← x
//   ny = sin(lat)               ← y  (north pole = +Y)
//   nz = cos(lat) * sin(lon)   ← z
//
// Camera at [0, 0, 5] looks at origin → camera SEES the +Z face.
//
// For a geographic point at (lat, lon) to face the camera:
//   Q = setFromUnitVectors(geoVector, +Z_hat)
//   group.quaternion = Q   → the lat/lon point aligns with +Z.
//
// Verified (scratch/verify-quat-geo.mjs): all five targets yield z=1.000000.
// No manual angle offsets needed.  No Euler order issues.  No longitude wrapping.
// ─────────────────────────────────────────────────────────────────────────────

const DEG2RAD = Math.PI / 180;

/**
 * Convert geographic (lat, lon) to the unit-sphere Vector3 used by Earth.tsx.
 * THIS IS THE SINGLE SOURCE OF TRUTH — identical formula to Earth.tsx lines 339-345.
 */
function geoToVector3(lat: number, lon: number): THREE.Vector3 {
  const latR = lat * DEG2RAD;
  const lonR = lon * DEG2RAD;
  return new THREE.Vector3(
    Math.cos(latR) * Math.cos(lonR),  // x  (nx in Earth.tsx)
    Math.sin(latR),                    // y  (ny = north pole axis)
    Math.cos(latR) * Math.sin(lonR),   // z  (nz in Earth.tsx)
  );
}

// Camera-facing direction — the Earth's +Z local-space face points at the camera.
const _Z_HAT = new THREE.Vector3(0, 0, 1);

/**
 * Compute the quaternion that orientates the Earth so that geographic
 * coordinate (lat, lon) faces the camera.
 *
 * Mathematically: Q = setFromUnitVectors(v, +Z_hat)
 * which means Q · v = +Z_hat → the point is at the front of the sphere.
 */
function geoToQuaternion(lat: number, lon: number): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(geoToVector3(lat, lon), _Z_HAT);
}

interface EarthStop {
  label: string;
  lat: number;
  lon: number;
  // scale: camera clip level.
  // At scale 1.0 globe fits inside fov.  At 1.45+ edges begin to clip.
  scale: number;
}

// Camera fov=40° → half-angle 20°.  Earth radius ≈ 1.45.
// angular_radius = atan(1.45 * scale / 5).  Clips when > 20° = atan(0.364).
// scale 1.00 → 16.2° (full globe)
// scale 1.45 → 22.2° (modest clip, continent fills frame nicely)
// scale 1.50 → 23.5° (slightly more clip)
// scale 1.70 → 26.2° (NZ: generous zoom, island clearly visible)
const EARTH_STOPS: EarthStop[] = [
  { label: 'Hero',          lat:  23.4, lon:    0, scale: 1.00 }, // 0
  // Pipeline targets are land-biased (labels unchanged): each dwell frame shows
  // continent interior, and the great-circle legs exit/enter along coasts and
  // archipelagos instead of long open-ocean frames (which read as a black
  // coastline-only sphere mid-travel).
  { label: 'North America', lat:  43,   lon: -78, scale: 1.45 }, // 1  NE US / Great Lakes
  { label: 'Europe',        lat:  49,   lon:  16, scale: 1.50 }, // 2  Central Europe
  { label: 'Asia',          lat:  28,   lon: 112, scale: 1.45 }, // 3  S China / SE Asia — Indonesia fills the Asia→NZ leg
  { label: 'Africa',        lat:  12,   lon:  22, scale: 1.50 }, // 4  Sahara/Sahel — Arabia+India edge the Africa→NZ leg
  { label: 'New Zealand',   lat: -41,   lon:  174, scale: 1.70 }, // 5
];

// Precompute quaternions at module load — never recomputed during scroll.
const STOP_QUATS: THREE.Quaternion[] = EARTH_STOPS.map(s => geoToQuaternion(s.lat, s.lon));
const STOP_SCALES: number[] = EARTH_STOPS.map(s => s.scale);

/** Smooth ease-in-out (Ken Perlin's smoothstep). */
function smoothstep(t: number): number {
  const tc = Math.max(0, Math.min(1, t));
  return tc * tc * (3 - 2 * tc);
}

/** Linear interpolation. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ─────────────────────────────────────────────────────────────────────────────
// NZ → Digital Twin transition — "point cloud → terrain → interface"
//
// Three independently scroll-scrubbed tracks (pure functions of transT —
// reverse scroll is automatically symmetrical; nothing animates on its own):
//
//   Body:    1.00 → 1.00 → 0.55 → 0.15 → 0                     (dead by 32%)
//   Points:  1.00 → 1.00 → 1.00 → 0.90 → 0.65 → 0.25 → 0       (bridge)
//   Terrain: 0.00 → 0.03 → 0.12 → 0.30 → 0.55 → 0.80 → 0.95 → 1 (arrives EARLY)
//   UI:      0 → 0.03 → 0.12 → 0.55 → 0.85 → 1                 (LAST, 60–100%)
//
// Pacing rule: never a dead interval — body gone by 32%, terrain clearly
// reading by 40% and dominant by 65%, points bridge the handoff at full
// brightness through 35–50%, the Wellington anchor carries continuity to 90%,
// and the UI is strictly last.
// ─────────────────────────────────────────────────────────────────────────────

const ZOOM_START = 0.15;  // give NZ framing time to settle before deep zoom
const ZOOM_END   = 0.45;  // deep-zoom phase: 15% → 45%
const GLIDE_START = 0.05;
const GLIDE_END  = 0.40;  // Earth layer reaches viewport centre here
const DEEP_ZOOM  = 2.35;  // tuned so New Zealand stays readable, not a black disc

// Over-extrapolate the Spatial Intelligence shader to darken the rest of the globe
// and make NZ points dominant.
const SPATIAL_STOPS   = [0, 0.15, 0.30, 0.45];
const SPATIAL_KEYS    = [1.0, 1.3, 1.6, 1.6];

const POINT_STOPS     = [0, 0.25, 0.40, 0.50, 0.60, 0.68, 0.72];
const POINT_OP_KEYS   = [1.0, 1.0, 0.90, 0.60, 0.22, 0.06, 0];
const TERRAIN_STOPS   = [0, 0.30, 0.40, 0.50, 0.60, 0.70, 0.82, 1];
const TERRAIN_OP_KEYS = [0.0, 0.0, 0.10, 0.40, 0.72, 0.90, 1.0, 1];
// UI entrance: interface revealed from the terrain — LAST. Earth must be
// fully gone before the UI completes.
// Pushed later to give terrain a short visual settling moment before UI dominates.
const UI_OP_STOPS     = [0.75, 0.82, 0.90, 0.96, 1];
const UI_OP_KEYS      = [0.0, 0.0, 0.25, 0.75, 1.0];
const UI_MOVE_STOPS   = [0.82, 0.90, 0.96, 1.00];
const UI_MOVE_KEYS    = [1.0, 0.5, 0.12, 0.0]; // 1 = full offset: 24px / 0.975

// Body: fast clean fade — dead by 38%, well before terrain dominance.
const BODY_STOPS     = [0, 0.15, 0.25, 0.32, 0.38];
const BODY_OP_KEYS   = [1.0, 1.0, 0.55, 0.15, 0.0];

// Signature detail: the Wellington anchor carries geographic continuity across
// the overlap — the last geographic reference before the terrain takes over
// (gone by 86%, strictly before the Digital Twin UI completes).
const ANCHOR_STOPS   = [0, 0.65, 0.72, 0.80, 0.86];
const ANCHOR_OP_KEYS = [1.0, 1.0, 0.65, 0.20, 0.0];

// Hard guarantee for "zero Earth pixels": the whole Earth layer (canvas incl.
// any residual point/anchor pixels) fades to 0 by 86% — in lockstep with the
// anchor, before the UI layer finishes its entrance. Symmetric on reverse.
const EARTH_LAYER_STOPS = [0, 0.80, 0.86, 1];
const EARTH_LAYER_KEYS  = [1.0, 1.0, 0.0, 0.0];

/** Piecewise smoothstep interpolation over a track's own stop grid. */
function sampleStops(stops: number[], keys: number[], t: number): number {
  if (t <= stops[0]) return keys[0];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i]) {
      const local = (t - stops[i - 1]) / (stops[i] - stops[i - 1]);
      return lerp(keys[i - 1], keys[i], smoothstep(local));
    }
  }
  return keys[keys.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// LandingPage component
// ─────────────────────────────────────────────────────────────────────────────

const LandingPage: React.FC = () => {
  // rotationRef: { q, scale } — the single mutable source of truth for Earth orientation.
  // Earth.tsx useFrame reads this every frame.  Scroll handler writes to it — no setState.
  const rotationRef = useRef<{
    q: THREE.Quaternion;
    scale: number;
    bodyOpacity?: number;
    pointOpacity?: number;
    anchorOpacity?: number;
    reconstructProgress?: number;
    volumeProgress?: number;
    spatialProgress?: number;
  }>({
    q:     STOP_QUATS[0].clone(), // hero quaternion (lat=23.4, lon=0 facing camera)
    scale: 1.0,
    bodyOpacity: 1.0,
    pointOpacity: 1.0,
    anchorOpacity: 1.0,
    reconstructProgress: 0.0,
    volumeProgress: 0.0,
    spatialProgress: 0.0,
  });

  // pipelineQuatsRef: the 6 quaternions for the pipeline slerp chain.
  // Index 0 is overwritten at hero-exit with the actual spin quaternion, and
  // the scroll handler blends from that captured orientation into the track
  // across a scroll-anchored handoff window — the hero → pipeline handoff is
  // continuous in BOTH scroll directions (no snap, no freeze, no timers).
  const pipelineQuatsRef = useRef<THREE.Quaternion[]>(
    STOP_QUATS.map(q => q.clone())
  );

  const cachedMetrics = useRef({ heroCenter: 0, stepCenters: [0, 0, 0, 0, 0] });

  // Update cached metrics on mount and resize
  useEffect(() => {
    const updateMetrics = () => {
      const hero = heroRef.current;
      cachedMetrics.current.heroCenter = hero 
        ? hero.getBoundingClientRect().top + window.scrollY + hero.offsetHeight / 2 
        : 0;
      
      cachedMetrics.current.stepCenters = textRefs.current.map(el => {
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        return rect.top + window.scrollY + rect.height / 2;
      });
    };
    
    updateMetrics();
    window.addEventListener('resize', updateMetrics);
    return () => window.removeEventListener('resize', updateMetrics);
  }, []);

  // Scroll position where the hero handed control over. Anchor for the
  // scroll-driven handoff blend (0 = no handoff window yet).
  const handoffScrollRef = useRef(0);
  // Scratch quaternion for the handoff blend (no per-scroll allocations).
  const handoffTargetQ = useRef(new THREE.Quaternion());

  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // currentStep — UI state only (text highlighting). Does NOT drive Earth rotation.
  const [currentStep, setCurrentStep] = useState(0);
  const [inHero, setInHero] = useState(true);

  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const heroRef = useRef<HTMLElement>(null);
  const pipelineRef = useRef<HTMLElement>(null);
  const transitionRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  // Earth layer div — carries the --earth-center-glide CSS var consumed by
  // .earth-canvas-wrapper to glide NZ to the viewport centre during transition.
  const earthLayerRef = useRef<HTMLDivElement>(null);

  // ── Scroll handler ────────────────────────────────────────────────────────
  useEffect(() => {
    if (reducedMotion) {
      const handleScrollReduced = () => {
        const centerY = window.scrollY + window.innerHeight / 2;
        let closestIndex = -1;
        
      let minDistance = Infinity;
      cachedMetrics.current.stepCenters.forEach((elCenter, index) => {
        if (elCenter === 0) return;
        const dist = Math.abs(elCenter - centerY);
        if (dist < minDistance) { minDistance = dist; closestIndex = index; }
      });

        if (closestIndex !== -1 && minDistance < window.innerHeight) {
          setCurrentStep(closestIndex);
        }
      };
      window.addEventListener('scroll', handleScrollReduced, { passive: true });
      return () => window.removeEventListener('scroll', handleScrollReduced);
    }

    const handleScroll = () => {
      const pipeline = pipelineRef.current;

      // ── Earth track: scale = pure function of scroll ──────────────────────
      // Runs in BOTH hero and pipeline modes.  The scale track must stay
      // deterministic from scroll position in either direction — otherwise
      // reversing into the hero leaves the last pipeline scale stuck on the
      // ref (Earth.tsx useFrame only reads it).  In hero mode the quaternion
      // is owned by the autonomous spin, so only the scale is written here.
      if (pipeline) {
        const yCenter = window.scrollY + window.innerHeight / 2;

        // Collect exact pixel centers of each key scroll location
        const heroCenter = cachedMetrics.current.heroCenter;
          
        const stepCenters = cachedMetrics.current.stepCenters;

        let seg = 0;
        let t = 0;
        let inTransition = false;

        // 6 control points (Hero + 5 pipeline stops)
        const points = [heroCenter, stepCenters[0], stepCenters[1], stepCenters[2], stepCenters[3], stepCenters[4]];
        
        // Define transition zone relative to the last pipeline step
        const transStart = points[5];
        const transHeight = 2.0 * window.innerHeight; // 200vh

        if (yCenter <= points[0]) {
          seg = 0;
          t = 0;
        } else if (transitionRef.current && yCenter > transStart) {
          inTransition = true;
          // In transition zone — pure function of transT, so reverse scroll is
          // automatically continuous (no dark gap in either direction).
          const transT = Math.max(0, Math.min(1, (yCenter - transStart) / transHeight));

          // 1. Deep zoom 0–30%, then hold. 2.35 keeps NZ legible (2.6 turned the
          //    frame into a black sphere face before the twin arrived).
          const zoomLocal = Math.max(0, Math.min(1, (transT - ZOOM_START) / (ZOOM_END - ZOOM_START)));
          const zoomT = smoothstep(zoomLocal);
          const earthScale = lerp(STOP_SCALES[5], DEEP_ZOOM, zoomT);

          // 2. NZ stays near the visual centre: the Earth layer glides from its
          //    hero composition offset to the viewport centre across 0–40%, so
          //    the zoom converges ON New Zealand instead of past it.
          const glideLocal = Math.max(0, Math.min(1, (transT - GLIDE_START) / (GLIDE_END - GLIDE_START)));
          const glide = 1 - smoothstep(glideLocal);

          // 3. "Point cloud → terrain → interface" — the point cloud is the hero
          //    while the body fades fast and clean; terrain is "born" UNDER it;
          //    the NZ anchor dot outlives every other Earth element; the UI
          //    layer (map header + twin chrome, via --nz-ui-op) rises in LAST.
          const bodyOp    = sampleStops(BODY_STOPS, BODY_OP_KEYS, transT);
          const pointOp   = sampleStops(POINT_STOPS, POINT_OP_KEYS, transT);
          const terrainOp = sampleStops(TERRAIN_STOPS, TERRAIN_OP_KEYS, transT);
          const uiOp      = sampleStops(UI_OP_STOPS, UI_OP_KEYS, transT);
          const anchorOp  = sampleStops(ANCHOR_STOPS, ANCHOR_OP_KEYS, transT);
          const uiMove    = sampleStops(UI_MOVE_STOPS, UI_MOVE_KEYS, transT); // 1→0: 24px/.975 → 0/1
          const earthLayerOp = sampleStops(EARTH_LAYER_STOPS, EARTH_LAYER_KEYS, transT);

          // 4. Effects: displacement and spatial intelligence resolve back to normal as
          //    the transition resolves into the real twin.
          const geomEffectOp = 1 - smoothstep(Math.min(1, transT / 0.60));
          const spatialOp = sampleStops(SPATIAL_STOPS, SPATIAL_KEYS, transT);

          rotationRef.current.q.copy(STOP_QUATS[5]);
          rotationRef.current.scale = earthScale;
          rotationRef.current.bodyOpacity = bodyOp;
          rotationRef.current.pointOpacity = pointOp;
          rotationRef.current.anchorOpacity = anchorOp;
          rotationRef.current.reconstructProgress = geomEffectOp;
          rotationRef.current.volumeProgress = geomEffectOp;
          rotationRef.current.spatialProgress = spatialOp;

          if (earthLayerRef.current) {
            earthLayerRef.current.style.setProperty('--earth-center-glide', glide.toFixed(3));
            earthLayerRef.current.style.opacity = earthLayerOp.toFixed(3);
            earthLayerRef.current.style.visibility = earthLayerOp <= 0.001 ? 'hidden' : 'visible';
          }

          if (mapWrapperRef.current) {
            // TERRAIN layer: fades on the terrain curve + a subtle "birth"
            // (scale 1.025 → 1, +12px → 0, finished by ~75%) so the twin feels
            // like it resolves out of the point cloud — never like a webpage
            // loading, and never visibly scaled once terrain is dominant.
            const terrainBirth = 1 - smoothstep(Math.max(0, Math.min(1, (transT - 0.35) / 0.40)));
            mapWrapperRef.current.style.opacity = terrainOp.toFixed(3);
            mapWrapperRef.current.style.visibility = terrainOp <= 0.001 ? 'hidden' : 'visible';
            mapWrapperRef.current.style.transform =
              `translateY(${(12 * terrainBirth).toFixed(2)}px) scale(${(1 + 0.025 * terrainBirth).toFixed(4)})`;
            // Interactive only once the UI layer is sufficiently visible.
            mapWrapperRef.current.style.pointerEvents = uiOp > 0.5 ? 'auto' : 'none';
            // UI layer: map header + twin chrome read these vars — see CSS.
            mapWrapperRef.current.style.setProperty('--nz-ui-op', uiOp.toFixed(3));
            mapWrapperRef.current.style.setProperty('--nz-ui-move', uiMove.toFixed(4));
          }
        } else {
          for (let i = 0; i < 5; i++) {
            if (yCenter >= points[i] && yCenter <= points[i + 1]) {
              seg = i;
              t = (yCenter - points[i]) / (points[i + 1] - points[i]);
              break;
            }
          }
        }

        if (!inTransition) {
          // Overlapping pacing model: Geographic travel and dataset transformation overlap,
          // so the Earth moves AND becomes more structured simultaneously,
          // preventing "dead" moments where it just sits waiting.
          let travelStart = 0.15;
          let travelEnd = 0.70;
          let transformStart = 0.30;
          let transformEnd = 0.85;

          if (seg === 4) {
            // Step 05: Emphasize NZ convergence
            travelStart = 0.10;
            travelEnd = 0.65;
            transformStart = 0.25;
            transformEnd = 0.90;
          }

          // 1. Geographic Travel
          let rotT = 0;
          if (t <= travelStart) {
            rotT = 0;
          } else if (t >= travelEnd) {
            rotT = 1;
          } else {
            rotT = smoothstep((t - travelStart) / (travelEnd - travelStart));
          }

          // 2. Visual Transformation
          let visT = 0;
          if (t <= transformStart) {
            visT = 0;
          } else if (t >= transformEnd) {
            visT = 1;
          } else {
            visT = smoothstep((t - transformStart) / (transformEnd - transformStart));
          }

          // 3. Cinematic Scale
          const scaleA = STOP_SCALES[seg];
          const scaleB = STOP_SCALES[seg + 1];
          const PULL_BACK = Math.min(1.15, scaleA, scaleB);
          let currentScale = 1.0;

          if (rotT === 0) {
            currentScale = scaleA;
          } else if (rotT === 1) {
            currentScale = scaleB;
          } else {
            if (rotT < 0.3) {
              const st = smoothstep(rotT / 0.3);
              currentScale = lerp(scaleA, PULL_BACK, st);
            } else if (rotT > 0.7) {
              const st = smoothstep((rotT - 0.7) / 0.3);
              currentScale = lerp(PULL_BACK, scaleB, st);
            } else {
              currentScale = PULL_BACK;
            }
          }

          // Scale is written unconditionally — the SAME track forward and
          // reverse, so transT back at 0 restores the exact hero scale.
          rotationRef.current.scale = currentScale;

          // 4. Visual transformation pipeline variables
          let recP = 0;
          let volP = 0;
          let spatialP = 0;

          if (seg < 2) {
            recP = 0;
          } else if (seg === 2) {
            recP = visT;
          } else {
            recP = 1;
            if (seg === 3) {
              volP = visT;
            } else {
              volP = 1;
              if (seg === 4) {
                spatialP = visT;
              } else {
                spatialP = 1;
              }
            }
          }

          rotationRef.current.reconstructProgress = recP;
          rotationRef.current.volumeProgress = volP;
          rotationRef.current.spatialProgress = spatialP;

          if (!inHero) {
            // Hero mode: orientation belongs to the autonomous spin and
            // opacity/layer state is already at hero defaults.  Pipeline
            // mode: drive the quaternion chain + reset transition layers.
            rotationRef.current.q.slerpQuaternions(
              pipelineQuatsRef.current[seg],
              pipelineQuatsRef.current[seg + 1],
              rotT,
            );

            // ── Hero → pipeline rotation handoff ──────────────────────
            // The hero hands over mid-hold (the IO fires at 5% hero
            // visibility, already inside the Step-01 hold where the track
            // renders q[1] exactly), so a raw pipeline frame would SNAP
            // from the live spun orientation to the Step-01 target.
            // Instead, across a short window anchored at the handoff
            // scroll position, blend captured-spin → current track value.
            // The endpoint equals the untouched track, so Steps 01–05 math
            // is unchanged; inputs are scroll-only, so forward and reverse
            // are identical (no timers, no rAF loops).
            if (handoffScrollRef.current > 0) {
              const HANDOFF_LEN = 0.2 * window.innerHeight;
              const handoffT = Math.max(0, Math.min(1,
                (window.scrollY - handoffScrollRef.current) / HANDOFF_LEN));
              if (handoffT < 1) {
                handoffTargetQ.current.copy(rotationRef.current.q);
                rotationRef.current.q.slerpQuaternions(
                  pipelineQuatsRef.current[0],
                  handoffTargetQ.current,
                  smoothstep(handoffT),
                );
              }
            }
          }

          // ── Opacity + layer state: deterministic from scroll position ──
          // Written in EVERY mode (hero included). In hero/pipeline these are
          // exact no-ops (full opacity, hero glide, hidden map). Hoisting them
          // out of the !inHero gate closes a real leak: a scroll event that
          // runs BEFORE the IntersectionObserver delivers the hero→false flip
          // (direct jumps, refresh with restored scroll, very fast scrolling)
          // used to skip restoration and leave the transition's zeroed
          // opacities + hidden earth layer stuck — the "blank Earth" state.
          // Only the quaternion remains hero-owned (autonomous spin).
          rotationRef.current.bodyOpacity = 1.0;
          rotationRef.current.pointOpacity = 1.0;
          rotationRef.current.anchorOpacity = 1.0;

          // Restore hero composition offsets + hidden map (also covers reverse
          // scroll out of the transition zone back into the pipeline).
          if (earthLayerRef.current) {
            earthLayerRef.current.style.setProperty('--earth-center-glide', '1');
            earthLayerRef.current.style.opacity = '1';
            earthLayerRef.current.style.visibility = 'visible';
          }
          if (mapWrapperRef.current) {
            mapWrapperRef.current.style.opacity = '0';
            mapWrapperRef.current.style.visibility = 'hidden';
            mapWrapperRef.current.style.transform = 'translateY(0px) scale(1)';
            mapWrapperRef.current.style.pointerEvents = 'none';
            mapWrapperRef.current.style.setProperty('--nz-ui-op', '1');
            mapWrapperRef.current.style.setProperty('--nz-ui-move', '0');
          }
        }
      }

      // ── UI: which step text is active ─────────────────────────────────────
            let closestIndex = -1;
      let minDistance = Infinity;
      cachedMetrics.current.stepCenters.forEach((elCenter, index) => {
        if (elCenter === 0) return;
        const dist = Math.abs(elCenter - (window.scrollY + window.innerHeight / 2));
        if (dist < minDistance) { minDistance = dist; closestIndex = index; }
      });
      if (closestIndex !== -1 && minDistance < window.innerHeight) {
        setCurrentStep(closestIndex);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initialise on mount / inHero change
    return () => window.removeEventListener('scroll', handleScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inHero, reducedMotion]);

  // ── Hero IntersectionObserver ─────────────────────────────────────────────
  useEffect(() => {
    const heroObserver = new IntersectionObserver(([entry]) => {
      const heroVisible = entry.isIntersecting;      if (!heroVisible) {
        // Capture the live hero-spin quaternion + anchor the scroll-driven
        // handoff at this exact scroll position. The scroll handler blends
        // from the captured orientation into the pipeline track across the
        // first ~30% of segment 0, so the handoff is continuous in BOTH
        // directions and deterministic from scroll position (no timers).
        pipelineQuatsRef.current[0] = rotationRef.current.q.clone();
        handoffScrollRef.current = heroRef.current
          ? heroRef.current.offsetTop + heroRef.current.offsetHeight * 0.95 // mirrors the IO threshold
          : 0;
      }

      setInHero(heroVisible);
    }, { threshold: 0.05 });

    if (heroRef.current) heroObserver.observe(heroRef.current);
    return () => heroObserver.disconnect();
  }, []);


  const scrollToMap = (e: React.MouseEvent) => {
    e.preventDefault();
    if (reducedMotion) {
      document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      if (transitionRef.current) {
        const rect = transitionRef.current.getBoundingClientRect();
        const absoluteBottom = rect.bottom + window.scrollY;
        window.scrollTo({
          top: absoluteBottom - window.innerHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  const scrollToCapabilities = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* 1. Fixed NAV */}
      <nav className="fixed-nav">
        <div className="nav-left">
          <div className="logo-mark">
            <svg viewBox="0 0 100 100" className="logo-svg">
              <path d="M50 10 L90 30 L50 50 L10 30 Z" fill="#e8650a" />
              <path d="M10 30 L50 50 L50 90 L10 70 Z" fill="#c05206" />
              <path d="M90 30 L50 50 L50 90 L90 70 Z" fill="#ff7f24" />
            </svg>
          </div>
          <span className="logo-text">Visual Mapping</span>
          <span className="subline">Geospatial Digital Twin</span>
          <a href="#capabilities" className="nav-link" onClick={scrollToCapabilities}>Capabilities</a>
        </div>
        <div className="nav-right">
          <div className="status-indicator">
            <span className="green-dot"></span>
            dataset online
          </div>
          <span className="pill">NZ LiDAR</span>
          <span className="pill">EPSG:2193</span>
          <button className="cta-btn orange-btn" onClick={scrollToMap}>Open 3D Map</button>
        </div>
      </nav>
      
      <div className="progress-bar-container">
      </div>

        <div className="hero-and-pipeline-wrapper" style={{ position: 'relative' }}>
          {/*
            Sticky Background Container
            - Earth is always visible
            - Map is faded in during cinematic transition
          */}
          <div style={reducedMotion ? {} : { position: 'sticky', top: 0, minHeight: '100vh', overflow: 'hidden', zIndex: 0 }}>
            {/* Map Layer (Cinematic Mode Only) — UNDER the Earth so the Digital
                Twin emerges behind the still-visible geographic point cloud */}
            {!reducedMotion && (
              <div 
                ref={mapWrapperRef} 
                style={{ position: 'relative', opacity: 0, pointerEvents: 'none' }}
              >
                <section id="map" className="map-section" style={{ minHeight: '100vh', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  <div className="map-header nz-ui-reveal">
                    <div className="map-header-left">
                      <span className="pill map-pill">3D digital twin</span>
                      <h2>The map is the interface.</h2>
                    </div>
                    <button className="ghost-btn">Open full map &rarr;</button>
                  </div>
                  <div id="map-container">
                    <NZDigitalTwin />
                  </div>
                </section>
              </div>
            )}

            {/* Earth Layer — ABOVE the map: body dissolves first, point cloud
                remains visible on top while terrain appears underneath */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <div
                ref={earthLayerRef}
                style={reducedMotion ? { height: '100vh', position: 'relative' } : { position: 'sticky', top: 0, height: '100vh', pointerEvents: 'none' }}
              >
                <Earth rotationRef={rotationRef} inHero={inHero} reducedMotion={reducedMotion} />
              </div>
            </div>
          </div>

          {/* 2. HERO */}
          <header className="hero-centered" ref={heroRef} style={{ pointerEvents: 'none', zIndex: 1, marginTop: reducedMotion ? undefined : '-100vh' }}>
            <div className="hero-content" style={{ pointerEvents: 'auto' }}>
              <div className="eyebrow-line-centered"></div>
              <h1>From LiDAR<br />to <span className="orange-text">3D Reality.</span></h1>
              <p className="hero-description">Visual Mapping is a browser-based geospatial Digital Twin that transforms NZ LiDAR point clouds into interactive 3D terrain, property models, and ML-powered property screening.</p>
              <div className="hero-ctas-centered">
                <button className="cta-btn orange-btn" onClick={scrollToMap}>Open 3D Digital Twin &rarr;</button>
                <a href="#pipeline" className="ghost-link">View pipeline &darr;</a>
              </div>
            </div>

            {/* Minimal edge scroll cue — clear of the globe focal area */}
            <div className="scroll-cue" aria-hidden="true">
              <span className="scroll-cue-label">Scroll</span>
              <span className="scroll-cue-line" />
              <svg className="scroll-cue-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>

            {/* Floating Stats Pill */}
            <div className="hero-stats-pill-container" style={{ pointerEvents: 'auto' }}>
              <div className="hero-stats-pill">
                <div className="pill-stat">
                  <span className="stat-val">6.5M</span>
                  <span className="stat-label">LiDAR points processed</span>
                </div>
                <div className="pill-divider"></div>
                <div className="pill-stat">
                  <span className="stat-val">87K</span>
                  <span className="stat-label">Terrain vertices</span>
                </div>
                <div className="pill-divider"></div>
                <div className="pill-stat">
                  <span className="stat-val">248</span>
                  <span className="stat-label">Buildings</span>
                </div>
                <div className="pill-divider"></div>
                <div className="pill-stat orange-val">
                  <span className="stat-val">6</span>
                  <span className="stat-label">Priority reviews</span>
                </div>
                <div className="pill-divider"></div>
                <div className="pill-stat">
                  <span className="stat-val">714</span>
                  <span className="stat-label">Vertical units</span>
                </div>
              </div>
            </div>
          </header>

          {/* 4. PREMIUM SCROLL PIPELINE */}
          <section
            className="pipeline-premium"
            id="pipeline"
            ref={pipelineRef}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <div className="pipeline-premium-container">
            
            <div className="pipeline-text-col">
              {[ 
                { num: '01', title: 'LiDAR', desc: 'Raw geospatial scan data', tag: 'Ingestion' },
                { num: '02', title: 'Point Cloud Processing', desc: 'Clean and classify spatial points', tag: 'Processing' },
                { num: '03', title: '3D Reconstruction', desc: 'Generate terrain and building geometry', tag: 'Extraction' },
                { num: '04', title: 'Volumetric Representation', desc: 'Voxelize and encode properties', tag: 'Modeling' },
                { num: '05', title: 'Spatial Intelligence', desc: 'Connect terrain, structures and property data', tag: 'Integration' }
              ].map((step, i) => (
                <div 
                  key={i} 
                  className={`step-text-block ${currentStep === i ? 'active' : ''}`}
                  ref={el => { textRefs.current[i] = el; }}
                >
                  <div className="step-counter">{step.num}</div>
                  <h2>{step.title}</h2>
                  <p>{step.desc}</p>
                  <div className="tags"><span className="tag">{step.tag}</span></div>
                </div>
              ))}
            </div>

            </div>
          </section>

          {/* 5.5 NZ TRANSITION ZONE (Cinematic Mode Only) */}
          {!reducedMotion && (
            <div ref={transitionRef} style={{ height: '200vh', pointerEvents: 'none' }}></div>
          )}

        </div>

        {/* 6. MAP SECTION (Fallback for Reduced Motion) */}
        {reducedMotion && (
          <section id="map" className="map-section">
            <div className="map-header">
              <div className="map-header-left">
                <span className="pill map-pill">3D digital twin</span>
                <h2>The map is the interface.</h2>
              </div>
              <button className="ghost-btn">Open full map &rarr;</button>
            </div>
            <div id="map-container">
              <NZDigitalTwin />
            </div>
          </section>
        )}
      
{/* 5. CAPABILITIES */}
      <Capabilities />

      {/* 7. FOOTER STRIP */}
      <footer className="footer">
        <div className="footer-left">
          &copy; 2025 Visual Mapping &middot; NZ LiDAR &middot; EPSG:2193 &middot; LINZ Layer 50772 &middot; Sentinel-2
        </div>
        <div className="footer-right">
          LiDAR-derived estimates &middot; not official cadastral data
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
