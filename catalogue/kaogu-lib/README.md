# lib.xiaohanchen.cc

Online PDF viewing catalogue for archaeology library materials.

The frontend is a static catalogue in `frontend/`. It reads metadata from `frontend/data/catalog.json` and displays PDFs from BunnyCDN.

## BunnyCDN Integration

PDFs are served from BunnyCDN:
- **CDN URL**: `https://xiaohanchen.b-cdn.net/`
- **Storage Zone**: xiaohanchen (ID: 1631827, Region: SG)
- **Pull Zone**: xiaohanchen (ID: 6104710)
- **PDF Directory**: `南水北调+河北_pdf/` in storage zone

See [HANDOFF.md](HANDOFF.md) for detailed integration documentation.

## Run Locally

```bash
python3 -m http.server 5182 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5182/frontend/
```

## Project Structure

```
lib.xiaohanchen.cc/
├── frontend/                    # Static HTML catalogue
│   ├── data/catalog.json        # PDF metadata and CDN URL
│   ├── src/app.js               # Frontend logic
│   └── src/styles.css           # Styles
├── bunny/                       # Local PDF files (gitignored)
│   └── all_pdf/                 # Source PDFs
├── bunny.json                   # BunnyCDN deployment config
├── HANDOFF.md                   # Integration documentation
└── README.md                    # This file
```

## Adding New PDFs

1. Upload PDF to BunnyCDN storage under `南水北调+河北_pdf/`
2. Add entry to `frontend/data/catalog.json`
3. Commit changes
