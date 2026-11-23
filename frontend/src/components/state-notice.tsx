import type { ReactNode } from "react"
import { AlertCircle, FileText, Loader2 } from "@/lib/icons"

type StateKind = "empty" | "loading" | "error"

interface StateNoticeProps {
  kind: StateKind
  title: string
  children?: ReactNode
  action?: ReactNode
  compact?: boolean
}

const ICONS = {
  empty: FileText,
  loading: Loader2,
  error: AlertCircle,
}

// One designed surface for the non-happy paths: nothing yet, working, failed.
export function StateNotice({ kind, title, children, action, compact = false }: StateNoticeProps) {
  const Icon = ICONS[kind]

  return (
    <div
      className={`state-notice state-notice--${kind}${compact ? " state-notice--compact" : ""}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <span className="state-notice-icon" aria-hidden="true">
        <Icon className={kind === "loading" ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
      </span>
      <div className="state-notice-copy">
        <strong>{title}</strong>
        {children ? <p>{children}</p> : null}
        {action ? <div className="state-notice-action">{action}</div> : null}
      </div>
    </div>
  )
}
