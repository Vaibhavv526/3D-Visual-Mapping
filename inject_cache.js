const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/LandingPage/LandingPage.tsx', 'utf-8');

const refInjection = `
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

const target = "STOP_QUATS.map(q => q.clone())\n  );";

if (code.includes(target)) {
    code = code.replace(target, target + '\n' + refInjection);
} else if (code.includes("STOP_QUATS.map(q => q.clone())\r\n  );")) {
    code = code.replace("STOP_QUATS.map(q => q.clone())\r\n  );", "STOP_QUATS.map(q => q.clone())\r\n  );" + '\n' + refInjection);
} else {
    console.log('Target not found!');
}

fs.writeFileSync('frontend/src/components/LandingPage/LandingPage.tsx', code);
console.log('done');
