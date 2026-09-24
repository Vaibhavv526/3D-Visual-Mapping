const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/LandingPage/LandingPage.tsx', 'utf-8');

// We need to inject the cachedMetrics ref and resize listener.
// Let's find a good place to inject the ref.
const refInjection = `
  const pipelineQuatsRef = useRef<THREE.Quaternion[]>([]);
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
`;

content = content.replace("const pipelineQuatsRef = useRef<THREE.Quaternion[]>([]);", refInjection);

// Replace getBoundingClientRect in handleScroll
content = content.replace(/const heroCenter = heroRef\.current[\s\S]*?:\s*0;/, "const heroCenter = cachedMetrics.current.heroCenter;");
content = content.replace(/const stepCenters = textRefs\.current\.map\([\s\S]*?\}\);/, "const stepCenters = cachedMetrics.current.stepCenters;");

// There's another loop computing closestIndex
const closestIndexReplacement = `
      let minDistance = Infinity;
      cachedMetrics.current.stepCenters.forEach((elCenter, index) => {
        if (elCenter === 0) return;
        const dist = Math.abs(elCenter - centerY);
        if (dist < minDistance) { minDistance = dist; closestIndex = index; }
      });
`;
content = content.replace(/let minDistance = Infinity;[\s\S]*?if \(dist < minDistance\) \{ minDistance = dist; closestIndex = index; \}\s*\}\);/, closestIndexReplacement);

fs.writeFileSync('frontend/src/components/LandingPage/LandingPage.tsx', content);
console.log('done');
