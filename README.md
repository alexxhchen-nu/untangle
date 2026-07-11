# 墓葬考古数据抽取管线

VPS 项目路径：`/root/xiaohanchen/projects/tomb-archaeology-pipeline/`

## 目标

把考古简报/报告 PDF 中的墓葬信息自动提取为结构化数据库，支持：
- LLM 文本抽取实测记录、证据、不确定性
- 图像模型识别墓葬形制（Roboflow）
- 数据库规则推断社会结构、文化归属、年代置信
- 导出 CSV/JSON 用于 QGIS、Excel、关联规则分析

## 五层数据本体

详见 `ONTOLOGY.md`。

1. **图像标签层（image_labels）**：仅视觉可判字段，如 `visual_tomb_form`、`image_type`、`image_quality`。由 Roboflow 或人工标注填充。
2. **实测记录层（tombs）**：客观可测属性，由 LLM 从报告文字提取。
3. **证据层（evidence_records）**：每个推断背后的证据链。
4. **分析层（analysis_results）**：社会等级、财富、家族/亲属、文化归属、年代置信等推断结果。
5. **不确定性层（uncertainty_records）**：置信度、冲突解释、待复核事项。

## 文件说明

- `tomb_extraction_pipeline.ipynb`：主流程 notebook（PDF → Markdown → JSON → SQLite → 分析）
- `extraction_prompt.txt`：当前使用的 LLM 抽取 prompt
- `ONTOLOGY.md`：五层本体设计 + 受控词表
- `sample_report_findings.ipynb`：`章丘女郎山.md` 的读报笔记
- `pdfs/`：原始 PDF（不提交 git）
- `markdown/`：PDF 转 Markdown（不提交 git）
- `json/`：LLM 抽取结果（不提交 git）
- `tombs.db`：SQLite 数据库（不提交 git）
- `exports/`：CSV 导出（不提交 git）

## 环境

```bash
cd /root/xiaohanchen/projects/tomb-archaeology-pipeline
source .venv/bin/activate
jupyter lab
```

Kernel: `tomb-ml`

## 配置

复制 `.env.example` 为 `.env` 并填入：

```bash
KIMI_API_KEY=sk-...
KIMI_BASE_URL=https://api.kimi.com/coding/v1
```

## 当前状态

- [x] 五层 ontology 设计完成
- [x] SQLite schema 更新完成
- [x] 抽取 prompt 更新完成
- [ ] 配置真实 API key 并跑通 LLM 抽取
- [ ] 从 PDF 提取墓葬图像并训练 Roboflow 形制分类器
- [ ] 编写社会结构/文化归属推断规则
