import Head from "next/head";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ResultViewer } from "@/components/result-viewer";
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
  const [status, setStatus] = useState("选择一个墓葬 CSV 文件。");
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
    setStatus("正在上传并生成模型...");
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
        throw new Error(payload.error || payload.detail || `生成失败：HTTP ${response.status}`);
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
        throw new Error("后端没有返回 url 或 html。");
      }

      setResultUrl(targetUrl);
      setStats(payload.stats ?? null);
      setRunState("done");
      const count = payload.stats?.total_tombs;
      setStatus(count ? `已生成 ${count} 座墓葬模型，显示在下方。` : "模型已生成，显示在下方。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败。";
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
        <title>墓葬3D建模</title>
        <meta name="description" content="上传墓葬 CSV，生成可以旋转查看的墓葬三维模型。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="tool-page-shell">
        <main className="tool-page-main">
          <ToolHero tool={tool} />

          <section className="tool-workbench-section">
            <div className="model-workbench">
              <section className="tool-panel model-panel">
                <div className="tool-panel-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">生成模型</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      上传墓葬 CSV 后，模型会显示在下方。
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

                  <div className="actions">
                    <button type="submit" disabled={!selectedFile || isGenerating}>
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                      {isGenerating ? "生成中..." : "生成模型"}
                    </button>
                    <a href={demoModelUrl} target="_blank" rel="noreferrer">
                      <Box className="h-4 w-4" />
                      打开示例模型
                    </a>
                  </div>
                </form>
              </section>

              <section className="tool-panel model-panel">
                <div className="tool-panel-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">状态</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      生成完成后，模型显示在下方，也可以在新标签页打开。
                    </p>
                  </div>
                </div>

                <div className={`model-status-panel model-status-panel--${runState}`}>
                  {runState === "idle" ? (
                    <StateNotice kind="empty" title="还没有生成模型" compact>
                      生成后会显示墓葬数量、形制数量、器物记录，并保留最近模型入口。
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
                    <dl className="stats-grid model-stats-grid">
                      <div>
                        <dt>墓葬数</dt>
                        <dd>{formatStat(stats.total_tombs)}</dd>
                      </div>
                      <div>
                        <dt>形制数</dt>
                        <dd>{formatStat(stats.shape_count)}</dd>
                      </div>
                      <div>
                        <dt>器物记录</dt>
                        <dd>{formatStat(stats.artifact_count)}</dd>
                      </div>
                    </dl>
                  ) : null}

                  {resultUrl ? (
                    <a className="result-link" href={resultUrl} target="_blank" rel="noreferrer">
                      <Box className="h-4 w-4" />
                      在新标签页打开模型
                    </a>
                  ) : null}
                </div>
              </section>
            </div>
          </section>

          {resultUrl ? (
            <ResultViewer
              title="三维模型"
              items={[{ key: "model", label: "最近生成的模型", url: resultUrl }]}
              activeKey="model"
              onSelect={() => undefined}
            />
          ) : null}
        </main>
      </div>
    </>
  );
}
