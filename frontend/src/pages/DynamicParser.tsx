import Head from "next/head";
import { FormEvent, Fragment, type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { SiteFrame } from "@/components/site-frame";
import type { Locale } from "@/lib/copy";
import { useLocale } from "@/lib/locale";
import { RoughMark } from "@/components/rough-mark";
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

function artifactSummary(artifacts: Artifact[] | undefined, locale: Locale = "zh") {
  if (!artifacts?.length) return "—";

  return artifacts
    .map((artifact) => {
      const name = artifact["器物名称"] || artifact["器型"] || (locale === "en" ? "unnamed object" : "未命名器物");
      const count = artifact["数量"];
      if (!count) return name;
      return locale === "en" ? `${name} × ${count}` : `${name}${count}件`;
    })
    .join(locale === "en" ? ", " : "、");
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
    parts.push(
      <RoughMark key={`m${i}-${mark.start}`} className="source-hit" type="highlight" color="#fecaca" padding={[1, 0]} iterations={1} delay={i * 60}>
        {text.slice(mark.start, mark.end)}
      </RoughMark>,
    );
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
  const { c, locale } = useLocale();
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
        throw new Error(payload.error || payload.detail || c.parser.http(response.status));
      }

      setResult(payload.data ?? null);
      setParsedText(trimmed);
      setSelected(0);
      setEditing(false);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : c.parser.failed);
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
        <title>{c.parser.title}</title>
        <meta name="description" content={c.parser.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <SiteFrame>
      <div className="tool-page-shell" data-accent="parser">
        <main className="tool-page-main">
          <ToolHero tool={tool} />

          <section className="tool-workbench-section">
            <div className="model-workbench parser-workbench">
              <section className="tool-panel model-panel">
                <div className="tool-panel-heading source-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">{showSource ? c.parser.sourceHeading : c.parser.inputHeading}</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      {showSource ? c.parser.sourceHelp : c.parser.inputHelp}
                    </p>
                  </div>
                  {showSource ? (
                    <button type="button" className="source-edit-button" onClick={() => setEditing(true)}>
                      {c.parser.editSource}
                    </button>
                  ) : null}
                </div>

                {showSource ? (
                  <div className="source-view" aria-label={c.parser.sourceAria}>
                    {segments.length ? renderSource() : <div className="source-gap">{parsedText}</div>}
                  </div>
                ) : (
                  <form className="parser-form" onSubmit={handleSubmit}>
                    <textarea
                      className="tool-textarea parser-textarea"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      spellCheck={false}
                      aria-label={c.parser.textAria}
                    />

                    <div className="actions">
                      <button type="submit" disabled={!text.trim() || state === "loading"}>
                        {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {state === "loading" ? c.parser.extracting : state === "done" ? c.parser.again : c.parser.extract}
                      </button>
                      {state === "done" ? (
                        <button type="button" className="source-cancel-button" onClick={() => setEditing(false)}>
                          {c.parser.back}
                        </button>
                      ) : null}
                    </div>
                  </form>
                )}
              </section>

              <section className="tool-panel model-panel parser-results-panel">
                <div className="tool-panel-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">{c.parser.results}</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      {c.parser.resultsHelp}
                    </p>
                  </div>
                </div>

                <div className="parser-result-body">
                  {state === "idle" ? (
                    <StateNotice kind="empty" title={c.parser.emptyTitle}>
                      {c.parser.emptyBody}
                    </StateNotice>
                  ) : null}

                  {state === "loading" ? (
                    <StateNotice kind="loading" title={c.parser.loadingTitle}>
                      {c.parser.loadingBody}
                    </StateNotice>
                  ) : null}

                  {state === "error" && error ? (
                    <StateNotice kind="error" title={c.parser.errorTitle}>
                      {error}. {c.parser.errorHint}
                    </StateNotice>
                  ) : null}

                  {state === "done" && result ? (
                    <>
                      <dl className="stats-grid parser-stats">
                        <div>
                          <dt>{c.parser.tombs}</dt>
                          <dd>{tombs.length}</dd>
                        </div>
                        <div>
                          <dt>{c.parser.artifacts}</dt>
                          <dd>{artifactCount}</dd>
                        </div>
                        <div>
                          <dt>{c.parser.located}</dt>
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
                                {c.parser.cols.map((col) => (
                                  <th key={col}>{col}</th>
                                ))}
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
                                  <td data-label={c.parser.cols[0]}>{formatValue(tomb["墓葬编号"])}</td>
                                  <td data-label={c.parser.cols[1]}>{formatValue(tomb["年代"])}</td>
                                  <td data-label={c.parser.cols[2]}>{formatValue(tomb["墓葬形制"])}</td>
                                  <td data-label={c.parser.cols[3]}>{formatValue(tomb["墓向"])}</td>
                                  <td data-label={c.parser.cols[4]}>{formatDimensions(tomb)}</td>
                                  <td data-label={c.parser.cols[5]}>{artifactSummary(tomb["随葬器物"], locale)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <StateNotice kind="empty" title={c.parser.noneTitle}>
                          {c.parser.noneBody}
                        </StateNotice>
                      )}

                      {selectedTomb ? (
                        <section className="evidence-card" aria-label={c.parser.check(formatValue(selectedTomb["墓葬编号"]))}>
                          <header>
                            <h3>{c.parser.check(formatValue(selectedTomb["墓葬编号"]))}</h3>
                            <span className={unverified || emptyCount || !selectedSegment ? "evidence-flag" : "evidence-ok"}>
                              {!selectedSegment
                                ? c.parser.missingTomb
                                : unverified
                                  ? c.parser.unverified(unverified)
                                  : emptyCount
                                    ? c.parser.partial(emptyCount)
                                    : c.parser.allFound}
                            </span>
                          </header>
                          {evidence.length ? (
                            <ul>
                              {evidence.map((item) => (
                                <li
                                  key={item.label}
                                  className={item.empty ? "is-empty" : item.found ? undefined : "is-missing"}
                                >
                                  <span>{c.parser.fields[item.label] ?? item.label}</span>
                                  <strong>{item.value}</strong>
                                  <em>{item.empty ? c.parser.notExtracted : item.found ? c.parser.inSource : c.parser.inferred}</em>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="evidence-empty">{c.parser.noFields}</p>
                          )}
                          {selectedTomb["随葬器物"]?.length ? (
                            <p className="evidence-artifacts">{c.parser.goods}{artifactSummary(selectedTomb["随葬器物"], locale)}</p>
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
                          {c.parser.download}
                        </button>
                      </div>

                      {result.markdown ? (
                        <details className="parser-details">
                          <summary>{c.parser.markdown}</summary>
                          <pre>{result.markdown}</pre>
                        </details>
                      ) : null}

                      <details className="parser-details">
                        <summary>{c.parser.json}</summary>
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
      </SiteFrame>
    </>
  );
}
