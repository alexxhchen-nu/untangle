# Lib Xiaohanchen PDF Catalogue

A static PDF viewing catalogue. It loads metadata from `data/catalog.json` and displays PDFs from the configured CDN URL.

## Run locally

```bash
python3 -m http.server 5182 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5182/frontend/
```

## Configure PDF URLs

Edit `data/catalog.json`:

```json
{
  "pdfBaseUrl": "https://YOUR-BUNNY-CDN-HOSTNAME/all_pdf/"
}
```

Each book can either use `filename` with `pdfBaseUrl`, or override the final URL with a `pdfUrl` field.
