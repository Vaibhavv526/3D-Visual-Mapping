import re

with open("src/App.css", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update .nz-kicker
content = content.replace(
""".nz-kicker {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.14em;
    color: #ea580c;
    padding: 20px 20px 4px;
    text-transform: uppercase;
}""",
""".nz-kicker {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: var(--orange);
    padding: 20px 20px 4px;
    text-transform: uppercase;
}""")

# 2. Update .nz-section-title, .nz-prop-section-title
content = content.replace(
""".nz-section-title, .nz-prop-section-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: #a3a3a3;
    margin-top: 16px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-transform: uppercase;
}""",
""".nz-section-title, .nz-prop-section-title {
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: #e5e5e5;
    margin-top: 20px;
    margin-bottom: 12px;
    display: flex;
    align-items: baseline;
    justify-content: flex-start;
    text-transform: uppercase;
    gap: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.04);
    padding-top: 16px;
}""")

# Remove the duplicate .nz-prop-section-title if it exists around 2401
content = content.replace(
""".nz-prop-section-title {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: #a3a3a3;
    margin-top: 16px;
    margin-bottom: 8px;
    text-transform: uppercase;
    justify-content: flex-start;
    gap: 8px;
}""", "")

# 3. Add first-of-type border removal
content += '\n.nz-area-content > .nz-prop-section-title:first-of-type {\n    border-top: none;\n    padding-top: 0;\n    margin-top: 0;\n}\n'

# 4. Update .nz-section-num
content = content.replace(
""".nz-section-num {
    font-size: 9px;
    font-weight: 700;
    color: #b3b3b3;
}""",
""".nz-section-num {
    font-size: 11.5px;
    font-weight: 700;
    color: #ffffff;
}""")

# 5. Update .nz-prop-item span
content = content.replace(
""".nz-prop-item span, .nz-prop-item > span:first-child {
    grid-column: 1;
    font-size: 11px;
    color: #737373;
    font-weight: 500;
}""",
""".nz-prop-item span, .nz-prop-item > span:first-child {
    grid-column: 1;
    font-size: 10px;
    color: #8c8c8c;
    font-weight: 500;
}""")

# 6. Update .nz-prop-item strong
content = content.replace(
""".nz-prop-item strong {
    grid-column: 2;
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    text-align: right;
}""",
""".nz-prop-item strong {
    grid-column: 2;
    font-size: 12.5px;
    font-weight: 600;
    color: #ffffff;
    text-align: right;
}""")

# 7. Update .nz-prop-item span2 strong
content = content.replace(
""".nz-prop-item.nz-prop-full strong, .nz-prop-item.nz-prop-span2 strong {
    text-align: left;
}""",
""".nz-prop-item.nz-prop-full strong, .nz-prop-item.nz-prop-span2 strong {
    text-align: left;
    font-size: 12.5px;
    font-weight: 600;
    color: #ffffff;
}""")
content = content.replace(
""".nz-prop-2col .nz-prop-item strong {
    text-align: left;
}""",
""".nz-prop-2col .nz-prop-item strong {
    text-align: left;
    font-size: 12.5px;
    font-weight: 600;
    color: #ffffff;
}""")

# 8. Update .nz-prop-note
content = content.replace(
""".nz-prop-note {
    grid-column: 1 / -1;
    margin-top: 2px;
}""", "")
content = content.replace(
""".nz-prop-note {
    font-size: 11px;
    color: #737373;
    line-height: 1.5;
    margin-top: 2px;
    font-style: normal;
}""", "")

content += '\n.nz-prop-note {\n    grid-column: 1 / -1;\n    font-size: 10px;\n    color: #737373;\n    line-height: 1.4;\n    margin-top: 6px;\n    font-style: italic;\n}\n'

# 9. Add .nz-metric-large
content += '\n.nz-metric-large {\n    font-size: 15px !important;\n    font-weight: 700 !important;\n    color: #ffffff !important;\n}\n'

with open("src/App.css", "w", encoding="utf-8") as f:
    f.write(content)
