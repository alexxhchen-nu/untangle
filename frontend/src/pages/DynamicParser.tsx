import Head from "next/head";
import { FormEvent, Fragment, type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { StateNotice } from "@/components/state-notice";
import { ToolHero } from "@/components/tool-hero";
import { resolveEndpoint } from "@/lib/api-client";
import { Download, Loader2, Send } from "@/lib/icons";
import { getTool } from "@/lib/tools";
import { findMarks, segmentSource, valueAppears, type FieldEvidence } from "@/lib/source-links";

type RunState = "idle" | "loading" | "done" | "error";

type Artifact = {
  "器物编号"?: string;
  "器物名称"?: string;
  "材质"?: string;
  "器型"?: string;
  "数量"?: number | string;
  "特征描述"?: string;
};

type TombRecord = {
  "墓葬编号"?: string;
  "年代"?: string;
  "墓向"?: string;
  "墓葬形制"?: string;
  "墓口长"?: number | string | null;
  "墓口宽"?: number | string | null;
  "墓深"?: number | string | null;
  "发掘位置"?: string;
  "层位"?: string;
  "备注"?: string;
  "随葬器物"?: Artifact[];
};

type ParserData = {
  json?: {
    "墓葬列表"?: TombRecord[];
    "原始文本片段"?: string;
  };
  markdown?: string;
  csv?: string;
};

type ParserResponse = {
  ok?: boolean;
  data?: ParserData;
  detail?: string;
  error?: string;
};

const exampleInput = `# 战国墓葬

## M1
M1位于东区，墓向南北向。墓口长2.5米，宽1.2米，深3.0米。
埋葬方式土坑竖穴墓。封土直径4米。保存状态较好。出土器物2件：陶罐1件，铜剑1件。

## M2
M2位于M1西侧，墓向185°。墓口长3.1米，宽1.6米，深2.4米。
土坑竖穴墓，被盗扰。出土器物3件：陶鼎1件，陶壶2件。

## M5
M5位于西区，打破M2。墓口长1.9米，宽0.9米。
土坑竖穴墓。出土铜镜1件。`;

function formatValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatDimensions(tomb: TombRecord) {
  const length = formatValue(tomb["墓口长"]);
  const width = formatValue(tomb["墓口宽"]);
  const depth = formatValue(tomb["墓深"]);

  if (length === "—" && width === "—" && depth === "—") {
    return "—";
  }

  return `${length} × ${width} × ${depth}`;
}

function artifactSummary(artifacts: Artifact[] | undefined) {
  if (!artifacts?.length) return "—";

  return artifacts
    .map((artifact) => {
      const name = artifact["器物名称"] || artifact["器型"] || "未命名器物";
      const count = artifact["数量"];
      return count ? `${name}${count}件` : name;
    })
    .join("、");
}

function evidenceFor(tomb: TombRecord, passage: string): (FieldEvidence & { empty: boolean })[] {
  const fields: { label: string; value: string; numeric?: boolean }[] = [
    { label: "年代", value: formatValue(tomb["年代"]) },
    { label: "形制", value: formatValue(tomb["墓葬形制"]) },
    { label: "墓向", value: formatValue(tomb["墓向"]) },
    { label: "墓口长", value: formatValue(tomb["墓口长"]), numeric: true },
    { label: "墓口宽", value: formatValue(tomb["墓口宽"]), numeric: true },
    { label: "墓深", value: formatValue(tomb["墓深"]), numeric: true },
  ];

  return fields.map((field) => ({
    label: field.label,
    value: field.value,
    found: field.value !== "—" && valueAppears(passage, field.value, field.numeric),
    empty: field.value === "—",
  }));
}

function markTerms(tomb: TombRecord) {
  return [
    { value: formatValue(tomb["墓葬编号"]) },
    { value: formatValue(tomb["年代"]) },
    { value: formatValue(tomb["墓葬形制"]) },
    { value: formatValue(tomb["墓向"]) },
    { value: formatValue(tomb["墓口长"]), numeric: true },
    { value: formatValue(tomb["墓口宽"]), numeric: true },
    { value: formatValue(tomb["墓深"]), numeric: true },
    ...(tomb["随葬器物"] ?? []).map((a) => ({ value: a["器物名称"] ?? "" })),
  ];
}

function MarkedPassage({ text, tomb }: { text: string; tomb: TombRecord }) {
  const marks = findMarks(text, markTerms(tomb));
  const parts: ReactElement[] = [];
  let cursor = 0;

  marks.forEach((mark, i) => {
    if (mark.start > cursor) parts.push(<Fragment key={`t${i}`}>{text.slice(cursor, mark.start)}</Fragment>);
    parts.push(<mark key={`m${i}`}>{text.slice(mark.start, mark.end)}</mark>);
    cursor = mark.end;
  });
  if (cursor < text.length) parts.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);

  return <>{parts}</>;
}

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `kaogu-dynamic-parser-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function DynamicParserPage() {
  const [text, setText] = useState(exampleInput);
  const [parsedText, setParsedText] = useState("");
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParserData | null>(null);
  const [editing, setEditing] = useState(true);
  const [selected, setSelected] = useState(0);
  const sourceRefs = useRef<Record<number, HTMLElement | null>>({});
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  const tool = getTool("dynamic-parser");
  const tombs = useMemo(() => result?.json?.["墓葬列表"] ?? [], [result]);
  const artifactCount = useMemo(
    () => tombs.reduce((total, tomb) => total + (tomb["随葬器物"]?.length ?? 0), 0),
    [tombs],
  );
  const segments = useMemo(
    () => segmentSource(parsedText, tombs.map((t) => t["墓葬编号"] ?? "")),
    [parsedText, tombs],
  );
  const segmentByTomb = useMemo(() => {
    const map = new Map<number, (typeof segments)[number]>();
    segments.forEach((seg) => map.set(seg.tombIndex, seg));
    return map;
  }, [segments]);

  const selectedTomb = tombs[selected];
  const selectedSegment = segmentByTomb.get(selected);
  const selectedPassage = selectedSegment ? parsedText.slice(selectedSegment.start, selectedSegment.end) : "";
  const evidence = selectedTomb ? evidenceFor(selectedTomb, selectedPassage) : [];
  const unverified = evidence.filter((e) => !e.found && !e.empty).length;
  const emptyCount = evidence.filter((e) => e.empty).length;

  useEffect(() => {
    sourceRefs.current[selected]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    rowRefs.current[selected]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  if (!tool) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();

    if (!trimmed || state === "loading") {
      return;
    }

    setState("loading");
    setError(null);
    setResult(null);

    try {
      const response = await fetch(resolveEndpoint("/dynamic-parser/parse"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, report_name: "manual-input" }),
      });
      const payload = (await response.json()) as ParserResponse;

      if (!response.ok || payload.error || payload.detail) {
        throw new Error(payload.error || payload.detail || `抽取失败：HTTP ${response.status}`);
      }

      setResult(payload.data ?? null);
      setParsedText(trimmed);
      setSelected(0);
      setEditing(false);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "墓葬文本抽取失败。");
      setState("error");
    }
  }

  function renderSource() {
    const blocks: ReactElement[] = [];
    let cursor = 0;

    segments.forEach((seg) => {
      if (parsedText.slice(cursor, seg.start).trim()) {
        blocks.push(
          <div key={`gap-${cursor}`} className="source-gap">
            {parsedText.slice(cursor, seg.start).trim()}
          </div>,
        );
      }
      const tomb = tombs[seg.tombIndex];
      const active = seg.tombIndex === selected;
      blocks.push(
        <button
          type="button"
          key={`seg-${seg.tombIndex}`}
          ref={(el) => {
            sourceRefs.current[seg.tombIndex] = el;
          }}
          className={`source-segment${active ? " is-active" : ""}`}
          aria-pressed={active}
          onClick={() => setSelected(seg.tombIndex)}
        >
          <span className="source-segment-tag">{tomb["墓葬编号"]}</span>
          <span className="source-segment-text">
            {active ? (
              <MarkedPassage text={parsedText.slice(seg.start, seg.end).trimEnd()} tomb={tomb} />
            ) : (
              parsedText.slice(seg.start, seg.end).trimEnd()
            )}
          </span>
        </button>,
      );
      cursor = seg.end;
    });

    if (parsedText.slice(cursor).trim()) {
      blocks.push(
        <div key="gap-end" className="source-gap">
          {parsedText.slice(cursor).trim()}
        </div>,
      );
    }

    return blocks;
  }

  const showSource = state === "done" && !editing;

  return (
    <>
      <Head>
        <title>墓葬文本抽取 · 考古工具箱</title>
        <meta name="description" content="从墓葬报告文本中抽取墓葬、尺寸与随葬器物字段。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="tool-page-shell">
        <main className="tool-page-main">
          <ToolHero tool={tool} />

          <section className="tool-workbench-section">
            <div className="model-workbench parser-workbench">
              <section className="tool-panel model-panel">
                <div className="tool-panel-heading source-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">{showSource ? "原文对照" : "输入文本"}</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      {showSource
                        ? "点任一段落或右侧表格行，两边会同步定位；红色标记是抽取到的字段在原文中的位置。"
                        : "粘贴墓葬段落、Markdown 或发掘简报正文。"}
                    </p>
                  </div>
                  {showSource ? (
                    <button type="button" className="source-edit-button" onClick={() => setEditing(true)}>
                      编辑原文
                    </button>
                  ) : null}
                </div>

                {showSource ? (
                  <div className="source-view" aria-label="原文对照">
                    {segments.length ? renderSource() : <div className="source-gap">{parsedText}</div>}
                  </div>
                ) : (
                  <form className="parser-form" onSubmit={handleSubmit}>
                    <textarea
                      className="tool-textarea parser-textarea"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      spellCheck={false}
                      aria-label="墓葬报告文本"
                    />

                    <div className="actions">
                      <button type="submit" disabled={!text.trim() || state === "loading"}>
                        {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {state === "loading" ? "抽取中..." : state === "done" ? "重新抽取" : "抽取墓葬信息"}
                      </button>
                      {state === "done" ? (
                        <button type="button" className="source-cancel-button" onClick={() => setEditing(false)}>
                          返回对照
                        </button>
                      ) : null}
                    </div>
                  </form>
                )}
              </section>

              <section className="tool-panel model-panel parser-results-panel">
                <div className="tool-panel-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">抽取结果</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      结果可继续导出为 CSV，用于三维建模或 GIS 分析。
                    </p>
                  </div>
                </div>

                <div className="parser-result-body">
                  {state === "idle" ? (
                    <StateNotice kind="empty" title="还没有抽取结果">
                      在左边粘贴墓葬段落，点「抽取墓葬信息」。结果会显示成墓葬表，并和原文逐段对照。
                    </StateNotice>
                  ) : null}

                  {state === "loading" ? (
                    <StateNotice kind="loading" title="正在抽取">
                      后端正在按墓葬编号切分原文、抽取字段，通常几秒钟内完成。
                    </StateNotice>
                  ) : null}

                  {state === "error" && error ? (
                    <StateNotice kind="error" title="抽取没有成功">
                      {error}。确认后端在运行（127.0.0.1:8000），然后再试一次。
                    </StateNotice>
                  ) : null}

                  {state === "done" && result ? (
                    <>
                      <dl className="stats-grid parser-stats">
                        <div>
                          <dt>墓葬数</dt>
                          <dd>{tombs.length}</dd>
                        </div>
                        <div>
                          <dt>器物记录</dt>
                          <dd>{artifactCount}</dd>
                        </div>
                        <div>
                          <dt>原文定位</dt>
                          <dd>
                            {segments.length}/{tombs.length}
                          </dd>
                        </div>
                      </dl>

                      {tombs.length > 0 ? (
                        <div className="parser-table-wrap">
                          <table className="parser-table">
                            <thead>
                              <tr>
                                <th>编号</th>
                                <th>年代</th>
                                <th>形制</th>
                                <th>墓向</th>
                                <th>尺寸 长×宽×深</th>
                                <th>随葬器物</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tombs.map((tomb, index) => (
                                <tr
                                  key={`${tomb["墓葬编号"] ?? "tomb"}-${index}`}
                                  ref={(el) => {
                                    rowRefs.current[index] = el;
                                  }}
                                  className={index === selected ? "is-selected" : undefined}
                                  tabIndex={0}
                                  aria-selected={index === selected}
                                  onClick={() => setSelected(index)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      setSelected(index);
                                    }
                                    if (event.key === "ArrowDown") {
                                      event.preventDefault();
                                      setSelected((i) => Math.min(i + 1, tombs.length - 1));
                                      rowRefs.current[Math.min(index + 1, tombs.length - 1)]?.focus();
                                    }
                                    if (event.key === "ArrowUp") {
                                      event.preventDefault();
                                      setSelected((i) => Math.max(i - 1, 0));
                                      rowRefs.current[Math.max(index - 1, 0)]?.focus();
                                    }
                                  }}
                                >
                                  <td>{formatValue(tomb["墓葬编号"])}</td>
                                  <td>{formatValue(tomb["年代"])}</td>
                                  <td>{formatValue(tomb["墓葬形制"])}</td>
                                  <td>{formatValue(tomb["墓向"])}</td>
                                  <td>{formatDimensions(tomb)}</td>
                                  <td>{artifactSummary(tomb["随葬器物"])}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <StateNotice kind="empty" title="没有识别到墓葬">
                          原文里要有「## M1」这样的墓葬编号标题，或「M1位于……」这样的描述句。
                        </StateNotice>
                      )}

                      {selectedTomb ? (
                        <section className="evidence-card" aria-label={`${selectedTomb["墓葬编号"]} 字段核对`}>
                          <header>
                            <h3>{formatValue(selectedTomb["墓葬编号"])} 字段核对</h3>
                            <span className={unverified || emptyCount || !selectedSegment ? "evidence-flag" : "evidence-ok"}>
                              {!selectedSegment
                                ? "原文中未找到这座墓"
                                : unverified
                                  ? `${unverified} 项在原文中找不到，请人工核对`
                                  : emptyCount
                                    ? `已抽取字段都能在原文中找到 · ${emptyCount} 项未抽取`
                                    : "所有字段都能在原文中找到"}
                            </span>
                          </header>
                          {evidence.length ? (
                            <ul>
                              {evidence.map((item) => (
                                <li
                                  key={item.label}
                                  className={item.empty ? "is-empty" : item.found ? undefined : "is-missing"}
                                >
                                  <span>{item.label}</span>
                                  <strong>{item.value}</strong>
                                  <em>{item.empty ? "未抽取，看原文补" : item.found ? "原文有" : "推断或待核"}</em>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="evidence-empty">这座墓没有抽取到可核对的字段。</p>
                          )}
                          {selectedTomb["随葬器物"]?.length ? (
                            <p className="evidence-artifacts">随葬器物：{artifactSummary(selectedTomb["随葬器物"])}</p>
                          ) : null}
                        </section>
                      ) : null}

                      <div className="parser-result-actions">
                        <button
                          type="button"
                          disabled={!result.csv}
                          onClick={() => {
                            if (result.csv) downloadCsv(result.csv);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          下载 CSV
                        </button>
                      </div>

                      {result.markdown ? (
                        <details className="parser-details">
                          <summary>Markdown 预览</summary>
                          <pre>{result.markdown}</pre>
                        </details>
                      ) : null}

                      <details className="parser-details">
                        <summary>JSON 预览</summary>
                        <pre>{JSON.stringify(result.json ?? result, null, 2)}</pre>
                      </details>
                    </>
                  ) : null}
                </div>
              </section>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
