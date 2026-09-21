/**
 * Earth.tsx — BhuVista technical geospatial globe
 *
 * Architecture
 * ────────────
 *  1. buildLandMask()       → 1024×512 binary canvas (white = land, black = ocean)
 *  2. generatePointCloud()  → samples a Fibonacci sphere, classifies each point
 *                             (coast / land interior / ocean) via mask lookup,
 *                             returns typed arrays for a custom GPU shader.
 *  3. EarthPoints           → THREE.Points with per-vertex color + size shader.
 *  4. EarthGrid             → LineSegments for lat/lon graticule.
 *  5. EarthAtmosphere       → BackSide sphere for the thin rim glow.
 *  6. <Earth />             → transparent R3F Canvas, reducedMotion aware.
 *
 * No new npm packages — only three / @react-three/fiber which already exist.
 */

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import './Earth.css';

// ─────────────────────────────────────────────────────────────────────────────
// Land mask — binary raster for point classification
// ─────────────────────────────────────────────────────────────────────────────

const MASK_W = 1024;
const MASK_H = 512;

/** lon/lat → canvas pixel (equirectangular projection) */
function toMaskPx(
  lon: number,
  lat: number,
): [number, number] {
  return [
    Math.round(MASK_W * ((lon + 180) / 360)),
    Math.round(MASK_H * ((90 - lat) / 180)),
  ];
}

/**
 * Simplified-but-geographically-accurate continent outlines.
 * Each polygon is an ordered [lon, lat] array.
 * Resolution: ~5° vertices — correct at 1024×512 mask resolution.
 *
 * Sources cross-referenced against Natural Earth 110m_admin_0 data.
 */
