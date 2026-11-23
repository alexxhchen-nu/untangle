# Kaogu Tools

A catalog of tools for archaeology literature analysis and data collection, occasionally with 3D visualization.

This repository is a monorepo. The Kaogu Tools app lives at the root (`frontend/`, `backend/`, `shared/`); the related archaeology projects live in the folders listed under [Monorepo layout](#monorepo-layout).

## Quick start (root app)

Python 3.12 (see `mise.toml`), [uv](https://docs.astral.sh/uv/) and [pnpm](https://pnpm.io/) are expected.

Backend (FastAPI) on http://127.0.0.1:8000, health check at `/health`:

```bash
cp .env.example .env
uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Frontend (Next.js) on http://localhost:3000. First put this line in `frontend/.env.local` so the pages call the local backend:

```dotenv
NEXT_PUBLIC_KAOGU_API_BASE_URL=http://localhost:8000
```

Then:

```bash
cd frontend
pnpm install
pnpm dev
```

Tests, run from the repository root:

```bash
uv run python -m unittest shared/tests/test_dynamic_parser.py
```

Backend routes: `GET /health`, `POST /dynamic-parser/parse`, `POST /modelling/generate`, `POST /gis/generate`.

## Stack

1. Frontend: Next.js
2. Backend: Python
3. Data: BunnyCDN, Cloudflare R2
4. API: FastAPI
5. LLM: Xiaomi Token Plan (China), Codex 5.5, Grok 4.3; allowing BYOK
6. Agentic tooling: CrewAI
7. Deployment
   - Frontend: Netlify / Railway
   - Backend: Railway
   - DNS: Cloudflare
   - Caching: BunnyCDN

## Root app layout

| Path | What it is |
|------|------------|
| `frontend/` | Next.js app: DynamicParser, Modelling, GIS and Library pages |
| `backend/` | FastAPI API: tomb report parser, 3D modelling, GIS map generation |
| `shared/data_catalogue.json` | Data catalogue references to BunnyCDN and Cloudflare R2 |
| `shared/tests/` | Backend tests |
| `.env.example` | Backend environment variables (copy to `.env`) |

## Monorepo layout

In November 2026 the related archaeology repos under `alexxhchen-nu` were imported here with full git history (`git subtree`). The original repositories were not deleted.

| Folder | Origin repo | What it is |
|--------|-------------|------------|
| `frontend/`, `backend/`, `shared/` | `kaogu-tools` (this repo) | Next.js + FastAPI toolbox: DynamicParser, GIS, modelling, library UI |
| `parsers/archaeo-doc-parser/` | [archaeo-doc-parser](https://github.com/alexxhchen-nu/archaeo-doc-parser) | MCP server: MinerU document-to-Markdown plus tomb parsing |
| `parsers/archaeo-tomb-parser/` | [archaeo-tomb-parser](https://github.com/alexxhchen-nu/archaeo-tomb-parser) | Tomb parser monorepo: MCP server, Obsidian plugin sources, agent skill, examples |
| `plugins/obsidian-archaeo-doc-parser/` | [obsidian-archaeo-doc-parser](https://github.com/alexxhchen-nu/obsidian-archaeo-doc-parser) | Obsidian plugin: parse PDFs/images/Office to Markdown via MinerU (release v0.1.0 remains on the origin repo) |
| `plugins/obsidian-archaeo-tombs/` | [obsidian-archaeo-tombs](https://github.com/alexxhchen-nu/obsidian-archaeo-tombs) | Obsidian plugin: extract structured tomb data (release v1.0.0 remains on the origin repo) |
| `web/kaogu-api/` | [kaogu-api](https://github.com/alexxhchen-nu/kaogu-api) | Early FastAPI tomb-parser API (Dockerfile / Fly config) |
| `web/kaogu-frontend/` | [kaogu-frontend](https://github.com/alexxhchen-nu/kaogu-frontend) | Early Vite/React tomb-parser frontend |
| `web/vps-kaogu-app/` | [vps-kaogu-app](https://github.com/alexxhchen-nu/vps-kaogu-app) | Combined frontend + improved parser backend and VPS deploy workflow |
| `catalogue/kaogu-lib/` | [kaogu-lib](https://github.com/alexxhchen-nu/kaogu-lib) | Static PDF catalogue (“文献检索厅”) for BunnyCDN |
| `research/llm-kaogu/` | [llm-kaogu](https://github.com/alexxhchen-nu/llm-kaogu) | Research workspace: OCR pipelines, GIS, clustering, dating rules, schema |
| `research/kaogu-db/` | [kaogu-db](https://github.com/alexxhchen-nu/kaogu-db) | SQLite schema, CSV import, Leaflet map, project status notes |
| `pipelines/tomb-archaeology-pipeline/` | [tomb-archaeology-pipeline](https://github.com/alexxhchen-nu/tomb-archaeology-pipeline) | Five-layer ontology and LLM tomb-extraction pipeline |
| `pipelines/kaogu-dynasty-feature-pipeline-qodercli/` | [kaogu-dynasty-feature-pipeline-qodercli](https://github.com/alexxhchen-nu/kaogu-dynasty-feature-pipeline-qodercli) | Notebook pipeline for dynasty feature discovery |
| `pipelines/archaeological-count-extractor/` | [archaeological-count-extractor](https://github.com/alexxhchen-nu/archaeological-count-extractor) | Streamlit regex tool for count features in excavation reports |

Each imported folder keeps its own dependencies and setup (and, where it had one, its own README); run it from inside that folder.

## Secrets

Secrets found in some origin histories (API keys and CDN credentials) were replaced with `REDACTED` before import. This repository is public; do not put real keys back into the tree. Local keys go in `.env`, which git ignores.
