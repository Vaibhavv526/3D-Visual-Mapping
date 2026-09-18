import re

with open('src/OldMapPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace HTML comments with JSX comments
content = re.sub(r'<!--(.*?)-->', r'{/*\1*/}', content, flags=re.DOTALL)

# Fix unescaped characters in JSX text nodes, like <, >
# However, this can be tricky. But let's fix known ones:
# The error was: Unexpected token. Did you mean `{'>'}` or `&gt;`?
content = content.replace('->', '-&gt;').replace('<-', '&lt;-')

# Also any raw unescaped > or < that isn't part of a tag.
# Usually it's in text like `Open full map &rarr;` which is fine.
# But `->` is problematic in JSX.
# Any `>` that has space before it and is not inside a tag?
# Better: just replace any stray `>` with `&gt;` if we can find them, but regex is hard.
# Let's fix specific errors:
# src/OldMapPage.tsx(361,229): error TS17002: Expected corresponding JSX closing tag for 'div'.
# Let's just fix the inline styles that might be broken:
content = re.sub(r'style="([^"]*)"', lambda m: 'style={{' + ', '.join([f"'{k.strip()}': '{v.strip()}'" for k, v in [p.split(':') for p in m.group(1).split(';') if p.strip()]]) + '}}', content)

# Check for unescaped { or }
# None expected

with open('src/OldMapPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed JSX!")
