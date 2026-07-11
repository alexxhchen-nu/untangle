# 墓葬考古数据抽取与量化分析管线

一个 Jupyter Notebook 管线，把考古简报/报告 PDF 自动转化为结构化数据库，支持类型学分析、年代-族属交叉分析和 QGIS 可视化。

本管线采用“特征抽取 → 形制分类 → 数据库推断层”的分层架构：
- **特征层**：从文本和图像中提取墓葬形制、尺寸、方向、随葬品等客观字段。
- **形制分类层**：将墓葬归为一个主形制标签（如土坑竖穴墓、砖室墓等），作为后续分析的基础。
- **推断层**：在数据库中独立维护社会结构分析（等级/财富/身份）和文化归属分析（族属/文化认同），避免模型直接做跨维度跳跃判断。

## 目录结构

```
tomb-archaeology-pipeline/
├── pdfs/                       # 放入待处理的 PDF 报告
├── markdown/                   # PDF 转 Markdown 后的中间文件
├── json/                       # LLM 抽取后的结构化 JSON
├── exports/                    # CSV / GeoJSON 导出文件
├── tomb_extraction_pipeline.ipynb   # 主管线
├── sample_report_findings.ipynb     # 样本报告分析日志
├── extraction_prompt.txt
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
3. JSON → SQLite 数据库（主表 + 社会结构推断表 + 文化归属推断表）
4. Python 量化分析（交叉表、关联规则）
5. 导出 CSV/Shapefile 进 QGIS

## 字段说明

详见 notebook 中的 `EXTRACTION_PROMPT` 和 SQLite schema，覆盖：
- 墓葬编号、**形制主标签**、方向、墓室形状/尺寸
- 壁龛、葬式、头向、随葬品组合
- 报告定年、纪年材料、族属判断
- 特殊器物、特殊葬俗、图文冲突备注
- 可用于社会结构/文化归属推断的原始线索字段

## 当前状态

- 已配置 GitHub remote，代码在 `main` 分支跟踪 `origin/main`。
- `sample_report_findings.ipynb` 以《章丘女郎山》报告为样本，验证了文本结构和字段映射。
- 图像形制分类器尚未训练，数据库中已预留 `tomb_form_image_label` 等字段供后续接入。
