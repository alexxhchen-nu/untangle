# Archaeo Doc Parser — Obsidian Plugin

Parse archaeological documents (PDF, images, Office files) to Markdown directly inside Obsidian via [MinerU](https://mineru.net) cloud API.

## Features

- **Right-click** any PDF/image/Office file in vault → "Parse to Markdown"
- **Command palette** (`Ctrl/Cmd+P`) → "Parse current document" or "Parse from URL"
- **Progress notifications** — real-time parsing status
- **Auto-save** — results saved as new Markdown notes
- **Chinese OCR** — optimized for classical Chinese archaeological texts
- Free tier works out of the box (no API key needed)

## Install

### From Community Plugins (when published)

1. Settings → Community Plugins → Browse
2. Search "Archaeo Doc Parser"
3. Install → Enable

### Manual Install

1. Download `main.js`, `manifest.json` from [Releases](https://github.com/alexxhchen-nu/obsidian-archaeo-doc-parser/releases)
2. Copy to `<vault>/.obsidian/plugins/archaeo-doc-parser/`
3. Settings → Community Plugins → Enable "Archaeo Doc Parser"

## Usage

1. Open any PDF, scan, or Office file in your vault
2. Right-click → "Parse to Markdown" (or `Ctrl/Cmd+P` → "Parse current document")
3. Wait for parsing to complete (progress shown in notification)
4. Parsed Markdown note opens automatically

### Parse from URL

`Ctrl/Cmd+P` → "Parse document from URL" → paste URL → Enter

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| MinerU token | (empty) | Pro API token. Leave empty for free tier. |
| Default language | `ch` | OCR language hint |
| Output folder | `parsed` | Where to save parsed notes |
| Auto-open result | on | Open note after parsing |

## Free vs Pro

| | Free | Pro |
|---|---|---|
| Max file size | 10 MB | 200 MB |
| Max pages | 20 | 200 |
| Output | Markdown | Markdown, JSON, DOCX, HTML, LaTeX |
| API key | None needed | [mineru.net](https://mineru.net) → API管理 |

## Supported Formats

**Documents**: PDF, DOCX, PPTX, XLSX
**Images**: PNG, JPG, JPEG, JP2, WebP, GIF, BMP

## License

MIT
