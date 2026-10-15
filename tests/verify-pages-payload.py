"""Fail closed if public Pages contains a file outside the reviewed demo allowlist."""
from pathlib import Path
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".pages-site")
expected = {
    ".nojekyll", "index.html", "naft-app.html", "favicon.svg",
    "assets/naft-logo.webp",
    "src/mrv-core.js", "src/methodology-packs.js", "src/mrv-compiler.js",
    "src/compiler-session.js", "src/compiler-demo.js", "src/reviewer-demo.js",
    "src/climatechain-testnet-record.js", "src/climatechain-demo.js",
    "src/mrv-ui.js", "src/climatechain-theme.css",
    "docs/assets/naft-climatechain-architecture.svg",
}
actual = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
assert actual == expected, f"PUBLIC_PAGES_PAYLOAD_MISMATCH: missing={sorted(expected - actual)} extra={sorted(actual - expected)}"
html = (root / "naft-app.html").read_text(encoding="utf-8")
index = (root / "index.html").read_text(encoding="utf-8")
for asset in expected:
    assert (root / asset).is_file(), f"missing staged asset: {asset}"
for filename in [p.removeprefix("src/") for p in expected if p.startswith("src/") and p.endswith(".js")]:
    assert f'src="{("src/" + filename)}"' in html, f"browser script omitted from HTML: {filename}"
assert 'href="src/climatechain-theme.css"' in html
assert 'naft-app.html' in index
assert 'href="assets/naft-logo.webp"' in html and 'href="assets/naft-logo.webp"' in index
assert 'assets/naft-logo.webp' in (root / 'src/climatechain-demo.js').read_text(encoding='utf-8')
assert 'assets/naft-logo.webp' in (root / 'src/mrv-ui.js').read_text(encoding='utf-8')
assert (root / 'assets/naft-logo.webp').read_bytes()[:4] == b'RIFF', 'logo must contain actual WebP bytes'
assert (root / ".nojekyll").exists()
print(f"PUBLIC_PAGES_PAYLOAD_PASS: exactly {len(actual)} vetted static files")
