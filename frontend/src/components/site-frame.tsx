import type { ReactNode } from "react"
import { useLocale } from "@/lib/locale"

export function SiteFrame({ children }: { children: ReactNode }) {
  const { c, locale, setLocale } = useLocale()

  return (
    <div className="socratica-frame" data-lang={locale}>
      <div className="home-marquee">
        <p>{c.marquee}</p>
        <button
          type="button"
          className="lang-switch"
          onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
        >
          {c.langLabel}
        </button>
      </div>
      {children}
    </div>
  )
}
