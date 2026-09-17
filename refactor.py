import re
import os

path = r"c:\Users\igpat\Downloads\SIH\3D-Visual-Mapping\frontend\src\components\NZDigitalTwin\NZDigitalTwin.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract PROPERTY REGISTRY LOGIC from AreaIntelligencePanel
registry_logic_start = content.find("    // --- PROPERTY REGISTRY LOGIC ---")
registry_logic_end = content.find("    // --- END REGISTRY LOGIC ---") + len("    // --- END REGISTRY LOGIC ---")

registry_logic = content[registry_logic_start:registry_logic_end]
content = content[:registry_logic_start] + content[registry_logic_end:]

# 2. Extract AreaIntelligencePanel Tabs
header_start = content.find("                  <div style={{ display: 'flex', gap: '20px', marginTop: '10px', borderBottom: '1px solid #334155' }}>")
header_end = content.find("              <div className=\"nz-area-content\" style={{ flex: 1, overflowY: 'auto' }}>")
if header_start != -1 and header_end != -1:
    content = content[:header_start] + content[header_end:]

# 3. Extract activeTab registry condition
registry_tab_start = content.find("                {activeTab === \"registry\" && (")
if registry_tab_start != -1:
    # Look for the exact sequence that closes the registry tab block
    # It ends with `                )}\n\n            </div>\n        </div>\n    );\n}`
    end_marker = "                )}\n\n            </div>\n        </div>\n    );\n}"
    registry_tab_end = content.find(end_marker, registry_tab_start)
    if registry_tab_end != -1:
        content = content[:registry_tab_start] + content[registry_tab_end + len("                )}\n"):]

# Remove activeTab === "overview" && (
content = content.replace("                {activeTab === \"overview\" && (\n                    <>\n", "")
# the matching closing tag `                    </>\n                )}`
content = content.replace("                    </>\n                )}\n", "")

# Remove activeTab state
content = content.replace("    const [activeTab, setActiveTab] = useState<\"overview\" | \"registry\">(\"overview\");\n", "")

# 4. Insert PROPERTY REGISTRY LOGIC in NZDigitalTwin before return (
insert_point = content.find("    return (\n        <div className=\"nz-twin\">")

search_focused_state = """
    // --- PROPERTY REGISTRY SEARCH UI STATE ---
    const [searchFocused, setSearchFocused] = useState(false);
    
    const handleRegistryResultClick = (r: any) => {
        if (r.type === "building" && r.building) {
            const q = searchQuery.trim().toLowerCase();
            let matchedUnit = null;
            if (q.length >= 3 && r.verticalUnits) {
                matchedUnit = r.verticalUnits.find((u: any) => u.id.toLowerCase() === q);
            }
            if (matchedUnit) {
                handleOpenVerticalUnit(r.building, matchedUnit.floorIndex);
            } else {
                handleSelectBuilding(r.building);
            }
        }
        setSearchFocused(false);
    };
"""

registry_logic = registry_logic.replace("onFocusBuildingOnly", "handleFocusBuildingOnly")
registry_logic = registry_logic.replace("onOpenBuilding", "handleSelectBuilding")
registry_logic = registry_logic.replace("onOpenVerticalUnit", "handleOpenVerticalUnit")

content = content[:insert_point] + registry_logic + "\n" + search_focused_state + content[insert_point:]

# 5. Insert Search Bar UI before {/* TOOLBAR */}
toolbar_idx = content.find("            {/* TOOLBAR */}")

search_bar_ui = """
            {/* PROPERTY REGISTRY SEARCH BAR */}
            <div className="nz-search-bar">
                <div className="nz-search-input-wrap">
                    <span className="nz-search-icon">🔍</span>
                    <input 
                        className="nz-search-input" 
                        type="text"
                        placeholder="Search property, parcel or building ID" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        onFocus={() => setSearchFocused(true)} 
                        onBlur={() => setTimeout(() => setSearchFocused(false), 200)} 
                    />
                    {searchQuery && (
                        <button className="nz-search-clear" onClick={() => { setSearchQuery(""); setSearchFocused(false); }}>×</button>
                    )}
                </div>
                
                {searchFocused && searchQuery && (
                    <div className="nz-search-dropdown" onMouseDown={(e) => e.preventDefault()}>
                        {displayedRegistryRecords.length > 0 ? displayedRegistryRecords.map(r => (
                            <div key={r.id} className="nz-search-result" onClick={() => handleRegistryResultClick(r)}>
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="nz-search-result-badge">{r.type === 'building' ? 'PROPERTY' : 'PARCEL'}</span>
                                            <span className="nz-search-result-id">{r.type === 'building' ? r.propertyId3D : r.id}</span>
                                        </div>
                                        <div className="nz-search-result-meta">
                                            {r.type === 'building' ? r.buildingId : r.linzPrimaryParcelId}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="nz-search-empty">No results found for "{searchQuery}"</div>
                        )}
                    </div>
                )}
            </div>

"""

if toolbar_idx != -1:
    content = content[:toolbar_idx] + search_bar_ui + content[toolbar_idx:]

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Refactor complete")

