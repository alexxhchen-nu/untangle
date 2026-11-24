import type { ReactNode } from "react"

const MARQUEE =
  "检索考古报告 • 抽取墓葬数据 • 逐条对照原文 • 画成遗址地图 • 生成三维模型 • 检索考古报告 • 抽取墓葬数据 • 逐条对照原文 • 画成遗址地图 • 生成三维模型 • 检索考古报告 • 抽取墓葬数据 • 逐条对照原文 • 画成遗址地图 • 生成三维模型"

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="socratica-frame">
      <div className="home-marquee">
        <p>{MARQUEE}</p>
      </div>
      {children}
    </div>
  )
}
