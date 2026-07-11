# 墓葬考古数据本体设计（五层）

基于 Roboflow 建议，将数据管线拆为五层：图像标签层只做视觉可判字段，其余社会结构、族属、年代推断放在数据库规则/分析层计算。

---

## 1. 图像标签层（Image Label Layer）

仅由图像模型（Roboflow）或人工标注填充，记录**单张图像**的视觉判断。

### 1.1 受控词表

| 字段 | 类型 | 候选值 |
|------|------|--------|
| `visual_tomb_form` | 单标签 | 土坑竖穴墓、土坑洞室墓、砖室墓、砖椁墓、石室墓、土坑竖穴砖椁墓、舟形墓、瓮棺墓、其他 |
| `image_type` | 单标签 | plan（平面图）、section（剖面图）、photo（照片）、drawing（线图）、composite（组合图）、other |
| `image_quality` | 单标签 | clear（清晰）、moderate（一般）、poor（模糊/残缺）、unusable（无法使用） |
| `image_label_source` | 单标签 | roboflow_model、human_expert、human_assistant、unknown |

### 1.2 数据表 `image_labels`

```sql
CREATE TABLE image_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tomb_id TEXT,
    site_name TEXT,
    source_pdf TEXT,
    source_image_filename TEXT,      -- 原始图像文件名或 PDF 内页码
    image_type TEXT,                 -- plan | section | photo | drawing | composite | other
    image_quality TEXT,              -- clear | moderate | poor | unusable
    visual_tomb_form TEXT,           -- 视觉形制单标签
    visual_confidence REAL,          -- 模型置信度 0-1
    image_label_source TEXT,         -- roboflow_model | human_expert | human_assistant
    annotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. 实测记录层（Measured Record Layer）

由 LLM 从报告文字/表格提取，或人工录入。记录**每个墓葬**可客观测量的属性。

### 2.1 受控词表

| 字段 | 候选值/说明 |
|------|-------------|
| `chamber_shape` | 长方形、梯形、方形、圆形、椭圆形、舟形、不规则、未提及 |
| `burial_position` | 直肢、屈肢、二次葬、扰乱葬、仰身直肢、侧身屈肢、俯身、未提及 |
| `bone_preservation` | 完好、较差、仅存牙齿、不存、未提及 |
| `flooring` | 无、青砖、石板、夯土、白灰、未提及 |
| `sealing` | 无、夯土、砖封门、石封门、木板、未提及 |
| `platform` | 无、有（生土）、有（熟土）、未提及 |

### 2.2 数据表 `tombs`

保留现有主表，字段微调以匹配 ontology：

```sql
CREATE TABLE tombs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tomb_id TEXT,
    site_name TEXT,
    location TEXT,
    -- 形制（来自文字；图像模型结果单独存在 image_labels）
    tomb_form TEXT,
    tomb_form_confidence TEXT,       -- 高/中/低
    tomb_form_basis TEXT,            -- 文字描述/平面图/剖面图/图文一致/图文冲突
    tomb_type TEXT,                  -- 报告原文称谓或复合形制
    -- 空间与结构
    orientation TEXT,
    passage TEXT,
    chamber_shape TEXT,
    chamber_size TEXT,
    sealing TEXT,
    coffin TEXT,
    platform TEXT,
    niche TEXT,
    flooring TEXT,
    -- 人骨与葬式
    burial_position TEXT,
    head_direction TEXT,
    bone_preservation TEXT,
    -- 殉葬与随葬品
    sacrificial_animals TEXT,
    artifact_distribution TEXT,
    artifact_types TEXT,
    artifact_count TEXT,
    artifact_combination TEXT,
    special_artifacts TEXT,
    -- 年代与族属（报告结论）
    reported_date TEXT,
    dated_material TEXT,
    dating_basis TEXT,
    special_customs TEXT,
    reported_ethnicity TEXT,
    -- 来源
    source_pdf TEXT,
    source_md TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. 证据层（Evidence Layer）

记录**每一个推断字段**背后的证据链。支持多对多：一个墓葬可有多个证据，一个证据可支撑多个推断。

