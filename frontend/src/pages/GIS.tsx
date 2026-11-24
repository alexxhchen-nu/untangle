import Head from "next/head";
import { FormEvent, useEffect, useRef, useState } from "react";
import { SiteFrame } from "@/components/site-frame";
import { ResultViewer } from "@/components/result-viewer";
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

const coordModeLabels: Record<CoordMode, string> = {
  auto: "自动检测",
  exact: "精确坐标",
  jitter: "站点中心偏移",
  none: "站点中心",
};

function formatStat(value: number | undefined) {
  return Number.isFinite(value) ? String(value) : "—";
}

function formatSiteCount(count: number | undefined) {
  return typeof count === "number" ? `${count} 座墓葬` : "站点地图";
}

function revokeUrls(urls: string[]) {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
}

export default function GISPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState("选择一个包含遗址、墓葬或坐标字段的 CSV 文件。");
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
    setStatus("正在上传并生成地图...");
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
        throw new Error(payload.error || payload.detail || `生成失败：HTTP ${response.status}`);
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
        throw new Error("后端没有返回可打开的地图 HTML。");
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
          ? `已生成 ${total} 座墓葬、${siteCount} 个站点地图。`
          : `已生成 ${siteCount} 个站点地图。`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败。";
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
        <title>遗址空间分析 · 考古工具箱</title>
        <meta name="description" content="上传墓葬或遗址 CSV，生成可打开的交互式 GIS 地图。" />
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
                    <h2 className="font-serif text-xl font-medium">生成地图</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      上传 CSV 后生成站点地图，地图会显示在下方。
                    </p>
                  </div>
                </div>

                <form className="upload-form" onSubmit={handleSubmit}>
                  <label className="file-picker">
                    <span>CSV 数据文件</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    />
                  </label>

                  <div className="gis-options">
                    <label className="field-group">
                      <span>坐标模式</span>
                      <select value={coordMode} onChange={(event) => setCoordMode(event.target.value as CoordMode)}>
                        <option value="auto">自动检测</option>
                        <option value="exact">使用精确坐标</option>
                        <option value="jitter">站点中心偏移</option>
                        <option value="none">站点中心</option>
                      </select>
                    </label>

                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={includeOverview}
                        onChange={(event) => setIncludeOverview(event.target.checked)}
                      />
                      <span>同时生成总览地图</span>
                    </label>
                  </div>

                  <div className="actions">
                    <button type="submit" disabled={!selectedFile || isGenerating}>
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                      {isGenerating ? "生成中..." : "生成地图"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="tool-panel model-panel">
                <div className="tool-panel-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">结果</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      生成后可以重新打开总览或单站点地图。
                    </p>
                  </div>
                </div>

                <div className={`model-status-panel gis-results-panel model-status-panel--${runState}`}>
                  {runState === "idle" ? (
                    <StateNotice kind="empty" title="还没有生成地图" compact>
                      生成后会显示墓葬总数、站点数、坐标模式，并保留总览和站点地图入口。
                    </StateNotice>
                  ) : null}

                  {runState === "error" ? (
                    <StateNotice kind="error" title="生成没有成功" compact>
                      {status}
                    </StateNotice>
                  ) : runState === "loading" ? (
                    <StateNotice kind="loading" title="正在生成" compact>
                      {status}
                    </StateNotice>
                  ) : (
                    <p className="status">{status}</p>
                  )}

                  {stats ? (
                    <dl className="stats-grid">
                      <div>
                        <dt>墓葬数</dt>
                        <dd>{formatStat(stats.total_tombs)}</dd>
                      </div>
                      <div>
                        <dt>站点数</dt>
                        <dd>{formatStat(stats.site_count ?? siteMaps.length)}</dd>
                      </div>
                      <div>
                        <dt>坐标模式</dt>
                        <dd>{coordModeLabels[stats.coord_mode ?? coordMode]}</dd>
                      </div>
                    </dl>
                  ) : null}

                  {overviewUrl ? (
                    <button type="button" className="result-link" onClick={() => setActiveMap("__overview")}>
                      <MapPinned className="h-4 w-4" />
                      查看总览地图
                    </button>
                  ) : null}

                  {siteMaps.length > 0 ? (
                    <div className="site-result-list">
                      <h3>站点地图</h3>
                      {siteMaps.map((site) => (
                        <div className="site-result-row" key={site.key}>
                          <div>
                            <strong>{site.key}</strong>
                            <span>{formatSiteCount(site.count)}</span>
                          </div>
                          <button
                            type="button"
                            aria-pressed={activeMap === site.key}
                            onClick={() => setActiveMap(site.key)}
                          >
                            <MapPinned className="h-4 w-4" />
                            查看地图
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
              title="地图"
              items={[
                ...(overviewUrl ? [{ key: "__overview", label: "总览", url: overviewUrl }] : []),
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
