import Head from "next/head";
import { FormEvent, useEffect, useRef, useState } from "react";
import { SiteFrame } from "@/components/site-frame";
import { ResultViewer } from "@/components/result-viewer";
import { useLocale } from "@/lib/locale";
import { StateNotice } from "@/components/state-notice";
import { ToolHero } from "@/components/tool-hero";
import { resolveEndpoint } from "@/lib/api-client";
import { FileUp, Loader2, MapPinned } from "@/lib/icons";
import { getTool } from "@/lib/tools";

type CoordMode = "auto" | "exact" | "jitter" | "none";
type RunState = "idle" | "loading" | "done" | "error";

type GISStats = {
  total_tombs?: number;
  site_count?: number;
  sites?: Record<string, number>;
  coord_mode?: CoordMode;
};

type GISResponse = {
  ok?: boolean;
  data?: {
    sites?: Record<string, string>;
    overview?: string | null;
    stats?: GISStats;
  };
  detail?: string;
  error?: string;
};

type SiteMapResult = {
  key: string;
  count?: number;
  url: string;
};

function formatStat(value: number | undefined) {
  return Number.isFinite(value) ? String(value) : "—";
}

function revokeUrls(urls: string[]) {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
}

export default function GISPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { c } = useLocale();
  const [status, setStatus] = useState("");
  const [runState, setRunState] = useState<RunState>("idle");
  const [isGenerating, setIsGenerating] = useState(false);
  const [coordMode, setCoordMode] = useState<CoordMode>("auto");
  const [includeOverview, setIncludeOverview] = useState(false);
  const [stats, setStats] = useState<GISStats | null>(null);
  const [siteMaps, setSiteMaps] = useState<SiteMapResult[]>([]);
  const [overviewUrl, setOverviewUrl] = useState<string | null>(null);
  const [activeMap, setActiveMap] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      revokeUrls(objectUrlsRef.current);
    };
  }, []);

  function replaceGeneratedUrls(nextUrls: string[]) {
    revokeUrls(objectUrlsRef.current);
    objectUrlsRef.current = nextUrls;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setRunState("loading");
    setStatus(c.gis.uploading);
    setStats(null);
    setSiteMaps([]);
    setOverviewUrl(null);

    try {
      const body = new FormData();
      body.append("file", selectedFile);
      body.append("overview", includeOverview ? "true" : "false");
      body.append("coord_mode", coordMode);

      const response = await fetch(resolveEndpoint("/gis/generate"), {
        method: "POST",
        body,
      });

      const payload = (await response.json()) as GISResponse;
      if (!response.ok || payload.error || payload.detail) {
        throw new Error(payload.error || payload.detail || c.gis.http(response.status));
      }

      const sites = payload.data?.sites ?? {};
      const generatedUrls: string[] = [];
      const nextSiteMaps = Object.entries(sites).map(([key, html]) => {
        const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
        generatedUrls.push(url);
        return {
          key,
          count: payload.data?.stats?.sites?.[key],
          url,
        };
      });

      let nextOverviewUrl: string | null = null;
      if (payload.data?.overview) {
        nextOverviewUrl = URL.createObjectURL(new Blob([payload.data.overview], { type: "text/html;charset=utf-8" }));
        generatedUrls.push(nextOverviewUrl);
      }

      if (!nextOverviewUrl && nextSiteMaps.length === 0) {
        throw new Error(c.gis.noHtml);
      }

      replaceGeneratedUrls(generatedUrls);
      setSiteMaps(nextSiteMaps);
      setOverviewUrl(nextOverviewUrl);
      setStats(payload.data?.stats ?? null);
      setRunState("done");

      setActiveMap(nextOverviewUrl ? "__overview" : nextSiteMaps[0]?.key ?? null);

      const total = payload.data?.stats?.total_tombs;
      const siteCount = payload.data?.stats?.site_count ?? nextSiteMaps.length;
      setStatus(
        total
          ? c.gis.doneBoth(total, siteCount)
          : c.gis.doneSites(siteCount),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : c.gis.failed;
      replaceGeneratedUrls([]);
      setRunState("error");
      setStats(null);
      setStatus(message);
    } finally {
      setIsGenerating(false);
    }
  }

  const tool = getTool("gis");

  if (!tool) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{c.gis.title}</title>
        <meta name="description" content={c.gis.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <SiteFrame>
      <div className="tool-page-shell" data-accent="gis">
        <main className="tool-page-main">
          <ToolHero tool={tool} />

          <section className="tool-workbench-section">
            <div className="model-workbench gis-workbench">
              <section className="tool-panel model-panel">
                <div className="tool-panel-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">{c.gis.heading}</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      {c.gis.help}
                    </p>
                  </div>
                </div>

                <form className="upload-form" onSubmit={handleSubmit}>
                  <label className="file-picker">
                    <span>{c.gis.file}</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    />
                  </label>

                  <div className="gis-options">
                    <label className="field-group">
                      <span>{c.gis.coord}</span>
                      <select value={coordMode} onChange={(event) => setCoordMode(event.target.value as CoordMode)}>
                        <option value="auto">{c.gis.modes.auto}</option>
                        <option value="exact">{c.gis.modes.exact}</option>
                        <option value="jitter">{c.gis.modes.jitter}</option>
                        <option value="none">{c.gis.modes.none}</option>
                      </select>
                    </label>

                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={includeOverview}
                        onChange={(event) => setIncludeOverview(event.target.checked)}
                      />
                      <span>{c.gis.overviewToggle}</span>
                    </label>
                  </div>

                  <div className="actions">
                    <button type="submit" disabled={!selectedFile || isGenerating}>
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                      {isGenerating ? c.gis.working : c.gis.submit}
                    </button>
                  </div>
                </form>
              </section>

              <section className="tool-panel model-panel">
                <div className="tool-panel-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">{c.gis.results}</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      {c.gis.resultsHelp}
                    </p>
                  </div>
                </div>

                <div className={`model-status-panel gis-results-panel model-status-panel--${runState}`}>
                  {runState === "idle" ? (
                    <StateNotice kind="empty" title={c.gis.emptyTitle} compact>
                      {c.gis.emptyBody}
                    </StateNotice>
                  ) : null}

                  {runState === "error" ? (
                    <StateNotice kind="error" title={c.gis.errorTitle} compact>
                      {status}
                    </StateNotice>
                  ) : runState === "loading" ? (
                    <StateNotice kind="loading" title={c.gis.loadingTitle} compact>
                      {status}
                    </StateNotice>
                  ) : (
                    <p className="status">{status}</p>
                  )}

                  {stats ? (
                    <dl className="stats-grid">
                      <div>
                        <dt>{c.gis.tombs}</dt>
                        <dd>{formatStat(stats.total_tombs)}</dd>
                      </div>
                      <div>
                        <dt>{c.gis.sites}</dt>
                        <dd>{formatStat(stats.site_count ?? siteMaps.length)}</dd>
                      </div>
                      <div>
                        <dt>{c.gis.mode}</dt>
                        <dd>{c.gis.modes[stats.coord_mode ?? coordMode]}</dd>
                      </div>
                    </dl>
                  ) : null}

                  {overviewUrl ? (
                    <button type="button" className="result-link" onClick={() => setActiveMap("__overview")}>
                      <MapPinned className="h-4 w-4" />
                      {c.gis.viewOverview}
                    </button>
                  ) : null}

                  {siteMaps.length > 0 ? (
                    <div className="site-result-list">
                      <h3>{c.gis.siteMaps}</h3>
                      {siteMaps.map((site) => (
                        <div className="site-result-row" key={site.key}>
                          <div>
                            <strong>{site.key}</strong>
                            <span>{typeof site.count === "number" ? c.gis.tombCount(site.count) : c.gis.siteMap}</span>
                          </div>
                          <button
                            type="button"
                            aria-pressed={activeMap === site.key}
                            onClick={() => setActiveMap(site.key)}
                          >
                            <MapPinned className="h-4 w-4" />
                            {c.gis.viewMap}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </section>

          {overviewUrl || siteMaps.length > 0 ? (
            <ResultViewer
              title={c.gis.viewer}
              items={[
                ...(overviewUrl ? [{ key: "__overview", label: c.gis.overview, url: overviewUrl }] : []),
                ...siteMaps.map((site) => ({
                  key: site.key,
                  label: site.key,
                  url: site.url,
                  meta: typeof site.count === "number" ? `${site.count}` : undefined,
                })),
              ]}
              activeKey={activeMap}
              onSelect={setActiveMap}
            />
          ) : null}
        </main>
      </div>
      </SiteFrame>
    </>
  );
}
