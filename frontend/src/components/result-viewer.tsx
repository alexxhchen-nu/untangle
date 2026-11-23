import { ArrowRight } from "@/lib/icons"

export interface ViewerItem {
  key: string
  label: string
  url: string
  meta?: string
}

interface ResultViewerProps {
  title: string
  items: ViewerItem[]
  activeKey: string | null
  onSelect: (key: string) => void
}

// Shows generated HTML (maps, 3D scenes) inside the page instead of a new tab.
export function ResultViewer({ title, items, activeKey, onSelect }: ResultViewerProps) {
  const active = items.find((item) => item.key === activeKey) ?? items[0]

  if (!active) {
    return null
  }

  return (
    <section className="tool-panel result-viewer" aria-label={title}>
      <div className="result-viewer-bar">
        <h2>{title}</h2>
        {items.length > 1 ? (
          <div className="result-viewer-tabs" role="tablist" aria-label={`${title}列表`}>
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={item.key === active.key}
                className={`result-viewer-tab${item.key === active.key ? " is-active" : ""}`}
                onClick={() => onSelect(item.key)}
              >
                {item.label}
                {item.meta ? <span>{item.meta}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
        <a className="btn btn-sm btn-secondary result-viewer-open" href={active.url} target="_blank" rel="noreferrer">
          在新标签页打开
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
      <iframe
        key={active.url}
        className="result-viewer-frame"
        src={active.url}
        title={`${title}：${active.label}`}
        sandbox="allow-scripts allow-popups allow-downloads"
      />
    </section>
  )
}
