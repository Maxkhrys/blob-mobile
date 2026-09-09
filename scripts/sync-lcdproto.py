"""Refresh the existing LCDPROTO vendor manifest from its immutable source SHA."""

import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = ROOT.parent / "LCDPROTO"
MANIFEST_PATH = ROOT / "vendor" / "lcdproto" / "manifest.json"
SHA = "7d26f8ba6b8709d38b071115a025ba0dfeaefbee"
BRANCH = "feat/grok-terra-orientation-synthesis-v1"

manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
if manifest.get("sha") != SHA or manifest.get("branch") != BRANCH:
    raise SystemExit("Refusing to sync: manifest is not pinned to the approved LCDPROTO source")

files = {}
for relative in sorted(manifest["files"]):
    raw = subprocess.check_output(["git", "-C", str(REPO), "show", f"{SHA}:{relative}"])
    destination = ROOT / "vendor" / "lcdproto" / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(raw)
    files[relative] = hashlib.sha256(raw).hexdigest()

manifest["repository"] = "Maxkhrys/LCDPROTO"
manifest["branch"] = BRANCH
manifest["sha"] = SHA
manifest["files"] = files
MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Vendored {len(files)} source files from {BRANCH} @ {SHA}")
