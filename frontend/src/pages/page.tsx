import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { useLocale } from "@/lib/locale";
import { TOOLS } from "@/lib/tools";

const CARD_CLASS = ["issue-1", "issue-2", "issue-3", "issue-4"] as const;

function IssueMark({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg className="issue-illo illo-1" viewBox="0 0 140 90" aria-hidden="true">
        <path d="M18 70c18-28 40-28 52 0 12-28 34-28 52 0" fill="none" stroke="#f7f5eb" strokeWidth="8" strokeLinecap="round" />
        <rect x="28" y="28" width="84" height="52" rx="6" fill="#f7f5eb" />
        <path d="M40 44h60M40 56h44" stroke="#649aea" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg className="issue-illo illo-2" viewBox="0 0 120 120" aria-hidden="true">
        <path d="M34 18c-16 18-16 66 0 84M86 18c16 18 16 66 0 84" fill="none" stroke="#f7f5eb" strokeWidth="8" strokeLinecap="round" />
        <path d="M48 42h28M48 60h36M48 78h22" stroke="#f7f5eb" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }
  if (index === 2) {
    return (
      <svg className="issue-illo illo-3" viewBox="0 0 140 110" aria-hidden="true">
        <path d="M12 78l34-30 22 16 28-34 32 48H12z" fill="#f4e2b0" />
        <circle cx="96" cy="34" r="14" fill="#f7f5eb" />
        <path d="M96 48v22" stroke="#f7f5eb" strokeWidth="6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="issue-illo illo-4" viewBox="0 0 120 130" aria-hidden="true">
      <path d="M20 48l40-22 40 22v52l-40 22-40-22V48z" fill="#f7f5eb" />
      <path d="M20 48l40 22 40-22M60 70v52" fill="none" stroke="#ad7e95" strokeWidth="4" />
    </svg>
  );
}

export default function LandingPage() {
  const { c } = useLocale();

  return (
    <SiteFrame>
      <div className="socratica-home">
      <div className="home-sheet">
        <p className="home-title">{c.homeTitle}</p>
        <p className="home-sub">{c.homeSub}</p>
        <nav className="issue-grid" aria-label={c.homeNav}>
          {TOOLS.map((tool, index) => {
            const text = c.tools[tool.slug as keyof typeof c.tools]
            return (
              <Link key={tool.slug} href={tool.href} className={`issue-card ${CARD_CLASS[index]}`}>
                <span className="issue-name">{text.name}</span>
                <span className="issue-kicker">{c.toolKicker} 00{index + 1}</span>
                <span className="issue-line">{text.tagline}</span>
                <IssueMark index={index} />
              </Link>
            )
          })}
        </nav>
      </div>
      </div>
    </SiteFrame>
  );
}