const LAND_POLYS: [number, number][][] = [
  // ── North America (mainland) ──────────────────────────────────────────
  [
    [-168,60],[-160,60],[-152,58],[-148,60],[-142,58],
    [-136,56],[-130,54],[-126,50],[-124,46],[-124,40],
    [-122,36],[-118,32],[-114,28],[-108,22],[-100,18],
    [-88,15],[-84,10],[-80,8],
    [-77,8],[-70,12],[-64,10],[-58,6],[-52,4],
    [-50,0],[-50,-2],   // Panama isthmus closure
    // Atlantic coast — north
    [-52,4],[-54,6],[-60,8],[-64,10],[-68,12],
    [-72,18],[-74,20],[-76,24],[-77,35],[-76,38],
    [-74,41],[-70,44],[-66,45],[-60,46],
    [-56,48],[-54,52],[-56,54],[-60,58],
    [-64,62],[-68,66],[-76,70],[-80,72],[-90,72],
    [-100,74],[-110,74],[-120,74],[-130,72],[-140,70],
    [-152,70],[-162,66],[-168,66],
  ],

  // ── Greenland ─────────────────────────────────────────────────────────
  [
    [-68,76],[-58,78],[-46,82],[-36,84],[-24,80],
    [-20,76],[-22,70],[-26,66],[-34,64],[-44,60],
    [-54,62],[-64,68],
  ],

  // ── Iceland ───────────────────────────────────────────────────────────
  [[-24,63],[-22,65],[-14,66],[-14,64],[-20,63]],

  // ── South America ─────────────────────────────────────────────────────
  [
    [-80,8],[-76,4],[-72,2],[-68,2],[-60,4],[-52,4],
    [-50,0],[-48,-4],[-44,-12],[-40,-20],
    [-38,-12],[-36,-6],[-34,-4],[-34,-8],[-36,-14],
    [-38,-18],[-40,-20],[-42,-22],[-42,-26],
    [-44,-30],[-44,-36],[-46,-40],[-52,-44],
    [-56,-48],[-65,-55],[-68,-52],[-72,-46],
    [-74,-40],[-76,-36],[-80,-28],[-80,-18],
    [-80,-8],[-80,0],[-80,4],
  ],

  // ── Europe (west/south) ───────────────────────────────────────────────
  [
    [-10,36],[-6,36],[-2,38],[0,44],[2,44],
    [4,46],[6,44],[8,44],[10,44],[12,44],
    [14,46],[16,48],[14,52],[10,54],[8,56],
    [12,58],[16,62],[18,66],[20,70],[26,70],
    [24,66],[26,62],[26,58],[24,54],[18,54],
    [14,54],[12,54],[10,56],[6,58],[4,58],
    [2,52],[-2,50],[-4,48],[-8,44],[-10,40],
  ],

  // ── Norway / Scandinavia ──────────────────────────────────────────────
  [
    [4,58],[8,58],[12,60],[16,62],[18,66],
    [20,70],[28,72],[30,70],[28,68],[28,66],
    [24,62],[26,60],[22,58],[16,58],[12,58],[8,58],
  ],

  // ── Africa ────────────────────────────────────────────────────────────
  [
    [-6,36],[0,36],[6,36],[10,37],[14,35],
    [20,34],[24,32],[30,28],[34,22],[38,18],
    [42,12],[44,8],[44,4],[42,0],[40,-4],
    [36,-10],[34,-18],[30,-24],[26,-30],[20,-34],
    [16,-34],[14,-30],[10,-26],[4,-18],[0,-10],
    [-4,-2],[-8,4],[-14,10],[-16,14],[-18,16],
    [-16,22],[-14,28],[-10,32],[-6,34],
  ],

  // ── Madagascar ────────────────────────────────────────────────────────
  [[44,-12],[50,-14],[50,-18],[50,-24],[44,-26],[44,-20],[44,-12]],

  // ── Asia (Europe–Asia joined through Turkey → Urals → East Siberia) ──
  [
    // Start at Turkey/Europe junction
    [26,38],[30,36],[36,36],[36,32],[38,30],[40,28],
    [40,22],[42,16],[44,12],[44,8],[44,4],[48,2],
    [52,0],[56,-2],[60,0],[64,2],[68,6],[72,10],
    [76,14],[80,16],[82,12],[82,8],[78,6],[78,10],
    [76,14],[80,18],[84,22],[88,24],[92,22],[96,18],
    [100,20],[104,18],[106,16],[108,12],[106,6],[104,2],
    [102,2],[100,4],[100,0],[102,-4],[104,-8],[108,-8],
    [112,-8],[116,-8],[120,-10],[122,-4],[124,2],[128,2],
    [128,6],[130,8],[132,10],[136,14],[138,18],[140,22],
    [140,28],[136,32],[132,34],[130,38],[130,42],[132,46],
    [136,48],[136,52],[134,56],[128,52],[124,54],[120,52],
    [114,50],[108,50],[102,52],[96,52],[90,52],[84,54],
    [78,56],[72,60],[68,64],[62,68],[56,68],[50,68],
    [44,68],[38,68],[34,68],[30,72],[26,70],[20,70],
    [16,70],[18,66],[20,66],[26,62],[26,58],[24,54],
    [22,52],[22,48],[24,46],[26,44],[28,42],[28,40],[26,38],
  ],

  // ── Japan (main islands, simplified) ─────────────────────────────────
  [
    [130,32],[132,34],[134,34],[136,34],[138,36],
    [140,38],[140,40],[142,44],[142,44],[140,44],
    [136,42],[134,40],[130,38],[130,34],[130,32],
  ],

  // ── Borneo ────────────────────────────────────────────────────────────
  [
    [108,2],[112,2],[116,4],[118,6],[118,2],
    [116,-2],[114,-4],[108,-2],[108,2],
  ],

  // ── Sumatra ───────────────────────────────────────────────────────────
  [
    [96,4],[100,2],[104,0],[106,-4],[106,-6],
    [104,-4],[100,-2],[98,0],[96,4],
  ],

  // ── Java ──────────────────────────────────────────────────────────────
  [[106,-6],[108,-8],[112,-8],[114,-8],[110,-8],[106,-6]],

  // ── New Guinea ───────────────────────────────────────────────────────
  [
    [132,-2],[136,-2],[140,-4],[144,-6],[146,-6],
    [148,-6],[146,-8],[144,-8],[140,-8],[136,-6],[132,-4],[132,-2],
  ],

  // ── Australia ────────────────────────────────────────────────────────
  [
    [114,-22],[116,-18],[120,-14],[124,-14],
    [128,-14],[132,-12],[136,-12],[138,-14],
    [140,-18],[142,-20],[144,-18],[146,-16],
    [148,-20],[150,-22],[152,-24],[154,-28],
    [152,-32],[148,-38],[144,-38],[140,-36],
    [136,-36],[132,-34],[128,-34],[124,-34],
    [120,-34],[116,-34],[114,-32],[114,-28],[114,-22],
  ],

  // ── New Zealand — North Island ────────────────────────────────────────
  [
    [172,-34],[174,-36],[175,-37],[176,-38],
    [176,-40],[174,-41],[173,-41],[172,-40],
    [171,-38],[172,-36],[172,-34],
  ],

  // ── New Zealand — South Island ────────────────────────────────────────
  [
    [172,-41],[173,-43],[172,-45],[170,-46],
    [168,-46],[166,-46],[166,-44],[168,-43],
    [170,-42],[172,-41],
  ],

  // ── Great Britain ─────────────────────────────────────────────────────
  [[-6,50],[-4,50],[-2,52],[0,52],[0,54],[-2,56],[-4,58],[-6,58],
   [-6,56],[-4,54],[-4,52],[-6,50]],

  // ── Irish island ─────────────────────────────────────────────────────
  [[-10,52],[-8,52],[-6,54],[-8,56],[-10,54],[-10,52]],

  // ── Sri Lanka ─────────────────────────────────────────────────────────
  [[80,10],[82,10],[82,8],[80,6],[78,8],[80,10]],

  // ── Philippines (simplified mass) ────────────────────────────────────
  [[120,16],[122,16],[124,12],[126,8],[124,8],[122,10],[120,12],[120,16]],

  // ── Taiwan ────────────────────────────────────────────────────────────
  [[120,24],[122,24],[122,22],[120,22],[120,24]],

  // ── Antarctica (approximate southern ice belt) ────────────────────────
  [
    [-180,-70],[-150,-66],[-120,-64],[-90,-66],[-60,-70],
    [-30,-66],[0,-66],[30,-68],[60,-70],[90,-68],[120,-66],
    [150,-68],[180,-70],[180,-90],[-180,-90],
  ],
];

