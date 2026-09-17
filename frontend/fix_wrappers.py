import re

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Property panel (main) start
start_prop = """            {parcelsAvailable && cadastralAssoc?.property_id_3d && ("""
if start_prop in content:
    content = content.replace(start_prop, '            <div className="nz-property-scroll-body">\n' + start_prop, 1)

# Property panel (main) end
end_prop = """            <div style={{ height: "24px" }} />
        </div>
    );
}"""
if end_prop in content:
    content = content.replace(end_prop, '            <div style={{ height: "24px" }} />\n            </div>\n        </div>\n    );\n}')


# Vertical exploration start
start_vert = """                <div className="nz-back-building-wrap" style={{ marginBottom: "16px" }}>
                    <button"""
if start_vert in content:
    content = content.replace(start_vert, '                <div className="nz-property-scroll-body">\n' + start_vert, 1)

# Vertical exploration end
end_vert = """                        <div className="nz-disclaimer">
                            Vertical Unit IDs are project-defined identifiers for LiDAR-derived estimated levels. They are not official ULPINs or legal cadastral unit identifiers.
                        </div>
                    </>
                )}
            </div>
        </div>
    );"""
if end_vert in content:
    content = content.replace(end_vert, """                        <div className="nz-disclaimer">
                            Vertical Unit IDs are project-defined identifiers for LiDAR-derived estimated levels. They are not official ULPINs or legal cadastral unit identifiers.
                        </div>
                    </>
                )}
            </div>
            </div>
        </div>
    );""")


# Parcel Inspector start
start_parcel = """            <div className="nz-property-header" style={{ marginBottom: "16px" }}>
                <h3>{parcel.parcel_id}</h3>
                {parcel.parcel_intent ? (
                    <span className="nz-class-badge">{parcel.parcel_intent}</span>
                ) : (
                    <span className="nz-class-badge">LINZ Primary Parcel</span>
                )}
            </div>

            {parcel.associated_building_ids.length === 0 && ("""
if start_parcel in content:
    content = content.replace(start_parcel, """            <div className="nz-property-header" style={{ marginBottom: "16px" }}>
                <h3>{parcel.parcel_id}</h3>
                {parcel.parcel_intent ? (
                    <span className="nz-class-badge">{parcel.parcel_intent}</span>
                ) : (
                    <span className="nz-class-badge">LINZ Primary Parcel</span>
                )}
            </div>

            <div className="nz-property-scroll-body">
            {parcel.associated_building_ids.length === 0 && (""")


# Parcel Inspector end
end_parcel = """            <div className="nz-disclaimer" style={{ marginTop: "10px" }}>
                Cadastral parcel boundaries and attributes sourced from Land Information New Zealand (LINZ) Data Service Layer 50772.
                This viewer provides analytical spatial integration only and does not establish legal title, official ownership, or official ULPIN status.
            </div>
        </div>
    );"""
if end_parcel in content:
    content = content.replace(end_parcel, """            <div className="nz-disclaimer" style={{ marginTop: "10px" }}>
                Cadastral parcel boundaries and attributes sourced from Land Information New Zealand (LINZ) Data Service Layer 50772.
                This viewer provides analytical spatial integration only and does not establish legal title, official ownership, or official ULPIN status.
            </div>
            </div>
        </div>
    );""")

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated wrappers successfully!")
