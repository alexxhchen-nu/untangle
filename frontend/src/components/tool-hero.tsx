import Link from "next/link"
import type { ToolMeta } from "@/lib/tools"
import { TOOLS } from "@/lib/tools"

const ISSUE = ["001", "002", "003", "004"]

export function ToolHero({ tool }: { tool: ToolMeta }) {
  const Icon = tool.icon
  const issue = ISSUE[TOOLS.findIndex((item) => item.slug === tool.slug)] ?? "000"

  return (
    <header className="tool-hero">
      <div className="tool-hero-inner">
        <nav className="tool-crumbs" aria-label="位置">
          <Link href="/">考古工具箱</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{tool.name}</span>
        </nav>
        <div className="tool-hero-center">
          <span className="tool-hero-icon" data-index={tool.index} aria-hidden="true">
            <Icon className="h-7 w-7" strokeWidth={1.6} />
          </span>
          <div className="tool-hero-copyblock">
            <p className="tool-kicker">工具 {issue}</p>
            <h1>{tool.name}</h1>
            <p className="tool-hero-copy">{tool.description}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
