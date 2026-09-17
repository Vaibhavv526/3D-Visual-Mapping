import re

with open("src/App.css", "r", encoding="utf-8") as f:
    content = f.read()

# Replace .nz-kicker
content = re.sub(r'\.nz-kicker\s*\{[^}]*\}', 
                 '.nz-kicker {\n    font-size: 9.5px;\n    font-weight: 600;\n    letter-spacing: 0.14em;\n    color: var(--orange);\n    padding: 20px 20px 4px;\n    text-transform: uppercase;\n}', content, count=1)

# Replace .nz-section-title, .nz-prop-section-title
content = re.sub(r'\.nz-section-title,\s*\.nz-prop-section-title\s*\{[^}]*\}',
                 '.nz-section-title, .nz-prop-section-title {\n    font-size: 11.5px;\n    font-weight: 600;\n    letter-spacing: 0.08em;\n    color: #e5e5e5;\n    margin-top: 20px;\n    margin-bottom: 12px;\n    display: flex;\n    align-items: baseline;\n    justify-content: flex-start;\n    text-transform: uppercase;\n    gap: 8px;\n    border-top: 1px solid rgba(255, 255, 255, 0.04);\n    padding-top: 16px;\n}', content)

# Replace standalone .nz-prop-section-title
content = re.sub(r'\.nz-prop-section-title\s*\{[^}]*\}', '', content)

# Add the first-of-type border removal
content += '\n.nz-area-content > .nz-prop-section-title:first-of-type {\n    border-top: none;\n    padding-top: 0;\n    margin-top: 0;\n}\n'

# Replace .nz-section-num
content = re.sub(r'\.nz-section-num\s*\{[^}]*\}',
                 '.nz-section-num {\n    font-size: 11.5px;\n    font-weight: 700;\n    color: #ffffff;\n}', content)

# Replace .nz-prop-item span, .nz-prop-item > span:first-child
content = re.sub(r'\.nz-prop-item span,\s*\.nz-prop-item > span:first-child\s*\{[^}]*\}',
                 '.nz-prop-item span, .nz-prop-item > span:first-child {\n    grid-column: 1;\n    font-size: 10px;\n    color: #8c8c8c;\n    font-weight: 500;\n}', content)

# Replace .nz-prop-item strong
content = re.sub(r'\.nz-prop-item strong\s*\{[^}]*\}',
                 '.nz-prop-item strong {\n    grid-column: 2;\n    font-size: 12.5px;\n    font-weight: 600;\n    color: #ffffff;\n    text-align: right;\n}', content)
                 
# Replace span2 strong
content = re.sub(r'\.nz-prop-item\.nz-prop-full strong,\s*\.nz-prop-item\.nz-prop-span2 strong\s*\{[^}]*\}',
                 '.nz-prop-item.nz-prop-full strong, .nz-prop-item.nz-prop-span2 strong {\n    text-align: left;\n    font-size: 12.5px;\n    font-weight: 600;\n    color: #ffffff;\n}', content)

# Remove all existing .nz-prop-note
content = re.sub(r'\.nz-prop-note\s*\{[^}]*\}', '', content)

# Add .nz-prop-note back once
content += '\n.nz-prop-note {\n    grid-column: 1 / -1;\n    font-size: 10px;\n    color: #737373;\n    line-height: 1.4;\n    margin-top: 2px;\n    font-style: italic;\n}\n'

# Add .nz-metric-large
content += '\n.nz-metric-large {\n    font-size: 15px !important;\n    font-weight: 700 !important;\n    color: #ffffff !important;\n}\n'

with open("src/App.css", "w", encoding="utf-8") as f:
    f.write(content)
