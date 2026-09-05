import "./App.css";

import NZDigitalTwin
    from "./components/NZDigitalTwin/NZDigitalTwin";


function App() {

    return (
        <main className="app-shell">

            {/* =================================================
                NAVIGATION
            ================================================= */}

            <nav className="top-nav">

                <div className="brand">

                    <div className="brand-mark">
                        3D
                    </div>

                    <div>
                        <div className="brand-name">
                            VISUAL MAPPING
                        </div>

                        <div className="brand-subtitle">
                            GEOSPATIAL DIGITAL TWIN
                        </div>
                    </div>

                </div>


                <div className="nav-status">

                    <span className="status-dot" />

                    DATASET ONLINE

                    <span className="nav-divider" />

                    NZ LIDAR

                    <span className="nav-divider" />

                    EPSG:2193

                </div>

            </nav>


            {/* =================================================
                HERO
            ================================================= */}

            <section className="hero">

                <div className="hero-copy">

                    <div className="eyebrow">
                        NEW ZEALAND • LiDAR DIGITAL TWIN
                    </div>

                    <h1>
                        From LiDAR
                        <br />
                        to <span>3D Reality.</span>
                    </h1>

                    <p>
                        A browser-based geospatial Digital Twin
                        that transforms high-resolution LiDAR
                        point clouds into interactive terrain
                        and property models.
                    </p>


                    <div className="hero-actions">

                        <a
                            href="#digital-twin"
                            className="primary-button"
                        >
                            Open 3D Digital Twin
                            <span>→</span>
                        </a>

                        <a
                            href="#pipeline"
                            className="secondary-button"
                        >
                            View Pipeline
                        </a>

                    </div>

                </div>


                <div className="hero-visual">

                    <div className="hero-grid" />

                    <div className="hero-orbit orbit-one" />
                    <div className="hero-orbit orbit-two" />

                    <div className="hero-core">

                        <div className="core-label">
                            LiDAR
                        </div>

                        <div className="core-value">
                            6.5M
                        </div>

                        <div className="core-label">
                            POINTS
                        </div>

                    </div>

                </div>

            </section>


            {/* =================================================
                DATASET METRICS
            ================================================= */}

            <section className="metrics">

                <div className="metric-card">

                    <span className="metric-label">
                        LiDAR POINTS
                    </span>

                    <strong>
                        6.5M
                    </strong>

                    <small>
                        source point cloud
                    </small>

                </div>


                <div className="metric-card">

                    <span className="metric-label">
                        GROUND POINTS
                    </span>

                    <strong>
                        5.23M
                    </strong>

                    <small>
                        terrain classification
                    </small>

                </div>


                <div className="metric-card">

                    <span className="metric-label">
                        TERRAIN
                    </span>

                    <strong>
                        87K
                    </strong>

                    <small>
                        mesh vertices
                    </small>

                </div>


                <div className="metric-card highlight">

                    <span className="metric-label">
                        PROPERTIES
                    </span>

                    <strong>
                        01
                    </strong>

                    <small>
                        reconstructed building
                    </small>

                </div>

            </section>


            {/* =================================================
                PIPELINE
            ================================================= */}

            <section
                id="pipeline"
                className="pipeline-section"
            >

                <div className="section-heading">

                    <div>

                        <div className="eyebrow">
                            PROCESSING PIPELINE
                        </div>

                        <h2>
                            From raw points to a
                            spatial twin.
                        </h2>

                    </div>

                    <p>
                        The system processes classified LiDAR
                        data and converts it into lightweight
                        browser-ready 3D geometry.
                    </p>

                </div>


                <div className="pipeline">

                    <div className="pipeline-step">
                        <span>01</span>
                        <strong>LiDAR</strong>
                        <small>LAS / LAZ</small>
                    </div>

                    <div className="pipeline-arrow">
                        →
                    </div>

                    <div className="pipeline-step">
                        <span>02</span>
                        <strong>CLASSIFY</strong>
                        <small>Ground / Building</small>
                    </div>

                    <div className="pipeline-arrow">
                        →
                    </div>

                    <div className="pipeline-step">
                        <span>03</span>
                        <strong>RECONSTRUCT</strong>
                        <small>Terrain + Property</small>
                    </div>

                    <div className="pipeline-arrow">
                        →
                    </div>

                    <div className="pipeline-step active">
                        <span>04</span>
                        <strong>3D TWIN</strong>
                        <small>Interactive WebGL</small>
                    </div>

                </div>

            </section>


            {/* =================================================
                DIGITAL TWIN
            ================================================= */}

            <section
                id="digital-twin"
                className="viewer-section"
            >

                <div className="section-heading viewer-heading">

                    <div>

                        <div className="eyebrow">
                            LIVE DIGITAL TWIN
                        </div>

                        <h2>
                            Explore the property in 3D.
                        </h2>

                    </div>

                    <div className="dataset-badge">

                        <span className="status-dot" />

                        New Zealand LiDAR

                    </div>

                </div>


                <NZDigitalTwin />

            </section>


            {/* =================================================
                DATASET INFORMATION
            ================================================= */}

            <section className="dataset-section">

                <div>

                    <div className="eyebrow">
                        DATASET
                    </div>

                    <h2>
                        New Zealand LiDAR
                    </h2>

                    <p>
                        Classified point-cloud data used to
                        reconstruct terrain and building geometry.
                    </p>

                </div>


                <div className="dataset-details">

                    <div>
                        <span>Coordinate system</span>
                        <strong>EPSG:2193</strong>
                    </div>

                    <div>
                        <span>Format</span>
                        <strong>LAZ</strong>
                    </div>

                    <div>
                        <span>Terrain vertices</span>
                        <strong>87,001</strong>
                    </div>

                    <div>
                        <span>Detected property</span>
                        <strong>NZ-B001</strong>
                    </div>

                </div>

            </section>


            <footer>

                <span>
                    3D VISUAL MAPPING
                </span>

                <span>
                    LiDAR → 3D → Spatial Intelligence
                </span>

            </footer>

        </main>
    );
}


export default App;
