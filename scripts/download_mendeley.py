"""Download the Mendeley Ceramics dataset via the public API."""
import json, os, urllib.request, sys

DATASET_ID = "xzg7d8kygy"
API_URL = f"https://data.mendeley.com/api/datasets/{DATASET_ID}/files"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "datasets", "mendeley_ceramics")

os.makedirs(OUT_DIR, exist_ok=True)

print(f"Fetching file list from {API_URL} ...")
req = urllib.request.Request(API_URL, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=30) as resp:
    files = json.loads(resp.read())

print(f"Found {len(files)} files. Downloading to {OUT_DIR}/ ...")

for i, f in enumerate(files, 1):
    fname = f["filename"]
    url = f["content_details"]["download_url"]
    out_path = os.path.join(OUT_DIR, fname)
    if os.path.exists(out_path):
        print(f"  [{i}/{len(files)}] {fname} — already exists, skipping")
        continue
    try:
        urllib.request.urlretrieve(url, out_path)
        print(f"  [{i}/{len(files)}] {fname} ✓")
    except Exception as e:
        print(f"  [{i}/{len(files)}] {fname} FAILED: {e}", file=sys.stderr)

print("Done.")
