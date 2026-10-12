"""Validate local documentation links and runtime script paths after domain removal."""
from pathlib import Path
import re
root = Path(__file__).resolve().parent.parent
for path in root.rglob('*.md'):
    if '.git' in path.parts:
        continue
    for target in re.findall(r'\]\(([^)]+)\)', path.read_text()):
        if re.match(r'^[a-z]+:', target) or target.startswith('#'):
            continue
        target = target.split('#')[0]
        assert (path.parent / target).exists(), f'{path}: missing {target}'
html = (root / 'naft-app.html').read_text()
script_targets = re.findall(r'<script[^>]+src="([^"]+)"', html)
icon_targets = re.findall(r'<link[^>]+rel="icon"[^>]+href="([^"]+)"', html)
assert icon_targets, 'favicon link missing from naft-app.html'
for target in icon_targets:
    assert not re.match(r'^[a-z]+:', target), f'external favicon: {target}'
    assert (root / target).is_file(), f'missing favicon: {target}'
for target in script_targets:
    assert not re.match(r'^[a-z]+:', target), f'external script: {target}'
    assert (root / target).is_file(), f'missing script: {target}'

# Reviewer Demo is a browser runtime module, not a test-only helper.
# Prevent a silent fallback to the ordinary UI when REVIEWER_DEMO_ROUTE is undefined.
assert 'href="src/climatechain-theme.css"' in html, 'ClimateChain scoped theme stylesheet not loaded'
assert (root / 'src/climatechain-theme.css').is_file(), 'ClimateChain scoped theme stylesheet missing'
assert 'src/reviewer-demo.js' in script_targets, 'reviewer-demo.js exists but is not loaded by naft-app.html'
assert script_targets.index('src/reviewer-demo.js') < script_targets.index('src/mrv-ui.js'), (
    'reviewer-demo.js must load before mrv-ui.js so REVIEWER_DEMO_ROUTE is defined at startup'
)
assert 'src/reviewer-demo.js' in html and '#/reviewer-demo' in (root / 'src/mrv-ui.js').read_text(), (
    'Reviewer Demo route/module wiring is incomplete'
)
print('local document, favicon/script references and reviewer route wiring: OK')
