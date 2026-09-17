import re

path = r"c:\Users\igpat\Downloads\SIH\3D-Visual-Mapping\frontend\src\components\NZDigitalTwin\NZDigitalTwin.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add activeTool state
state_code = """
    // --- TOOLBAR STATE ---
    const [activeTool, setActiveTool] = useState<"visualization" | "overlays" | "measurement" | null>(null);
"""
# Insert after isCollapsingToBuilding state
insert_state_marker = "    const [\n        isCollapsingToBuilding,\n        setIsCollapsingToBuilding\n    ] =\n        useState<boolean>(false);"
if insert_state_marker in content:
    content = content.replace(insert_state_marker, insert_state_marker + "\n" + state_code)

# 2. Build the toolbar JSX
toolbar_jsx = """
            {/* 3-BUTTON MAP TOOLBAR */}
            <div className="nz-toolbar" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 40 }}>
                
                <button 
                    className={`nz-toolbar-btn ${activeTool === 'visualization' ? 'active' : ''}`}
                    onClick={() => setActiveTool(activeTool === 'visualization' ? null : 'visualization')}
                    title="Visualization"
                    data-tooltip="Visualization"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>

                <div className="nz-toolbar-divider" />

                <button 
                    className={`nz-toolbar-btn ${activeTool === 'overlays' ? 'active' : ''}`}
                    onClick={() => setActiveTool(activeTool === 'overlays' ? null : 'overlays')}
                    title="Overlays"
                    data-tooltip="Overlays"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 12 12 17 22 12"></polyline><polyline points="2 17 12 22 22 17"></polyline></svg>
                </button>

                <div className="nz-toolbar-divider" />

                <button 
                    className={`nz-toolbar-btn ${activeTool === 'measurement' ? 'active' : ''}`}
                    onClick={() => setActiveTool(activeTool === 'measurement' ? null : 'measurement')}
                    title="Measurement"
                    data-tooltip="Measurement"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </button>
            </div>

            {/* TOOLBAR POPUPS */}
            {activeTool === 'visualization' && (
                <div className="nz-toolbar-popup" style={{ position: 'absolute', left: '70px', top: '50%', transform: 'translateY(-50%)', zIndex: 40, background: 'rgba(10,10,10,0.92)', border: '1px solid #333', borderRadius: '8px', padding: '12px', width: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, letterSpacing: '1px', marginBottom: '4px' }}>VISUALIZATION MODES</div>
                    {[
                        { id: 'rgb_hillshade', name: 'True Color + Hillshade' },
                        { id: 'elevation', name: 'Elevation' },
                        { id: 'slope', name: 'Slope' },
                        { id: 'relative', name: 'Relative Elevation' },
                        { id: 'ndvi', name: 'Vegetation (NDVI)' },
                        { id: 'rgb', name: 'Satellite (RGB)' }
                    ].map(mode => (
                        <button 
                            key={mode.id}
                            className={`nz-layer ${layer === mode.id ? 'active' : ''}`}
                            onClick={() => setLayer(mode.id as any)}
                            style={{ display: 'flex', flexDirection: 'column', padding: '8px', background: layer === mode.id ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${layer === mode.id ? '#f97316' : 'transparent'}`, borderRadius: '4px', textAlign: 'left', cursor: 'pointer' }}
                        >
                            <span style={{ fontSize: '13px', color: layer === mode.id ? '#f97316' : '#fff' }}>{mode.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {activeTool === 'overlays' && (
                <div className="nz-toolbar-popup" style={{ position: 'absolute', left: '70px', top: '50%', transform: 'translateY(-50%)', zIndex: 40, background: 'rgba(10,10,10,0.92)', border: '1px solid #333', borderRadius: '8px', padding: '12px', width: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, letterSpacing: '1px' }}>MAP OVERLAYS</div>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '14px' }}>
                        <input type="checkbox" checked={showBuildings} onChange={(e) => setShowBuildings(e.target.checked)} />
                        Buildings
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '14px' }}>
                        <input type="checkbox" checked={showParcels} onChange={(e) => setShowParcels(e.target.checked)} />
                        Cadastral Parcels
                    </label>
                </div>
            )}

            {activeTool === 'measurement' && (
                <div className="nz-toolbar-popup" style={{ position: 'absolute', left: '70px', top: '50%', transform: 'translateY(-50%)', zIndex: 40, background: 'rgba(10,10,10,0.92)', border: '1px solid #333', borderRadius: '8px', padding: '12px', width: '250px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, letterSpacing: '1px', marginBottom: '4px' }}>SPATIAL MEASUREMENT</div>
                    
                    {!measureMode ? (
                        <>
                            <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px' }}>Select a building first to measure distance and elevation delta to another structure.</div>
                            {selectedBuilding ? (
                                <button 
                                    onClick={() => { setMeasureMode(true); setMeasureTarget(null); }}
                                    style={{ background: '#f97316', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Start Measurement
                                </button>
                            ) : (
                                <div style={{ fontSize: '12px', color: '#f97316', padding: '8px', background: 'rgba(249,115,22,0.1)', borderRadius: '4px' }}>
                                    Please select a building on the map to begin.
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px' }}>
                                {measureTarget ? 'Measurement complete.' : 'Select a target building on the map.'}
                            </div>
                            <button 
                                onClick={() => { setMeasureMode(false); setMeasureTarget(null); document.body.style.cursor = "auto"; }}
                                style={{ background: '#333', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Cancel Measurement
                            </button>
                        </>
                    )}
                </div>
            )}
"""

# 3. Insert JSX right before {/* TOP LEFT */}
insert_jsx_marker = "            {/* TOP LEFT */}"
if insert_jsx_marker in content:
    content = content.replace(insert_jsx_marker, toolbar_jsx + "\n" + insert_jsx_marker)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixes applied")
