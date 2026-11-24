import type { AppProps } from "next/app"
import Head from "next/head"

import "@fontsource-variable/instrument-sans"
import { useLocale, LocaleProvider } from "@/lib/locale"
import "@/styles/globals.css"
import "@/styles/socratica-home.css"
import "@/styles/socratica-pages.css"

function DocumentHead() {
  const { c } = useLocale()
  return (
    <Head>
      <title>{c.metaTitle}</title>
      <meta name="description" content={c.metaDescription} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </Head>
  )
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LocaleProvider>
      <DocumentHead />
      <Component {...pageProps} />
    </LocaleProvider>
  )
}
