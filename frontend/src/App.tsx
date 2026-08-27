import "./App.css";

import AnalyticsCards
    from "./components/AnalyticsCards/AnalyticsCards";

import TerrainViewer
    from "./components/TerrainViewer/TerrainViewer";


function App() {

    return (
        <main>

            <header>

                <div>
                    <h1>
                        Bilaspur Digital Twin
                    </h1>

                    <p>
                        3D Terrain & Environmental Analytics
                    </p>
                </div>

                <div className="header-info">
                    <strong>
                        Bilaspur AOI
                    </strong>

                    <span>
                        1000 × 1000 m
                    </span>

                    <span>
                        EPSG:32644
                    </span>
                </div>

            </header>


            <AnalyticsCards />


            <section>

                <h2>
                    3D Digital Twin
                </h2>

                <TerrainViewer />

            </section>

        </main>
    );
}


export default App;