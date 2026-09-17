import re

path = r"c:\Users\igpat\Downloads\SIH\3D-Visual-Mapping\frontend\src\components\NZDigitalTwin\NZDigitalTwin.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# I will find the block from {/ * 3-BUTTON MAP TOOLBAR * /} to before {/ * TOP LEFT * /}
start_marker = "            {/* 3-BUTTON MAP TOOLBAR */}"
end_marker = "            {/* TOP LEFT */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

new_toolbar_jsx = """
            {/* 3-BUTTON MAP TOOLBAR */}
            <div className="nz-toolbar">
                <button 
                    className={`nz-toolbar-btn ${activeTool === 'visualization' ? 'active' : ''}`}
                    onClick={() => setActiveTool(activeTool === 'visualization' ? null : 'visualization')}
                    data-tooltip="Visualization"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>

                <div className="nz-toolbar-divider" />

                <button 
                    className={`nz-toolbar-btn ${activeTool === 'overlays' ? 'active' : ''}`}
                    onClick={() => setActiveTool(activeTool === 'overlays' ? null : 'overlays')}
                    data-tooltip="Overlays"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 12 12 17 22 12"></polyline><polyline points="2 17 12 22 22 17"></polyline></svg>
                </button>

                <div className="nz-toolbar-divider" />

                <button 
                    className={`nz-toolbar-btn ${activeTool === 'measurement' ? 'active' : ''}`}
                    onClick={() => setActiveTool(activeTool === 'measurement' ? null : 'measurement')}
                    data-tooltip="Measurement"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </button>
            </div>

            {/* TOOLBAR POPUPS */}
            {activeTool === 'visualization' && (
                <div className="nz-toolbar-popup">
                    <div className="nz-popup-title">TERRAIN VISUALIZATION</div>
                    
                    <div className="nz-viz-grid">
                        <button className={`nz-viz-btn ${layer === 'rgb_hillshade' ? 'active' : ''}`} onClick={() => setLayer('rgb_hillshade')}>
                            <span>True Color + Hillshade</span>
                            <small>Sentinel-2 + LiDAR</small>
                        </button>
                        <button className={`nz-viz-btn ${layer === 'elevation' ? 'active' : ''}`} onClick={() => setLayer('elevation')}>
                            <span>Elevation</span>
                            <small>{elevationMin.toFixed(1)} - {elevationMax.toFixed(1)} m</small>
                        </button>
                        <button className={`nz-viz-btn ${layer === 'slope' ? 'active' : ''}`} onClick={() => setLayer('slope')}>
                            <span>Slope</span>
                            <small>0 - {slopeMax.toFixed(1)}°</small>
                        </button>
                        <button className={`nz-viz-btn ${layer === 'relative' ? 'active' : ''}`} onClick={() => setLayer('relative')}>
                            <span>Relative Elevation</span>
                            <small>0 - 1</small>
                        </button>
                        <button className={`nz-viz-btn ${layer === 'ndvi' ? 'active' : ''}`} onClick={() => setLayer('ndvi')}>
                            <span>Vegetation (NDVI)</span>
                            <small>Surface reflectance</small>
                        </button>
                        <button className={`nz-viz-btn ${layer === 'rgb' ? 'active' : ''}`} onClick={() => setLayer('rgb')}>
                            <span>Satellite (RGB)</span>
                            <small>Raw reflectance</small>
                        </button>
                    </div>

                    <div className="nz-popup-divider" />

                    <div className="nz-popup-title">CAMERA SCENE FOCUS</div>
                    
                    <div className="nz-preset-grid">
                        {CAMERA_PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                className={activePreset === preset.id ? "nz-preset-btn active" : "nz-preset-btn"}
                                onClick={() => handleSelectPreset(preset)}
                            >
                                <span>{preset.name}</span>
                                <small>{preset.badge}</small>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {activeTool === 'overlays' && (
                <div className="nz-toolbar-popup">
                    <div className="nz-popup-title">MAP OVERLAYS</div>
                    
                    <div className="nz-overlay-row">
                        <div className="nz-overlay-row-left">
                            <span className="nz-overlay-row-name">Buildings</span>
                            <span className="nz-overlay-row-count">{buildings.length}</span>
                        </div>
                        <label className="nz-toggle-switch">
                            <input type="checkbox" checked={showBuildings} onChange={(e) => setShowBuildings(e.target.checked)} />
                            <div className="nz-toggle-track" />
                        </label>
                    </div>

                    <div className="nz-overlay-row">
                        <div className="nz-overlay-row-left">
                            <span className="nz-overlay-row-name">Cadastral Parcels</span>
                            <span className="nz-overlay-row-count">{parcelsData?.parcels?.length ?? 0}</span>
                        </div>
                        <label className="nz-toggle-switch">
                            <input type="checkbox" checked={showParcels} onChange={(e) => setShowParcels(e.target.checked)} />
                            <div className="nz-toggle-track" />
                        </label>
                    </div>
                </div>
            )}

            {activeTool === 'measurement' && (
                <div className="nz-toolbar-popup">
                    <div className="nz-popup-title">SPATIAL MEASUREMENT</div>
                    
                    <div className="nz-measure-section">
                        {!measureMode ? (
                            <>
                                <div className="nz-measure-status" style={{marginBottom: '10px'}}>
                                    Select a building on the map first to measure distance and elevation delta to another structure.
                                </div>
                                {selectedBuilding && (
                                    <button 
                                        className="nz-btn"
                                        onClick={() => { setMeasureMode(true); setMeasureTarget(null); }}
                                    >
                                        Start Measurement
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                {measureTarget ? (
                                    <div className="nz-measure-status" style={{marginBottom: '10px'}}>
                                        Measurement complete.
                                    </div>
                                ) : (
                                    <div className="nz-measure-status" style={{marginBottom: '10px'}}>
                                        Select a target building on the map.
                                    </div>
                                )}
                                <button 
                                    className="nz-btn-secondary"
                                    style={{width: '100%'}}
                                    onClick={() => { setMeasureMode(false); setMeasureTarget(null); document.body.style.cursor = "auto"; }}
                                >
                                    Cancel Measurement
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
\n"""

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_toolbar_jsx + content[end_idx:]

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixes applied")
