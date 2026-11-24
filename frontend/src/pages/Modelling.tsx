import Head from "next/head";
import { FormEvent, useEffect, useRef, useState } from "react";
import { SiteFrame } from "@/components/site-frame";
import { ResultViewer } from "@/components/result-viewer";
import { useLocale } from "@/lib/locale";
import { StateNotice } from "@/components/state-notice";
import { ToolHero } from "@/components/tool-hero";
import { resolveEndpoint } from "@/lib/api-client";
import { Box, FileUp, Loader2 } from "@/lib/icons";
import { getTool } from "@/lib/tools";

type RunState = "idle" | "loading" | "done" | "error";

type ModelStats = {
  total_tombs?: number;
  shape_count?: number;
  artifact_count?: number;
};

type GenerateResponse = {
  html?: string;
  url?: string;
  detail?: string;
  error?: string;
  stats?: ModelStats;
};

const demoModelUrl = "/models/tombs-3d-viewer.html";

function formatStat(value: number | undefined) {
  return Number.isFinite(value) ? String(value) : "—";
}

export default function ModellingPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { c } = useLocale();
  const [status, setStatus] = useState("");
  const [runState, setRunState] = useState<RunState>("idle");
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setRunState("loading");
    setStatus(c.model.uploading);
    setStats(null);
    setResultUrl(null);

    try {
      const body = new FormData();
      body.append("file", selectedFile);

      const response = await fetch(resolveEndpoint("/modelling/generate"), {
        method: "POST",
        body,
      });

      const payload = (await response.json()) as GenerateResponse;
      if (!response.ok || payload.error || payload.detail) {
        throw new Error(payload.error || payload.detail || c.model.http(response.status));
      }

      let targetUrl = payload.url;
      if (!targetUrl && payload.html) {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        const blob = new Blob([payload.html], { type: "text/html;charset=utf-8" });
        targetUrl = URL.createObjectURL(blob);
        objectUrlRef.current = targetUrl;
      }

      if (!targetUrl) {
        throw new Error(c.model.noUrl);
      }

      setResultUrl(targetUrl);
      setStats(payload.stats ?? null);
      setRunState("done");
      const count = payload.stats?.total_tombs;
      setStatus(count ? c.model.doneCount(count) : c.model.done);
    } catch (error) {
      const message = error instanceof Error ? error.message : c.model.failed;
      setRunState("error");
      setStats(null);
      setStatus(message);
    } finally {
      setIsGenerating(false);
    }
  }

  const tool = getTool("modelling");

  if (!tool) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{c.model.title}</title>
        <meta name="description" content={c.model.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <SiteFrame>
      <div className="tool-page-shell" data-accent="modelling">
        <main className="tool-page-main">
          <ToolHero tool={tool} />

          <section className="tool-workbench-section">
            <div className="model-workbench">
              <section className="tool-panel model-panel">
                <div className="tool-panel-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">{c.model.heading}</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      {c.model.help}
                    </p>
                  </div>
                </div>

                <form className="upload-form" onSubmit={handleSubmit}>
                  <label className="file-picker">
                    <span>{c.model.file}</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    />
                  </label>

                  <div className="actions">
                    <button type="submit" disabled={!selectedFile || isGenerating}>
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                      {isGenerating ? c.model.working : c.model.submit}
                    </button>
                    <a href={demoModelUrl} target="_blank" rel="noreferrer">
                      <Box className="h-4 w-4" />
                      {c.model.demo}
                    </a>
                  </div>
                </form>
              </section>

              <section className="tool-panel model-panel">
                <div className="tool-panel-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">{c.model.status}</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      {c.model.statusHelp}
                    </p>
                  </div>
                </div>

                <div className={`model-status-panel model-status-panel--${runState}`}>
                  {runState === "idle" ? (
                    <StateNotice kind="empty" title={c.model.emptyTitle} compact>
                      {c.model.emptyBody}
                    </StateNotice>
                  ) : null}

                  {runState === "error" ? (
                    <StateNotice kind="error" title={c.model.errorTitle} compact>
                      {status}
                    </StateNotice>
                  ) : runState === "loading" ? (
                    <StateNotice kind="loading" title={c.model.loadingTitle} compact>
                      {status}
                    </StateNotice>
                  ) : (
                    <p className="status">{status}</p>
                  )}

                  {stats ? (
                    <dl className="stats-grid model-stats-grid">
                      <div>
                        <dt>{c.model.tombs}</dt>
                        <dd>{formatStat(stats.total_tombs)}</dd>
                      </div>
                      <div>
                        <dt>{c.model.shapes}</dt>
                        <dd>{formatStat(stats.shape_count)}</dd>
                      </div>
                      <div>
                        <dt>{c.model.artifacts}</dt>
                        <dd>{formatStat(stats.artifact_count)}</dd>
                      </div>
                    </dl>
                  ) : null}

                  {resultUrl ? (
                    <a className="result-link" href={resultUrl} target="_blank" rel="noreferrer">
                      <Box className="h-4 w-4" />
                      {c.model.open}
                    </a>
                  ) : null}
                </div>
              </section>
            </div>
          </section>

          {resultUrl ? (
            <ResultViewer
              title={c.model.viewer}
              items={[{ key: "model", label: c.model.latest, url: resultUrl }]}
              activeKey="model"
              onSelect={() => undefined}
            />
          ) : null}
        </main>
      </div>
      </SiteFrame>
    </>
  );
}
