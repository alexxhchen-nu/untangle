import { Box, Braces, MapPinned, Search } from "@/lib/icons"
import type { IconComponent } from "@/lib/icons"

export interface ToolMeta {
  slug: string
  href: string
  name: string
  en: string
  tagline: string
  description: string
  highlight?: string
  icon: IconComponent
  index: string
}

// Ordered along the main workflow: find a report → extract tombs → map / model them.
export const TOOLS: ToolMeta[] = [
  {
    slug: 'library',
    href: '/Library',
    name: '资料库检索',
    en: '资料目录工作台',
    tagline: '按系列和关键词查找考古报告，在线打开 PDF',
    description:
      '浏览已整理的考古报告目录。可以按系列筛选、按标题或标签搜索，直接打开 PDF、解析后的 Markdown 和 CSV。',
    highlight: '直接打开 PDF',
    icon: Search,
    index: '一',
  },
  {
    slug: 'dynamic-parser',
    href: '/DynamicParser',
    name: '墓葬文本抽取',
    en: '文本抽取工作台',
    tagline: '从报告文本中抽出墓葬编号、年代、形制、尺寸和随葬器物',
    description:
      '粘贴报告正文或墓葬段落，得到一张墓葬表，可以逐条对照原文核对，并下载 CSV 给三维建模或地图使用。',
    highlight: '逐条对照原文核对',
    icon: Braces,
    index: '二',
  },
  {
    slug: 'gis',
    href: '/GIS',
    name: '遗址空间分析',
    en: '空间分析工作台',
    tagline: '把带坐标的遗址和墓葬数据画成地图',
    description:
      '上传含遗址、墓葬和坐标字段的 CSV，生成遗址分布地图，可以选坐标模式，也可以另外生成总览图。',
    highlight: '遗址分布地图',
    icon: MapPinned,
    index: '三',
  },
  {
    slug: 'modelling',
    href: '/Modelling',
    name: '墓葬三维建模',
    en: '三维建模工作台',
    tagline: '按墓葬形制和尺寸生成三维模型',
    description:
      '上传含墓葬编号、形制、墓口长宽和墓深的 CSV，在浏览器里生成可以旋转查看的墓葬三维模型。',
    highlight: '可以旋转查看',
    icon: Box,
    index: '四',
  },
]

export function getTool(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug)
}
