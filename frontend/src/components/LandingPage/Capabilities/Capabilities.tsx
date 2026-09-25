import React from 'react';
import './Capabilities.css';

const Capabilities: React.FC = () => {
  return (
    <section id="capabilities" className="capabilities-section">
      <div className="capabilities-header">
        <h2 className="capabilities-heading">Capabilities</h2>
        <p className="capabilities-subheading">Connecting spatial data, 3D reconstruction, analysis, and property intelligence.</p>
      </div>
      <div className="cap-grid">
        {/* Card 1: 3D Property Identity */}
        <div className="cap-card">
          <div className="cap-icon-wrapper">
            <svg className="cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <h3 className="cap-title">3D Property Identity</h3>
          <p className="cap-body">Unify boundaries, terrain, and built structures into a single addressable volume.</p>
          <span className="cap-tag">CORE</span>
        </div>

        {/* Card 2: Explainable ML */}
        <div className="cap-card">
          <div className="cap-icon-wrapper">
            <svg className="cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <h3 className="cap-title">Explainable ML</h3>
          <p className="cap-body">Transparent machine learning models for detecting dimensional anomalies.</p>
          <span className="cap-tag">ANALYTICS</span>
        </div>

        {/* Card 3: Remote Sensing */}
        <div className="cap-card">
          <div className="cap-icon-wrapper">
            <svg className="cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <h3 className="cap-title">Remote Sensing</h3>
          <p className="cap-body">Accurate structural derivation directly from nationwide LiDAR point clouds.</p>
          <span className="cap-tag">DATA</span>
        </div>

        {/* Card 4: Spatial Site Analysis */}
        <div className="cap-card">
          <div className="cap-icon-wrapper">
            <svg className="cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h3 className="cap-title">Spatial Site Analysis</h3>
          <p className="cap-body">Evaluate shading, sightlines, and setbacks in a true 3D context.</p>
          <span className="cap-tag">TOOLS</span>
        </div>

        {/* Card 5: Human Review Workflow */}
        <div className="cap-card">
          <div className="cap-icon-wrapper">
            <svg className="cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h3 className="cap-title">Human Review Workflow</h3>
          <p className="cap-body">Streamline verification with priority flagging and comparative tools.</p>
          <span className="cap-tag">WORKFLOW</span>
        </div>

        {/* Card 6: Property Dossier */}
        <div className="cap-card">
          <div className="cap-icon-wrapper">
            <svg className="cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h3 className="cap-title">Property Dossier</h3>
          <p className="cap-body">Generate comprehensive structural profiles and contextual site reports.</p>
          <span className="cap-tag">OUTPUT</span>
        </div>
      </div>
    </section>
  );
};

export default Capabilities;
