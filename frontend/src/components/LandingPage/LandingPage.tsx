import React, { useEffect, useRef, useState } from 'react';
import './LandingPage.css';
import NZDigitalTwin from '../NZDigitalTwin/NZDigitalTwin';

const LandingPage: React.FC = () => {


  const [currentStep, setCurrentStep] = useState(0);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = textRefs.current.findIndex(ref => ref === entry.target);
            if (index !== -1) setCurrentStep(index);
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    textRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
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

      {/* 2. HERO */}
      <header className="hero-centered">
        {/* Add your motion image/video background here */}
        <div className="hero-motion-bg-placeholder"></div>

        <div className="hero-content">
          <div className="eyebrow-line-centered"></div>
          <h1>From LiDAR<br />to <span className="orange-text">3D Reality.</span></h1>
          <p className="hero-description">Visual Mapping is a browser-based geospatial Digital Twin that transforms NZ LiDAR point clouds into interactive 3D terrain, property models, and ML-powered property screening.</p>
          <div className="hero-ctas-centered">
            <button className="cta-btn orange-btn">Open 3D Digital Twin &rarr;</button>
            <a href="#pipeline" className="ghost-link">View pipeline &darr;</a>
          </div>
        </div>

        {/* Floating Stats Pill */}
        <div className="hero-stats-pill-container">
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
      <section className="pipeline-premium" id="pipeline">
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

          <div className="pipeline-visual-col">
            <div className="sticky-visual-wrapper">
              <div className={`glow-orb step-${currentStep}`}></div>
              
              {/* Step 1 Visual */}
              <svg viewBox="0 0 100 100" aria-hidden="true" className={`svg-visual ${currentStep === 0 ? 'active' : ''}`}>
                <circle cx="20" cy="80" r="1.5" className="anim-pulse" style={{animationDelay: '0s'}} />
                <circle cx="35" cy="70" r="1.5" className="anim-pulse" style={{animationDelay: '0.2s'}} />
                <circle cx="50" cy="85" r="1.5" className="anim-pulse" style={{animationDelay: '0.4s'}} />
                <circle cx="65" cy="65" r="1.5" className="anim-pulse" style={{animationDelay: '0.1s'}} />
                <circle cx="80" cy="75" r="1.5" className="anim-pulse" style={{animationDelay: '0.3s'}} />
                <circle cx="45" cy="60" r="1.5" className="anim-pulse" style={{animationDelay: '0.5s'}} />
                <circle cx="55" cy="50" r="1.5" className="anim-pulse" style={{animationDelay: '0.2s'}} />
                <circle cx="50" cy="40" r="2" fill="#e8650a" className="anim-bounce" />
                <line x1="50" y1="40" x2="30" y2="10" stroke="#f0ede8" strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="2 2" className="anim-dash" />
                <line x1="50" y1="40" x2="70" y2="10" stroke="#f0ede8" strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="2 2" className="anim-dash" />
              </svg>

              {/* Step 2 Visual */}
              <svg viewBox="0 0 100 100" aria-hidden="true" className={`svg-visual ${currentStep === 1 ? 'active' : ''}`}>
                <path d="M 10 70 L 30 60 L 50 40 L 70 55 L 90 65" fill="none" stroke="#f0ede8" strokeWidth="1" strokeOpacity="0.5" className="anim-draw" />
                <path d="M 15 80 L 35 75 L 50 50 L 65 70 L 85 85" fill="none" stroke="#f0ede8" strokeWidth="1" strokeOpacity="0.3" className="anim-draw" style={{animationDelay: '0.2s'}} />
                <path d="M 5 90 L 25 85 L 50 65 L 75 80 L 95 95" fill="none" stroke="#f0ede8" strokeWidth="1" strokeOpacity="0.2" className="anim-draw" style={{animationDelay: '0.4s'}} />
                <line x1="30" y1="60" x2="50" y2="20" stroke="rgba(59,130,246,0.6)" strokeWidth="1" strokeDasharray="2 2" className="anim-dash" />
                <line x1="70" y1="55" x2="50" y2="20" stroke="rgba(59,130,246,0.6)" strokeWidth="1" strokeDasharray="2 2" className="anim-dash" />
                <circle cx="50" cy="20" r="2" fill="rgba(59,130,246,1)" className="anim-pulse" />
              </svg>

              {/* Step 3 Visual */}
              <svg viewBox="0 0 100 100" aria-hidden="true" className={`svg-visual ${currentStep === 2 ? 'active' : ''}`}>
                <polygon points="20,80 50,50 80,70 50,90" fill="rgba(168,85,247,0.2)" stroke="rgba(168,85,247,0.8)" strokeWidth="1" className="anim-fade-in" />
                <polygon points="20,80 50,50 50,30 20,60" fill="rgba(168,85,247,0.1)" stroke="rgba(168,85,247,0.6)" strokeWidth="1" className="anim-fade-in" style={{animationDelay: '0.2s'}} />
                <polygon points="50,50 80,70 80,50 50,30" fill="rgba(168,85,247,0.15)" stroke="rgba(168,85,247,0.6)" strokeWidth="1" className="anim-fade-in" style={{animationDelay: '0.4s'}} />
                <line x1="50" y1="30" x2="50" y2="10" stroke="#f0ede8" strokeWidth="1" strokeDasharray="2 2" className="anim-dash" />
                <circle cx="50" cy="10" r="1.5" fill="#f0ede8" className="anim-pulse" />
              </svg>

              {/* Step 4 Visual */}
              <svg viewBox="0 0 100 100" aria-hidden="true" className={`svg-visual ${currentStep === 3 ? 'active' : ''}`}>
                <rect x="30" y="40" width="10" height="10" fill="rgba(34,197,94,0.4)" stroke="rgba(34,197,94,0.8)" strokeWidth="0.5" className="anim-scale-up" />
                <rect x="42" y="40" width="10" height="10" fill="rgba(34,197,94,0.6)" stroke="rgba(34,197,94,0.8)" strokeWidth="0.5" className="anim-scale-up" style={{animationDelay: '0.1s'}} />
                <rect x="54" y="40" width="10" height="10" fill="rgba(34,197,94,0.4)" stroke="rgba(34,197,94,0.8)" strokeWidth="0.5" className="anim-scale-up" style={{animationDelay: '0.2s'}} />
                <rect x="30" y="52" width="10" height="10" fill="rgba(34,197,94,0.5)" stroke="rgba(34,197,94,0.8)" strokeWidth="0.5" className="anim-scale-up" style={{animationDelay: '0.3s'}} />
                <rect x="42" y="52" width="10" height="10" fill="rgba(34,197,94,0.8)" stroke="rgba(34,197,94,0.8)" strokeWidth="0.5" className="anim-scale-up" style={{animationDelay: '0.4s'}} />
                <rect x="54" y="52" width="10" height="10" fill="rgba(34,197,94,0.3)" stroke="rgba(34,197,94,0.8)" strokeWidth="0.5" className="anim-scale-up" style={{animationDelay: '0.5s'}} />
                <rect x="30" y="64" width="10" height="10" fill="rgba(34,197,94,0.2)" stroke="rgba(34,197,94,0.8)" strokeWidth="0.5" className="anim-scale-up" style={{animationDelay: '0.6s'}} />
                <rect x="42" y="64" width="10" height="10" fill="rgba(34,197,94,0.4)" stroke="rgba(34,197,94,0.8)" strokeWidth="0.5" className="anim-scale-up" style={{animationDelay: '0.7s'}} />
                <rect x="54" y="64" width="10" height="10" fill="rgba(34,197,94,0.2)" stroke="rgba(34,197,94,0.8)" strokeWidth="0.5" className="anim-scale-up" style={{animationDelay: '0.8s'}} />
              </svg>

              {/* Step 5 Visual */}
              <svg viewBox="0 0 100 100" aria-hidden="true" className={`svg-visual ${currentStep === 4 ? 'active' : ''}`}>
                <path d="M 20 50 L 50 40 L 80 50 L 50 60 Z" fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.8)" strokeWidth="1" className="anim-draw" />
                <path d="M 35 45 L 50 20 L 65 45" fill="none" stroke="rgba(239,68,68,0.8)" strokeWidth="1" strokeDasharray="2 2" className="anim-dash" />
                <path d="M 20 50 L 20 80 L 50 90 L 50 60" fill="none" stroke="rgba(239,68,68,0.4)" strokeWidth="1" className="anim-draw" style={{animationDelay: '0.2s'}} />
                <path d="M 80 50 L 80 80 L 50 90" fill="none" stroke="rgba(239,68,68,0.4)" strokeWidth="1" className="anim-draw" style={{animationDelay: '0.4s'}} />
                <circle cx="50" cy="20" r="2" fill="rgba(239,68,68,1)" className="anim-pulse" />
                <circle cx="20" cy="80" r="1.5" fill="rgba(239,68,68,0.6)" className="anim-pulse" style={{animationDelay: '0.2s'}} />
                <circle cx="80" cy="80" r="1.5" fill="rgba(239,68,68,0.6)" className="anim-pulse" style={{animationDelay: '0.4s'}} />
                <circle cx="50" cy="90" r="1.5" fill="rgba(239,68,68,0.6)" className="anim-pulse" style={{animationDelay: '0.6s'}} />
              </svg>

            </div>
          </div>
        </div>
      </section>
      
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

      {/* 6. MAP SECTION */}
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
