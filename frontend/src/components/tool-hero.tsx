import Link from "next/link"
import { useLocale } from "@/lib/locale"
import type { ToolMeta } from "@/lib/tools"
import { TOOLS } from "@/lib/tools"

const ISSUE = ["001", "002", "003", "004"]

export function ToolHero({ tool }: { tool: ToolMeta }) {
  const { c } = useLocale()
  const Icon = tool.icon
  const issue = ISSUE[TOOLS.findIndex((item) => item.slug === tool.slug)] ?? "000"
  const text = c.tools[tool.slug as keyof typeof c.tools]

  return (
    <header className="tool-hero">
      <div className="tool-hero-inner">
        <nav className="tool-crumbs" aria-label="Breadcrumb">
          <Link href="/">{c.brand}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{text.name}</span>
        </nav>
        <div className="tool-hero-center">
          <span className="tool-hero-icon" data-index={tool.index} aria-hidden="true">
            <Icon className="h-7 w-7" strokeWidth={1.6} />
          </span>
          <div className="tool-hero-copyblock">
            <p className="tool-kicker">
              {c.toolKicker} {issue}
            </p>
            <h1>{text.name}</h1>
            <p className="tool-hero-copy">{text.description}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
