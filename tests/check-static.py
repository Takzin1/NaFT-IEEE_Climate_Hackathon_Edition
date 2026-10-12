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
# Standalone Pages root must direct judges to the English ClimateChain demo.
landing = (root / 'index.html').read_text()
assert '<html lang="en">' in landing, 'standalone landing language must be English'
assert "location.hash||'#/climatechain'" in landing, 'direct ClimateChain Pages deep-link redirect missing'
assert 'naft-app.html' in landing, 'standalone app redirect missing'
assert '<meta name="description"' in landing, 'judge landing meta description missing'
html = (root / 'naft-app.html').read_text()
assert '<html lang="en">' in html, 'IEEE judge app must be English'
assert '<meta name="description"' in html, 'judge app metadata missing'
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

# Destination-release regression: prevent stale source-branch and testnet claims.
expected_demo = 'https://takzin1.github.io/NaFT-IEEE_Climate_Hackthon_Edition/#/climatechain'
for path in ['README.md','docs/ieee-submission-pack.md','docs/submission-freeze.md']:
    data = (root / path).read_text()
    assert expected_demo in data, f'{path}: destination demo URL missing'
    assert 'https://takzin1.github.io/NaFT/#/climatechain' not in data, f'{path}: stale source Pages link'
migration = (root / 'docs/DESTINATION_MIGRATION_STATUS.md').read_text()
assert 'Latest successful read-only verification #6' in migration, 'destination Sepolia success report missing'
assert 'has **not** succeeded on the' not in migration, 'obsolete Sepolia failure claim still in release status'
checklist = (root / 'docs/submission-checklist.md').read_text()
assert 'destination GitHub Actions' not in checklist or 'main push CI' in checklist, 'destination CI gate missing'
assert 'Branch is `hackathon/ieee-climatechain-2026`' not in checklist, 'source branch leaked into destination release checklist'
freeze = (root / 'docs/submission-freeze.md').read_text()
assert 'destination main' in freeze, 'standalone freeze must use destination main'
assert 'Private-repo Skip is not a deployment' in freeze, 'release must fail closed before Pages publication'
assert '<html lang="en">' in html, 'standalone judge app must have English root language'
assert 'version-aware climate MRV evidence compiler' in html, 'IEEE app metadata missing'
workflow = (root / '.github/workflows/ci.yml').read_text()
assert '  public:' in workflow, 'make-public event must trigger full CI gate'
assert "github.event.repository.private == false" in workflow, 'Pages must remain off in Private repo'
assert "github.event_name == 'public'" in workflow, 'Pages must auto-activate on publication event'

