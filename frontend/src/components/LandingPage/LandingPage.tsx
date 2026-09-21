import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './LandingPage.css';
import NZDigitalTwin from '../NZDigitalTwin/NZDigitalTwin';
import Earth from './Earth/Earth';

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
  { label: 'North America', lat:  38,   lon: -100, scale: 1.45 }, // 1
  { label: 'Europe',        lat:  50,   lon:   10, scale: 1.50 }, // 2
  { label: 'Asia',          lat:  35,   lon:  105, scale: 1.45 }, // 3
  { label: 'Africa',        lat:   5,   lon:   20, scale: 1.50 }, // 4
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

const ZOOM_END   = 0.30;  // deep-zoom phase: 0 → 30%
const GLIDE_END  = 0.40;  // Earth layer reaches viewport centre here
const DEEP_ZOOM  = 2.35;  // tuned so New Zealand stays readable, not a black disc

const POINT_STOPS     = [0, 0.25, 0.40, 0.50, 0.60, 0.68, 0.72];
const POINT_OP_KEYS   = [1.0, 1.0, 0.90, 0.60, 0.22, 0.06, 0];
const TERRAIN_STOPS   = [0, 0.30, 0.40, 0.50, 0.60, 0.70, 0.82, 1];
const TERRAIN_OP_KEYS = [0.0, 0.0, 0.10, 0.40, 0.72, 0.90, 1.0, 1];
// UI entrance: interface revealed from the terrain — LAST. Earth must be
// fully gone before the UI completes: points/anchor/layer all zero by ~86%.
const UI_OP_STOPS     = [0.65, 0.75, 0.82, 0.90, 1];
const UI_OP_KEYS      = [0.0, 0.05, 0.25, 0.65, 1.0];
const UI_MOVE_STOPS   = [0.75, 0.85, 0.94, 1.00];
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
  }>({
    q:     STOP_QUATS[0].clone(), // hero quaternion (lat=23.4, lon=0 facing camera)
    scale: 1.0,
    bodyOpacity: 1.0,
    pointOpacity: 1.0,
    anchorOpacity: 1.0,
  });

  // pipelineQuatsRef: the 6 quaternions for the pipeline slerp chain.
  // Index 0 is overwritten at hero-exit with the actual spin quaternion,
  // so there's no jump from hero -> pipeline.
  const pipelineQuatsRef = useRef<THREE.Quaternion[]>(
    STOP_QUATS.map(q => q.clone())
  );

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
        const centerY = window.innerHeight / 2;
        let closestIndex = -1;
        let minDistance = Infinity;
        textRefs.current.forEach((el, index) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const elCenter = rect.top + rect.height / 2;
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

      // ── Earth orientation via quaternion slerp ────────────────────────────
      if (pipeline && !inHero) {
        const yCenter = window.scrollY + window.innerHeight / 2;

        // Collect exact pixel centers of each key scroll location
        const heroCenter = heroRef.current 
          ? heroRef.current.getBoundingClientRect().top + window.scrollY + heroRef.current.offsetHeight / 2 
          : 0;
          
        const stepCenters = textRefs.current.map(el => {
          if (!el) return 0;
          const rect = el.getBoundingClientRect();
          return rect.top + window.scrollY + rect.height / 2;
        });

        let seg = 0;
        let t = 0;
        let inTransition = false;

        // 6 control points (Hero + 5 pipeline stops)
        const points = [heroCenter, ...stepCenters];
        
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
          const zoomT = smoothstep(Math.min(1, transT / ZOOM_END));
          const earthScale = lerp(STOP_SCALES[5], DEEP_ZOOM, zoomT);

          // 2. NZ stays near the visual centre: the Earth layer glides from its
          //    hero composition offset to the viewport centre across 0–40%, so
          //    the zoom converges ON New Zealand instead of past it.
          const glide = 1 - smoothstep(Math.min(1, transT / GLIDE_END));

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

          rotationRef.current.q.copy(STOP_QUATS[5]);
          rotationRef.current.scale = earthScale;
          rotationRef.current.bodyOpacity = bodyOp;
          rotationRef.current.pointOpacity = pointOp;
          rotationRef.current.anchorOpacity = anchorOp;

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
          // Normal pipeline cinematic curve
          // 1. Hold margins
          const HOLD_START = 0.15;
          const HOLD_END = 0.85;
          let rotT = 0;
          
          if (t <= HOLD_START) {
            rotT = 0;
          } else if (t >= HOLD_END) {
            rotT = 1;
          } else {
            rotT = smoothstep((t - HOLD_START) / (HOLD_END - HOLD_START));
          }

          // 2. Cinematic Scale
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

          rotationRef.current.q.slerpQuaternions(
            pipelineQuatsRef.current[seg],
            pipelineQuatsRef.current[seg + 1],
            rotT,
          );
          rotationRef.current.scale = currentScale;
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
      const centerY = window.innerHeight / 2;
      let closestIndex = -1;
      let minDistance = Infinity;
      textRefs.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const dist = Math.abs(elCenter - centerY);
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
      const heroVisible = entry.isIntersecting;

      if (!heroVisible) {
        // Capture the current hero-spin quaternion as the start of the pipeline chain.
        // This means segment 0 (hero → North America) begins exactly where the
        // autonomous spin left off — zero visual discontinuity.
        pipelineQuatsRef.current[0] = rotationRef.current.q.clone();
      }

      setInHero(heroVisible);
    }, { threshold: 0.05 });

    if (heroRef.current) heroObserver.observe(heroRef.current);
    return () => heroObserver.disconnect();
  }, []);


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
        </div>
        <div className="nav-right">
          <div className="status-indicator">
            <span className="green-dot"></span>
            dataset online
          </div>
          <span className="pill">NZ LiDAR</span>
          <span className="pill">EPSG:2193</span>
          <button className="cta-btn orange-btn">Open 3D Map</button>
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
          <div style={reducedMotion ? {} : { position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', zIndex: 0, marginBottom: '-100vh' }}>
            {/* Map Layer (Cinematic Mode Only) — UNDER the Earth so the Digital
                Twin emerges behind the still-visible geographic point cloud */}
            {!reducedMotion && (
              <div 
                ref={mapWrapperRef} 
                style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }}
              >
                <section id="map" className="map-section" style={{ height: '100vh', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
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
            <div
              ref={earthLayerRef}
              style={reducedMotion ? { height: '100vh', position: 'relative' } : { position: 'absolute', inset: 0, pointerEvents: 'none' }}
            >
              <Earth rotationRef={rotationRef} inHero={inHero} reducedMotion={reducedMotion} />
            </div>
          </div>

          {/* 2. HERO */}
          <header className="hero-centered" ref={heroRef} style={{ pointerEvents: 'none', zIndex: 1 }}>
            <div className="hero-content" style={{ pointerEvents: 'auto' }}>
              <div className="eyebrow-line-centered"></div>
              <h1>From LiDAR<br />to <span className="orange-text">3D Reality.</span></h1>
              <p className="hero-description">Visual Mapping is a browser-based geospatial Digital Twin that transforms NZ LiDAR point clouds into interactive 3D terrain, property models, and ML-powered property screening.</p>
              <div className="hero-ctas-centered">
                <button className="cta-btn orange-btn">Open 3D Digital Twin &rarr;</button>
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
                { num: '05', title: 'Cadastre', desc: 'Map official boundaries to 3D volumes', tag: 'Integration' }
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
      <section className="capabilities-section">
        <div className="cap-grid">
          <div className="cap-card">
            <svg className="cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            <h3 className="cap-title">3D Property Identity</h3>
            <p className="cap-body">Unify boundaries, terrain, and built structures into a single addressable volume.</p>
            <span className="cap-tag">Core</span>
          </div>
          <div className="cap-card">
            <svg className="cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <h3 className="cap-title">Explainable ML</h3>
            <p className="cap-body">Transparent machine learning models for detecting dimensional anomalies.</p>
            <span className="cap-tag">Analytics</span>
          </div>
          <div className="cap-card">
            <svg className="cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
            <h3 className="cap-title">Remote Sensing</h3>
            <p className="cap-body">Accurate structural derivation directly from nationwide LiDAR point clouds.</p>
            <span className="cap-tag">Data</span>
          </div>
          <div className="cap-card">
            <svg className="cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <h3 className="cap-title">Spatial Site Analysis</h3>
            <p className="cap-body">Evaluate shading, sightlines, and setbacks in a true 3D context.</p>
            <span className="cap-tag">Tools</span>
          </div>
          <div className="cap-card">
            <svg className="cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <h3 className="cap-title">Human Review Workflow</h3>
            <p className="cap-body">Streamline verification with priority flagging and comparative tools.</p>
            <span className="cap-tag">Workflow</span>
          </div>
          <div className="cap-card">
            <svg className="cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            <h3 className="cap-title">Property Dossier</h3>
            <p className="cap-body">Generate comprehensive structural profiles and contextual site reports.</p>
            <span className="cap-tag">Output</span>
          </div>
        </div>
      </section>

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
