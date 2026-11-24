import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { copy, type Copy, type Locale } from "@/lib/copy"

const STORAGE_KEY = "kaogu-locale"

const LocaleContext = createContext<{
  locale: Locale
  setLocale: (locale: Locale) => void
  c: Copy
} | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh")

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === "en" || saved === "zh") {
      setLocaleState(saved)
      document.documentElement.lang = saved === "en" ? "en" : "zh-CN"
    }
  }, [])

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next === "en" ? "en" : "zh-CN"
  }

  const value = useMemo(() => ({ locale, setLocale, c: copy[locale] }), [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) {
    throw new Error("useLocale must be used inside LocaleProvider")
  }
  return value
}
