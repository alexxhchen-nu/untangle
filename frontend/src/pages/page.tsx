import Link from "next/link";
import { ChevronRight } from "@/lib/icons";
import { TOOLS } from "@/lib/tools";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <main className="toolbox-home">
        <header className="home-hero">
          <span className="home-mark" aria-hidden="true">
            考
          </span>
          <h1>考古工具箱</h1>
          <p>检索考古报告，抽取墓葬数据，再画成遗址地图和三维模型。</p>
        </header>

        <nav className="toolbox-list" aria-label="考古工具入口">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;

            return (
              <Link key={tool.slug} href={tool.href} className="toolbox-list-item">
                <span className="toolbox-list-media" data-index={tool.index}>
                  <span className="toolbox-list-icon">
                    <Icon className="h-6 w-6" />
                  </span>
                </span>
                <span className="toolbox-list-copy">
                  <span className="toolbox-list-step">{tool.index}</span>
                  <strong>{tool.name}</strong>
                  <em>{tool.tagline}</em>
                </span>
                <ChevronRight className="toolbox-list-arrow h-4 w-4" />
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
