import re

with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# find <span className="nz-search-icon">...</span>
match = re.search(r'<span className="nz-search-icon">.*?</span>', content, re.DOTALL)
if match:
    old_str = match.group(0)
    new_str = '<span className="nz-search-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>'
    content = content.replace(old_str, new_str)
    with open('frontend/src/components/NZDigitalTwin/NZDigitalTwin.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced search icon.")
else:
    print("Search icon not found.")
