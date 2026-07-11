# 墓葬考古数据抽取与量化分析管线

一个 Jupyter Notebook 管线，把考古简报/报告 PDF 自动转化为结构化数据库，支持类型学分析、年代-族属交叉分析和 QGIS 可视化。

## 目录结构

```
tomb-archaeology-pipeline/
├── pdfs/                       # 放入待处理的 PDF 报告
├── markdown/                   # PDF 转 Markdown 后的中间文件
├── json/                       # LLM 抽取后的结构化 JSON
├── exports/                    # CSV / GeoJSON 导出文件
├── tomb_extraction_pipeline.ipynb
├── requirements.txt
├── .env.example
└── README.md
```

## 使用步骤

1. 安装依赖

```bash
uv pip install -r requirements.txt
```

2. 配置 API Key

```bash
cp .env.example .env
# 编辑 .env，填入 KIMI_API_KEY
```

3. 把 PDF 报告放入 `pdfs/` 目录

4. 打开 `tomb_extraction_pipeline.ipynb`，按顺序运行 cell

## 管线流程

1. PDF → Markdown（MinerU / marker-pdf）
2. Markdown → 结构化 JSON（Kimi/DeepSeek LLM）
3. JSON → SQLite 数据库
4. Python 量化分析（交叉表、关联规则）
5. 导出 CSV/Shapefile 进 QGIS

## 字段说明

详见 notebook 中的 `EXTRACTION_PROMPT` 和 SQLite schema，覆盖：
- 墓葬编号、类型、方向、墓室形状/尺寸
- 壁龛、葬式、头向、随葬品组合
- 报告定年、纪年材料、族属判断
- 特殊器物、特殊葬俗、图文冲突备注
