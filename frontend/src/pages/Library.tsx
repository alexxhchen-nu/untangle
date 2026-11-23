import fs from "node:fs/promises"
import path from "node:path"
import Head from "next/head"
import type { GetStaticProps, InferGetStaticPropsType } from "next"
import { useMemo, useState } from "react"
import { StateNotice } from "@/components/state-notice"
import { ToolHero } from "@/components/tool-hero"
import { ChevronRight } from "@/lib/icons"
import { getTool } from "@/lib/tools"

type SeriesId = "all" | "nsbd" | "hebei"
type BookSeriesId = Exclude<SeriesId, "all">

type Book = {
  id: string
  series: BookSeriesId
  title: string
  filename: string
  markdownFilename?: string
  csvFilename?: string
  tags: string[]
  description: string
}

type Catalogue = {
  _meta: {
    description: string
    version: string
    lastUpdated: string
    sources: {
      pdf: string
      parsing: string
    }
  }
  baseUrls: {
    pdf: string
    markdown: string
    csv: string
  }
  seriesMeta: Record<
    BookSeriesId,
    {
      label: string
      color: string
      description: string
    }
  >
  books: Book[]
}

const seriesOrder: SeriesId[] = ["all", "nsbd", "hebei"]

function buildAssetUrl(baseUrl: string, filename?: string) {
  if (!filename) {
    return null
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  return `${encodeURI(normalizedBase)}${encodeURIComponent(filename)}`
}

export const getStaticProps: GetStaticProps<{ catalogue: Catalogue }> = async () => {
  const cataloguePath = path.join(process.cwd(), "..", "shared", "data_catalogue.json")
  const raw = await fs.readFile(cataloguePath, "utf8")
  const catalogue = JSON.parse(raw) as Catalogue

  return {
    props: {
      catalogue,
    },
  }
}

export default function LibraryPage({
  catalogue,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const [query, setQuery] = useState("")
  const [activeSeries, setActiveSeries] = useState<SeriesId>("all")
  const [expandedBookIds, setExpandedBookIds] = useState<Set<string>>(
    () => new Set(catalogue.books[0]?.id ? [catalogue.books[0].id] : []),
  )

  const visibleBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return catalogue.books.filter((book) => {
      const matchesSeries = activeSeries === "all" || book.series === activeSeries
      if (!matchesSeries) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const haystack = [book.title, book.description, ...book.tags].join(" ").toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [activeSeries, catalogue.books, query])

  const seriesDescription =
    activeSeries === "all"
      ? catalogue._meta.description
      : catalogue.seriesMeta[activeSeries].description
  const tool = getTool("library")

  function toggleBook(bookId: string) {
    setExpandedBookIds((current) => {
      const next = new Set(current)

      if (next.has(bookId)) {
        next.delete(bookId)
      } else {
        next.add(bookId)
      }

      return next
    })
  }

  if (!tool) {
    return null
  }

  return (
    <>
      <Head>
        <title>资料库检索 · 考古工具箱</title>
        <meta
          name="description"
          content="考古文献目录，集中查看 PDF、Markdown 解析结果与 CSV 数据。"
        />
      </Head>

      <div className="tool-page-shell library-page">
        <main className="tool-page-main">
          <ToolHero tool={tool} />

          <section className="tool-workbench-section">
            <div className="library-workbench">
              <aside className="tool-panel library-controls" aria-label="资料库筛选">
                <div className="tool-panel-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">筛选</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      {seriesDescription}
                    </p>
                  </div>
                </div>

                <label className="search-field library-search">
                  <span>检索标题、标签与摘要</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="例如：战国 / 唐县 / 墓地"
                  />
                </label>

                <div className="filters library-filters" aria-label="系列筛选">
                  {seriesOrder.map((series) => {
                    const isActive = activeSeries === series
                    const label = series === "all" ? "全部目录" : catalogue.seriesMeta[series].label

                    return (
                      <button
                        key={series}
                        type="button"
                        className={`filter ${isActive ? "is-active" : ""}`}
                        data-series={series}
                        aria-pressed={isActive}
                        onClick={() => setActiveSeries(series)}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                <div className="library-count">
                  <strong>{visibleBooks.length}</strong>
                  <span>/ {catalogue.books.length} 册</span>
                  <em>更新于 {catalogue._meta.lastUpdated}</em>
                </div>
              </aside>

              <section className="tool-panel catalogue">
                <div className="tool-panel-heading catalogue-heading">
                  <div>
                    <h2 className="font-serif text-xl font-medium">文献目录</h2>
                    <p className="mt-1 text-sm leading-7 text-foreground/70">
                      选择条目后打开原始 PDF、解析 Markdown 或结构化 CSV。
                    </p>
                  </div>
                </div>

                <div className="lib-list">
                  {visibleBooks.length === 0 ? (
                    <StateNotice
                      kind="empty"
                      title="没有匹配的报告"
                      action={
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setQuery("")
                            setActiveSeries("all")
                          }}
                        >
                          清除筛选
                        </button>
                      }
                    >
                      换一个地名、时代或遗址关键词试试。
                    </StateNotice>
                  ) : (
                    visibleBooks.map((book) => {
                      const isExpanded = expandedBookIds.has(book.id)
                      const files = [
                        { label: "原始 PDF", url: buildAssetUrl(catalogue.baseUrls.pdf, book.filename) },
                        { label: "Markdown", url: buildAssetUrl(catalogue.baseUrls.markdown, book.markdownFilename) },
                        { label: "CSV", url: buildAssetUrl(catalogue.baseUrls.csv, book.csvFilename) },
                      ]

                      return (
                        <article
                          key={book.id}
                          className={`lib-card${isExpanded ? " is-open" : ""}`}
                          data-series={book.series}
                        >
                          <button
                            type="button"
                            className="lib-card-head"
                            onClick={() => toggleBook(book.id)}
                            aria-expanded={isExpanded}
                          >
                            <span className="lib-card-series">
                              <span className="lib-dot" aria-hidden="true" />
                              {catalogue.seriesMeta[book.series].label}
                            </span>
                            <strong className="lib-card-title">{book.title}</strong>
                            <span className="lib-card-desc">{book.description}</span>
                            <span className="lib-tags">
                              {book.tags.map((tag) => (
                                <span key={tag} className="lib-tag">
                                  {tag}
                                </span>
                              ))}
                            </span>
                            <ChevronRight className="lib-card-chevron h-4 w-4" aria-hidden="true" />
                          </button>

                          {isExpanded ? (
                            <div className="lib-card-files" aria-label={`${book.title} 文件`}>
                              {files.map((file) =>
                                file.url ? (
                                  <a
                                    key={file.label}
                                    className="btn btn-sm btn-secondary"
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {file.label}
                                  </a>
                                ) : (
                                  <span key={file.label} className="btn btn-sm btn-secondary is-disabled" aria-disabled="true">
                                    {file.label}
                                  </span>
                                ),
                              )}
                            </div>
                          ) : null}
                        </article>
                      )
                    })
                  )}
                </div>
              </section>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
