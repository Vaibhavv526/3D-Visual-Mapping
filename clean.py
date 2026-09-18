import re

path = r'c:\Users\igpat\Downloads\SIH\3D-Visual-Mapping\frontend\src\components\LandingPage\LandingPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove state and useEffect hooks for scroll
content = re.sub(
    r'  const \[currentStep, setCurrentStep\] = useState\(0\);\n  const \[progress, setProgress\] = useState\(0\);\n  const trackRef = useRef<HTMLDivElement>\(null\);\n\n  useEffect\(\(\) => \{[\s\S]*?  const scrollToStep =.*?};\n',
    '',
    content,
    flags=re.MULTILINE|re.DOTALL
)

# 2. Remove getCardClass definition
content = re.sub(
    r'  const getCardClass = \(index: number\) => \{[\s\S]*?  };\n',
    '',
    content,
    flags=re.MULTILINE
)

# 3. Replace dynamic getCardClass calls with static class
content = re.sub(
    r'className=\{getCardClass\(\d+\)\}',
    r'className="ps-card"',
    content
)

# 4. Remove side-dots and scroll-cue markup
content = re.sub(
    r'          <div \n            className="scroll-cue"[\s\S]*?          </div>\n          \n          <div \n            className="side-dots"[\s\S]*?          </div>',
    '',
    content,
    flags=re.MULTILINE
)

# 5. Remove trackRef reference
content = content.replace(' ref={trackRef}', '')

# 6. Adjust React imports if necessary (assuming it was just `import React, { ... }`)
content = content.replace('import React, { useState, useEffect, useRef }', 'import React, { useEffect }')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("LandingPage.tsx updated.")