### 3.1 受控词表

| 字段 | 候选值 |
|------|--------|
| `interpretation_field` | tomb_form / chronology / social_rank / wealth / ethnicity / burial_custom / artifact_combination / other |
| `evidence_type` | coin_type / artifact_typology / tomb_structure / regional_comparison / stratigraphy / report_citation / text_description / image_plan / image_section / radiocarbon / dna / historical_record / other |
| `evidence_confidence` | high / medium / low / uncertain |

### 3.2 数据表 `evidence_records`

```sql
CREATE TABLE evidence_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tomb_id TEXT,
    site_name TEXT,
    interpretation_field TEXT,       -- 该证据支撑哪个推断字段
    evidence_type TEXT,              -- 证据类型
    evidence_content TEXT,           -- 证据内容摘要
    report_citation TEXT,            -- 报告中的具体引文或页码/图号
    evidence_confidence TEXT,        -- high | medium | low | uncertain
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. 分析层（Analysis Layer）

由数据库规则、LLM 或人工综合计算，输出社会结构、文化归属、年代置信等推断。

### 4.1 受控词表

| 字段 | 候选值 |
|------|--------|
| `analysis_type` | social_rank / wealth_level / family_kin / cultural_affiliation / chronology_confidence |
| `confidence` | high / medium / low / uncertain |

### 4.2 社会等级/财富推断示例规则

- 高等级：砖室墓/石室墓 + 墓道 + 特殊器物（铜鍑、马具、金银器）+ 殉人/殉畜
- 中等级：砖椁墓/土坑竖穴砖椁墓 + 成组陶礼器
- 普通：小型土坑竖穴墓 + 少量陶器

### 4.3 文化归属推断示例规则

- 汉族/汉文化：砖室墓、直肢葬、头向南/西、陶壶/陶罐组合
- 北方游牧/鲜卑：梯形墓室、头向东北、铜鍑、马具、动物殉葬
- 本地传统：土坑洞室墓、屈肢葬、特殊陶器类型

### 4.4 数据表 `analysis_results`

```sql
CREATE TABLE analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tomb_id TEXT,
    site_name TEXT,
    analysis_type TEXT,              -- social_rank | wealth_level | family_kin | cultural_affiliation | chronology_confidence
    analysis_result TEXT,            -- 推断结果
    confidence TEXT,                 -- high | medium | low | uncertain
    evidence_summary TEXT,           -- 综合依据摘要
    analyst_model TEXT,              -- 哪个模型/规则/人工产生
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. 不确定性层（Uncertainty Layer）

记录每个字段的可信度、冲突解释、待复核事项。

### 5.1 受控词表

| 字段 | 候选值 |
|------|--------|
| `review_status` | pending / confirmed / disputed / needs_review |
| `confidence_score` | 0-1 之间浮点数 |

### 5.2 数据表 `uncertainty_records`

```sql
CREATE TABLE uncertainty_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tomb_id TEXT,
    site_name TEXT,
    field_name TEXT,                 -- 哪个字段存在不确定性
    confidence_score REAL,           -- 0-1
    competing_interpretations TEXT,  -- 不同解释，JSON 或分号分隔
    reviewer_notes TEXT,             -- 人工复核备注
    review_status TEXT,              -- pending | confirmed | disputed | needs_review
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 数据流

```
PDF / Markdown
    │
    ├─► 图像提取 ──► Roboflow 图像模型 ──► image_labels（图像标签层）
    │
    └─► LLM 文本抽取 ──► tombs（实测记录层）
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
    evidence_records     analysis_results   uncertainty_records
       （证据层）           （分析层）          （不确定性层）
```

---

## 下一步

1. 把上述 schema 写入 `tomb_extraction_pipeline.ipynb` 的 Cell 10。
2. 更新 `EXTRACTION_PROMPT`，让 LLM 同时输出证据层字段（`evidence_records`）和不确定性字段（`uncertainty_records`）。
3. 保持 `analysis_results` 由后续规则/LLM 填充，不在初次抽取时强制生成。