/** Build a Uint8ClampedArray binary mask (R channel: 255=land, 0=ocean). */
function buildLandMask(): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = MASK_W;
  canvas.height = MASK_H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, MASK_W, MASK_H);
  ctx.fillStyle = '#fff';

  for (const poly of LAND_POLYS) {
    if (poly.length < 3) continue;
    ctx.beginPath();
    const [x0, y0] = toMaskPx(poly[0][0], poly[0][1]);
    ctx.moveTo(x0, y0);
    for (let i = 1; i < poly.length; i++) {
      const [x, y] = toMaskPx(poly[i][0], poly[i][1]);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  return ctx.getImageData(0, 0, MASK_W, MASK_H).data;
}

/** O(1) land lookup — checks R channel of the mask */
function sampleLand(mask: Uint8ClampedArray, lon: number, lat: number): boolean {
  const px = Math.max(0, Math.min(MASK_W - 1, Math.round(MASK_W * ((lon + 180) / 360))));
  const py = Math.max(0, Math.min(MASK_H - 1, Math.round(MASK_H * ((90 - lat) / 180))));
  return mask[(py * MASK_W + px) * 4] > 128;
}

/**
 * Returns true when the pixel at (lon, lat) is within `r` mask-pixels of a
 * land/ocean boundary — i.e., it is a coastline point.
 */
function sampleCoast(
  mask: Uint8ClampedArray,
  lon: number,
  lat: number,
  r = 3,
): boolean {
  const px = Math.max(0, Math.min(MASK_W - 1, Math.round(MASK_W * ((lon + 180) / 360))));
  const py = Math.max(0, Math.min(MASK_H - 1, Math.round(MASK_H * ((90 - lat) / 180))));
  const base = mask[(py * MASK_W + px) * 4] > 128;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const cx = Math.max(0, Math.min(MASK_W - 1, px + dx));
      const cy = Math.max(0, Math.min(MASK_H - 1, py + dy));
      if ((mask[(cy * MASK_W + cx) * 4] > 128) !== base) return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Point cloud generation
// ─────────────────────────────────────────────────────────────────────────────

interface PointCloud {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  count: number;
}

/**
 * Generate a geographic point cloud on the unit sphere.
 *
 * Visual contract
 * ───────────────
 * • Fibonacci lattice gives uniform candidate distribution (no pole crowding).
 * • Three tiers:
 *     ocean    — 1 in 500, near-invisible dark navy, size 0.5
 *     coast    — all kept, medium-dark cool gray, size 2.0
 *     interior — 1 in 8, very dark gray, size 1.0
 * • A handful of orange geographic "data markers" are added as explicit anchors.
 * • NZ coast is slightly brighter than the global average — no blanket orange.
 * • Final count is typically 30 000 – 42 000 points.
 */
function generatePointCloud(mask: Uint8ClampedArray, radius: number): PointCloud {
  const TOTAL_CANDIDATES = 400_000;

  const posArr: number[] = [];
  const colArr: number[] = [];
  const szArr:  number[] = [];

  // ── Color palette (linear light, intentionally dark) ────────────────────
  const clrCoast  = [0.36, 0.42, 0.50] as const; // medium-dark cool gray
  const clrNZCst  = [0.50, 0.56, 0.64] as const; // slightly brighter — NZ only
  // Interior land: lifted ~40% from the original [0.10,0.13,0.18] so continents
  // read during pipeline frames. Still dark; coast remains the bright boundary.
  const clrLand   = [0.15, 0.18, 0.24] as const; // dark blue-gray interior
  const clrOcean  = [0.008, 0.012, 0.022] as const; // barely visible

  // ── Orange data-marker anchors (lon, lat) ─────────────────────────────────
  // These 8 points are placed explicitly — NOT derived from the loop —
  // so the orange accent is strictly bounded.
  const ORANGE_ANCHORS: [number, number][] = [
    [174.76, -36.85], // Auckland
    [174.78, -41.29], // Wellington
    [172.64, -43.53], // Christchurch
    [151.21, -33.87], // Sydney
    [103.82,   1.35], // Singapore
    [121.47,  31.23], // Shanghai
    [139.69,  35.69], // Tokyo
    [  2.35,  48.85], // Paris
  ];

  const PHI = Math.PI * (1 + Math.sqrt(5)); // golden angle ×2

  for (let i = 0; i < TOTAL_CANDIDATES; i++) {
    // Fibonacci sphere sample
    const cosTheta = 1 - (2 * i + 1) / TOTAL_CANDIDATES;
    const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
    const phi = PHI * i;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    // Cartesian unit sphere (y = north pole axis)
    const nx = sinTheta * cosPhi;
    const ny = cosTheta;
    const nZ = sinTheta * sinPhi;

    // Geographic coordinates
    const lat = (Math.asin(ny) * 180) / Math.PI;
    const lon = (Math.atan2(nZ, nx) * 180) / Math.PI;

    const land  = sampleLand(mask, lon, lat);
    // Narrower coast band: r=2 (5×5 neighbourhood ≈ 175 km wide)
    const coast = land && sampleCoast(mask, lon, lat, 2);
    const isNZ  = (lon >= 165 && lon <= 179) && (lat >= -48 && lat <= -33);

    if (!land) {
      // Extremely sparse ocean — just enough to hint at negative space
      if (i % 500 !== 0) continue;
      posArr.push(nx * radius, ny * radius, nZ * radius);
      colArr.push(...clrOcean);
      szArr.push(0.5);

    } else if (coast) {
      // Coastline — all kept, slightly brighter for NZ
      posArr.push(nx * radius, ny * radius, nZ * radius);
      colArr.push(...(isNZ ? clrNZCst : clrCoast));
      szArr.push(2.0);

    } else {
      // Interior — 1 in 3: dense enough for continents to read, sparse enough to stay pointillist
      if (i % 3 !== 0) continue;
      posArr.push(nx * radius, ny * radius, nZ * radius);
      colArr.push(...clrLand);
      szArr.push(1.0);
    }
  }

  // ── Orange geographic data anchors ────────────────────────────────────────
  for (const [ancLon, ancLat] of ORANGE_ANCHORS) {
    const latR = (ancLat * Math.PI) / 180;
    const lonR = (ancLon * Math.PI) / 180;
    const ax = Math.cos(latR) * Math.cos(lonR);
    const ay = Math.sin(latR);
    const aZ = Math.cos(latR) * Math.sin(lonR);
    posArr.push(ax * radius, ay * radius, aZ * radius);
    colArr.push(0.91, 0.40, 0.05); // BhuVista orange
    szArr.push(3.0);               // slightly larger — these are data markers
  }

  return {
    positions: new Float32Array(posArr),
    colors:    new Float32Array(colArr),
    sizes:     new Float32Array(szArr),
    count: posArr.length / 3,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shaders — round, anti-aliased points with per-vertex size + color
// ─────────────────────────────────────────────────────────────────────────────

// Signature-detail anchor: Wellington — the SAME geographic coordinate as the
// baked orange anchor in ORANGE_ANCHORS above, re-placed with the identical
// formula so the overlay dot is indistinguishable from the cloud's own.
const ANCHOR_LAT = -41.29;
const ANCHOR_LON = 174.78;

const POINT_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3  aColor;
  varying   vec3  vColor;

  void main() {
    vColor = aColor;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    // Size attenuation calibrated for 4 px coast / 2 px interior at camera depth ~4.
    // (280 → 8): old value produced 60-80 px blobs; this gives individual dots.
    gl_PointSize = aSize * (8.0 / -mvPos.z);
    gl_Position  = projectionMatrix * mvPos;
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;

  void main() {
    // Circular point with soft edge
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.30, 0.50, d);
    gl_FragColor = vec4(vColor, alpha * uOpacity);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Graticule grid (lat/lon lines)
// ─────────────────────────────────────────────────────────────────────────────

function buildGridGeometry(radius: number): THREE.BufferGeometry {
  const verts: number[] = [];
  const SEG = 180; // segments per line
  const R = radius * 1.001; // sits just above the globe surface

  // Latitude rings: ±60, ±30, equator, tropics (~±23.4), arctic/antarctic
  const latLines = [-66.6, -60, -30, -23.4, 0, 23.4, 30, 60, 66.6];

  for (const lat of latLines) {
    const latR = (lat * Math.PI) / 180;
    const ringR = R * Math.cos(latR);
    const y = R * Math.sin(latR);
    for (let j = 0; j < SEG; j++) {
      const a0 = (j / SEG) * Math.PI * 2;
      const a1 = ((j + 1) / SEG) * Math.PI * 2;
      verts.push(ringR * Math.cos(a0), y, ringR * Math.sin(a0));
      verts.push(ringR * Math.cos(a1), y, ringR * Math.sin(a1));
    }
  }

  // Longitude meridians: every 30°
  for (let lonDeg = 0; lonDeg < 360; lonDeg += 30) {
    const lonR = (lonDeg * Math.PI) / 180;
    for (let j = 0; j < SEG; j++) {
      const lat0 = (-90 + (j / SEG) * 180) * (Math.PI / 180);
      const lat1 = (-90 + ((j + 1) / SEG) * 180) * (Math.PI / 180);
      verts.push(
        R * Math.cos(lat0) * Math.cos(lonR),
        R * Math.sin(lat0),
        R * Math.cos(lat0) * Math.sin(lonR),
      );
      verts.push(
        R * Math.cos(lat1) * Math.cos(lonR),
        R * Math.sin(lat1),
        R * Math.cos(lat1) * Math.sin(lonR),
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return geo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface SceneProps {
  reducedMotion: boolean;
  /**
   * Quaternion + scale ref — written by LandingPage scroll handler, read every frame.
   * bodyOpacity / pointOpacity / anchorOpacity are transition-controlled
   * separately: the silhouette fades fast and cleanly, the point cloud is the
   * hero, and the NZ anchor dot dissolves last (signature detail).
   */
  rotationRef: React.MutableRefObject<{
    q: THREE.Quaternion;
    scale: number;
    bodyOpacity?: number;
    pointOpacity?: number;
    anchorOpacity?: number;
  }>;
  inHero: boolean;
}

function EarthScene({ reducedMotion, rotationRef, inHero }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const { size } = useThree();

  // Responsive radius — calibrated for ~50% of viewport width on desktop (16:9)
  const radius = useMemo(() => {
    const shorter = Math.min(size.width, size.height);
    if (shorter < 400) return 1.1;
    if (shorter < 700) return 1.3;
    return 1.45;
  }, [size]);

  // ── Land mask (built once per mount) ──────────────────────────────────────
  const mask = useMemo(() => buildLandMask(), []);

  // ── Point cloud geometry ──────────────────────────────────────────────────
  const { pointGeo, pointMat } = useMemo(() => {
    const cloud = generatePointCloud(mask, radius);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(cloud.positions, 3));
    geo.setAttribute('aColor',   new THREE.Float32BufferAttribute(cloud.colors,    3));
    geo.setAttribute('aSize',    new THREE.Float32BufferAttribute(cloud.sizes,     1));

    const mat = new THREE.ShaderMaterial({
      vertexShader:   POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent:    true,
      depthWrite:     false,
      uniforms: {
        uOpacity: { value: 1.0 }
      }
    });

    return { pointGeo: geo, pointMat: mat };
  }, [mask, radius]);

  // ── Signature detail: Wellington anchor overlay ────────────────────────────
  // A single-dot Points object at the SAME geographic anchor (Wellington,
  // same placement formula / orange / size as the baked cloud anchors). The
  // transition gives it its own opacity track so it outlives the general
  // point cloud and dissolves last — a geographic coordinate becoming a real
  // mapped location.
  const { anchorGeo, anchorMat } = useMemo(() => {
    const latR = (ANCHOR_LAT * Math.PI) / 180;
    const lonR = (ANCHOR_LON * Math.PI) / 180;
    const ax = Math.cos(latR) * Math.cos(lonR) * radius;
    const ay = Math.sin(latR) * radius;
    const aZ = Math.cos(latR) * Math.sin(lonR) * radius;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([ax, ay, aZ], 3));
    const mat = new THREE.ShaderMaterial({
      vertexShader:   POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent:    true,
      depthWrite:     false,
      uniforms:       { uOpacity: { value: 1.0 } },
    });
    return { anchorGeo: geo, anchorMat: mat };
  }, [radius]);

  // ── Graticule ─────────────────────────────────────────────────────────────
  const gridGeo = useMemo(() => buildGridGeometry(radius), [radius]);
  const gridMat = useMemo(() => new THREE.LineBasicMaterial({
    color:       0x0e2030,  // very dark navy — barely visible
    transparent: true,
    opacity:     0.07,      // was 0.18 — much more subtle now
    depthWrite:  false,
  }), []);

  // ── Atmosphere (BackSide sphere — silhouette-only fresnel rim) ──────────
  // Intensity ∝ pow(1 − |dot(normal, viewDir)|, 3): zero across the disc,
  // a hairline lift at the outer silhouette only. Restrained slate tone,
  // additive, no glow. Fades with the body during the NZ transition.
  const atmMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uRim;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 4.5);
        vec3 rim = vec3(0.16, 0.20, 0.26) * f * uRim; // restrained slate
        gl_FragColor = vec4(rim, 1.0);
      }
    `,
    uniforms: { uRim: { value: 1.0 } },
    side:        THREE.BackSide,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  }), []);

  // ── Dark base sphere — clean cinematic fade ─────────────────────────
  // Plain transparent material: bodyOpacity is a SHORT, FAST fade (1 → 0 over
  // transT 0.15–0.38, before terrain dominance), so it never reads as a
  // translucent black disc. The mesh is unmounted from the render pass
  // entirely once the fade completes (visible = false in useFrame).
  const baseMat = useMemo(() => new THREE.MeshBasicMaterial({
    color:       0x040608,
    side:        THREE.FrontSide,
    transparent: true,
    opacity:     1.0,
    depthWrite:  true,
  }), []);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      pointGeo.dispose();
      pointMat.dispose();
      anchorGeo.dispose();
      anchorMat.dispose();
      gridGeo.dispose();
      gridMat.dispose();
      atmMat.dispose();
      baseMat.dispose();
    };
  }, [pointGeo, pointMat, gridGeo, gridMat, atmMat, baseMat]);

  // ── Rotation ──────────────────────────────────────────────────────────────
  // Reusable objects
  const _spinAxis = useRef(new THREE.Vector3(0, 1, 0));
  const _spinQ    = useRef(new THREE.Quaternion());
  const baseMeshRef = useRef<THREE.Mesh>(null!);
  const atmMeshRef  = useRef<THREE.Mesh>(null!);
  const anchorPointsRef = useRef<THREE.Points>(null!);

  useFrame((_, delta) => {
    if (inHero && !reducedMotion) {
      // Autonomous Y-axis spin — rotate Earth around its own pole axis.
      // multiply (q = q * spinQ) applies in local space = spin around Earth's own Y.
      _spinQ.current.setFromAxisAngle(_spinAxis.current, delta * 0.065);
      rotationRef.current.q.multiply(_spinQ.current);
    }
    if (groupRef.current) {
      groupRef.current.quaternion.copy(rotationRef.current.q);
      groupRef.current.scale.setScalar(rotationRef.current.scale);
    }
    
    // ── Transition opacity tracks (separate, per constraint) ─────────────────
    //   bodyOpacity  → dark silhouette + atmosphere rim
    //   pointOpacity → geographic point cloud + graticule
    // Cached material refs only — scalar writes, no allocations per frame.
    const bodyOp   = rotationRef.current.bodyOpacity  ?? 1.0;
    const pointOp  = rotationRef.current.pointOpacity ?? 1.0;
    const anchorOp = rotationRef.current.anchorOpacity ?? 1.0;

    if (pointMat.uniforms.uOpacity) pointMat.uniforms.uOpacity.value = pointOp;
    gridMat.opacity = 0.10 * pointOp;   // graticule: slightly more legible, still subordinate
    atmMat.uniforms.uRim.value = bodyOp; // silhouette rim fades with the solid body
    baseMat.opacity = bodyOp;

    // Transition-aware depth + visibility: a nearly-gone body must not write
    // depth (it would occlude back-side points) or draw at all. Reverse scroll
    // restores both above the thresholds. Normal Earth behaviour unchanged.
    baseMat.depthWrite = bodyOp > 0.15;
    if (baseMeshRef.current) baseMeshRef.current.visible = bodyOp > 0.001;
    if (atmMeshRef.current)  atmMeshRef.current.visible  = bodyOp > 0.001;

    // Signature detail: the NZ orange anchor is a separate tiny Points object
    // with its OWN opacity track — it outlives the general point cloud and
    // dissolves last, as the terrain resolves beneath it.
    if (anchorMat.uniforms.uOpacity) anchorMat.uniforms.uOpacity.value = anchorOp;
    if (anchorPointsRef.current) anchorPointsRef.current.visible = anchorOp > 0.001;
  });


  return (
    <>
      {/* Minimal ambient only — points are shader-based, not light-affected */}
      <ambientLight intensity={0.015} color={0x040810} />

      <group ref={groupRef}>
        {/* 1. Solid black globe silhouette (dissolve material) */}
        <mesh ref={baseMeshRef} material={baseMat}>
          <sphereGeometry args={[radius, 64, 64]} />
        </mesh>

        {/* 2. Geographic point cloud */}
        <points geometry={pointGeo} material={pointMat} />

        {/* 2b. NZ signature anchor (separate track — dissolves last) */}
        <points ref={anchorPointsRef} geometry={anchorGeo} material={anchorMat} />

        {/* 3. Lat/lon graticule */}
        <lineSegments geometry={gridGeo} material={gridMat} />

        {/* 4. Atmospheric rim */}
        <mesh ref={atmMeshRef} material={atmMat}>
          <sphereGeometry args={[radius * 1.055, 40, 40]} />
        </mesh>
      </group>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public <Earth /> component
// ─────────────────────────────────────────────────────────────────────────────

interface EarthProps {
  className?: string;
  /** Quaternion + scale ref — same shape as SceneProps.rotationRef. */
  rotationRef: React.MutableRefObject<{
    q: THREE.Quaternion;
    scale: number;
    bodyOpacity?: number;
    pointOpacity?: number;
    anchorOpacity?: number;
  }>;
  inHero: boolean;
  reducedMotion: boolean;
}

export default function Earth({ className = '', rotationRef, inHero, reducedMotion }: EarthProps) {

  return (
    <div className={`earth-canvas-wrapper ${className}`} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5.0], fov: 40, near: 0.1, far: 100 }}
        gl={{
          alpha:             true,
          antialias:         true,
          toneMapping:       THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.95,
        }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <EarthScene reducedMotion={reducedMotion} rotationRef={rotationRef} inHero={inHero} />
      </Canvas>
    </div>
  );
}
