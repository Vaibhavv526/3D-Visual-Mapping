const fs = require('fs');
const file = 'c:/Users/igpat/Downloads/SIH/3D-Visual-Mapping/frontend/src/components/LandingPage/Earth/Earth.tsx';
let code = fs.readFileSync(file, 'utf8');

const debugMarkersCode = `
// ── DEBUG MARKERS ───────────────────────────────────────────────────────────
const DEBUG_MARKERS = [
  // Pipeline targets
  { label: 'NA', lat: 38, lon: -100, color: 'red' },
  { label: 'EU', lat: 50, lon: 10, color: 'blue' },
  { label: 'AS', lat: 35, lon: 105, color: 'green' },
  { label: 'AF', lat: 5, lon: 20, color: 'yellow' },
  { label: 'NZ', lat: -41, lon: 174, color: 'magenta' },
  // Landmarks
  { label: 'New York', lat: 40.7128, lon: -74.0060, color: 'orange' },
  { label: 'London', lat: 51.5074, lon: -0.1278, color: 'orange' },
  { label: 'Tokyo', lat: 35.6762, lon: 139.6503, color: 'orange' },
  { label: 'Wellington', lat: -41.2866, lon: 174.7756, color: 'orange' },
  { label: 'Cape Town', lat: -33.9249, lon: 18.4241, color: 'orange' },
  { label: 'Auckland', lat: -36.8509, lon: 174.7645, color: 'orange' }
];

function geoToVec3(lat, lon, radius = 1.45) {
  const latR = lat * Math.PI / 180;
  const lonR = lon * Math.PI / 180;
  return new THREE.Vector3(
    Math.cos(latR) * Math.cos(lonR) * radius,
    Math.sin(latR) * radius,
    Math.cos(latR) * Math.sin(lonR) * radius
  );
}

function DebugMarkers() {
  return (
    <group>
      {DEBUG_MARKERS.map((m, i) => (
        <mesh key={i} position={geoToVec3(m.lat, m.lon, 1.48)}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color={m.color} />
        </mesh>
      ))}
    </group>
  );
}
`;

if (!code.includes('DebugMarkers')) {
  code = code.replace(/const EarthScene = React.memo\(\(\{ rotationRef, reducedMotion \}: SceneProps\) => \{/, debugMarkersCode + '\nconst EarthScene = React.memo(({ rotationRef, reducedMotion }: SceneProps) => {');
  code = code.replace(/<points geometry=\{pointGeo\} material=\{pointMat\} \/>/, '<points geometry={pointGeo} material={pointMat} />\n        <DebugMarkers />');
  fs.writeFileSync(file, code);
}
