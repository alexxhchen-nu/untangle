# lib.xiaohanchen.cc

Online PDF viewing catalogue for archaeology library materials.

The current frontend is a static catalogue in `frontend/`. It reads metadata from `frontend/data/catalog.json` and displays PDFs from the configured Bunny CDN base URL.

Run locally:

```bash
python3 -m http.server 5182 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5182/frontend/
```

PDF files and Bunny sync output are intentionally ignored for now.
