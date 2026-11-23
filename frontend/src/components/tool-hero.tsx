import Link from 'next/link'
import { ChevronRight } from '@/lib/icons'
import type { ToolMeta } from '@/lib/tools'

// Centered page header: crumbs on top, then one centered block with the
// tool's icon, name and a single line of what it does.
export function ToolHero({ tool }: { tool: ToolMeta }) {
  const Icon = tool.icon
  return (
    <header className="tool-hero">
      <div className="tool-hero-inner">
        <nav className="tool-crumbs" aria-label="位置">
          <Link href="/">考古工具箱</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span aria-current="page">{tool.name}</span>
        </nav>
        <div className="tool-hero-center">
          <span className="tool-hero-icon" data-index={tool.index} aria-hidden="true">
            <Icon className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <h1>{tool.name}</h1>
          <p className="tool-hero-copy">{tool.description}</p>
        </div>
      </div>
    </header>
  )
}
