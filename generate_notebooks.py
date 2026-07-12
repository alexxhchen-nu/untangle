"""
生成标准 .ipynb JSON 格式的 notebook 文件。
运行: python3 generate_notebooks.py
"""
import json, textwrap
from pathlib import Path


def md(source: str):
    return {"cell_type": "markdown", "metadata": {}, "source": source}


def code(source: str):
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": source,
    }


def nb(cells):
    return {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3",
            },
            "language_info": {"name": "python", "version": "3.9.0"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


# ─────────────────────────────────────────────────────────────────────────────
# dynasty_feature_pipeline.ipynb
# ─────────────────────────────────────────────────────────────────────────────

TITLE_TODO = """\
# 考古器物计数特征提取 Pipeline
## 东汉 → 魏晋十六国 → 北魏 朝代识别

**Created by:** qodercli  
**Date:** 2026-07-12  
**Data source:** `./data/`

---

## 行动清单 (TODO)

> 按优先级执行，完成后将 `⬜` 改为 `✅`

| # | 任务 | 状态 | 优先级 | Step |
|---|------|------|--------|------|
| 1 | 配置 API Key（OpenAI 或 Anthropic） | ⬜ | 🔴 高 | Step 5 |
| 2 | 运行 Step 4：测试分块器（wuziyin.md） | ✅ | 🔴 高 | Step 4 |
| 3 | 运行 Step 4.5：LLM 动态朝代推断（表格+叙述） | ⬜ | 🔴 高 | Step 4.5 |
| 4 | 取消 Step 7 注释，运行阶段 A 特征发现 | ⬜ | 🔴 高 | Step 7 |
| 5 | 审查特征，调整 prompt | ⬜ | 🟡 中 | Step 6 |
| 6 | 实现阶段 B：结构化特征量化提取 | ⬜ | 🟡 中 | 待实现 |
| 7 | 批量处理全部 16 个 markdown 文件 | ⬜ | 🟡 中 | Step 8 |
| 8 | 朝代判别力分析（卡方 / 信息增益） | ⬜ | 🟢 低 | 待实现 |
| 9 | 交叉验证，迭代补充特征 | ⬜ | 🟢 低 | Layer 4 |

---

## Step 4 验证结果（2026-07-12）

| 指标 | 结果 |
|------|------|
| 文件 | wuziyin.md  91.1 KB |
| 总 chunk | 11（表格型 6 / 叙述型 5） |
| 朝代覆盖率（关键词） | **27.3%** ⚠️ |
| 问题1 | 表格 chunk 朝代全为 `[]`：年代列用数字编码（1=西汉,2=东汉） |
| 问题2 | 「汉代」「两汉」等泛称未列入 DYNASTY_KEYWORDS |
| 解决方案 | **Step 3.5：LLM 动态推断**（对两类 chunk 均适用） |
"""

ARCH_MD = """\
## Pipeline 架构总览

```
Markdown 文件
    │
    ├── Layer 1: 预处理 + 朝代感知分块
    │     ├── Step 3  : 关键词检测（快速路径）
    │     └── Step 3.5: LLM 动态推断（兜底路径）← NEW
    │
    ├── Layer 2: LLM 动态特征提取（两阶段）
    │     ├── 阶段 A: 特征发现 (Schema Discovery)
    │     └── 阶段 B: 特征量化 (Structured Extraction)
    │
    ├── Layer 3: 朝代判别力分析
    │
    └── Layer 4: 验证 + 迭代
```
"""

SETUP_CODE = """\
# 依赖安装（首次运行取消注释）
# !pip install pandas beautifulsoup4 lxml openai anthropic scipy matplotlib plotly tqdm

import os
import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import pandas as pd
from bs4 import BeautifulSoup
from tqdm import tqdm

DATA_DIR = Path("./data")
OUTPUT_DIR = Path("./output")
OUTPUT_DIR.mkdir(exist_ok=True)

print(f"数据目录: {DATA_DIR}")
print(f"输出目录: {OUTPUT_DIR}")
"""

STEP1_CODE = """\
# ── Step 1: 文件扫描 ─────────────────────────────────────────────────────────
md_files = list(DATA_DIR.rglob("*.md"))
print(f"找到 {len(md_files)} 个 markdown 文件:\\n")
for f in md_files:
    size_kb = f.stat().st_size / 1024
    print(f"  {str(f.relative_to(DATA_DIR)):<70} {size_kb:>8.1f} KB")
"""

STEP2_CODE = """\
# ── Step 2: 朝代 & 区域关键词 ────────────────────────────────────────────────
DYNASTY_KEYWORDS = {
    "西汉早期": ["西汉早期", "西汉初", "汉初", "高祖", "惠帝", "吕后", "文景"],
    "西汉中期": ["西汉中期", "武帝", "昭帝", "宣帝", "元帝", "成帝"],
    "西汉晚期": ["西汉晚期", "西汉末", "哀帝", "平帝", "孺子婴", "新莽", "王莽"],
    "东汉早期": ["东汉早期", "东汉初", "光武帝", "明帝", "章帝"],
    "东汉中期": ["东汉中期", "和帝", "安帝", "顺帝", "冲帝", "质帝"],
    "东汉晚期": ["东汉晚期", "东汉末", "桓帝", "灵帝", "献帝"],
    "魏晋":    ["魏晋", "曹魏", "西晋", "魏晋时期"],
    "十六国":  ["十六国", "五胡十六国", "前秦", "后秦", "前燕", "后燕", "北燕"],
    "北魏":    ["北魏", "拓跋", "平城", "大同", "洛阳时期"],
    "北朝":    ["北朝", "东魏", "西魏", "北齐", "北周"],
    # 泛称（提升覆盖率）
    "汉代通用": ["汉代", "两汉", "汉墓", "汉朝", "汉人", "汉式"],
    "西汉通用": ["西汉", "前汉"],
    "东汉通用": ["东汉", "后汉"],
}

REGION_KEYWORDS = {
    "山东":  ["山东", "齐鲁", "齐地", "鲁地", "胶东", "鲁北", "鲁南"],
    "幽燕":  ["幽燕", "幽州", "燕", "北京", "河北北部"],
    "关中":  ["关中", "长安", "西安", "陕西"],
    "中原":  ["中原", "河南", "洛阳"],
    "山西":  ["山西", "并州", "晋", "大同", "平城"],
    "京津冀": ["京津冀", "北京", "天津", "河北"],
}

print("关键词表加载完成。")
print(f"  朝代分类数: {len(DYNASTY_KEYWORDS)}  区域分类数: {len(REGION_KEYWORDS)}")
"""

STEP3_CODE = """\
# ── Step 3: Chunk 数据类 + 关键词分块器 ──────────────────────────────────────
@dataclass
class Chunk:
    chunk_id: str
    source_file: str
    content_type: str          # "table" | "narrative"
    text: str
    inferred_dynasty: List[str] = field(default_factory=list)
    inferred_region:  List[str] = field(default_factory=list)
    artifact_category: str = ""
    detection_method: str = "keyword"   # "keyword" | "llm" | "none"
    table_data: Optional[List[Dict]] = None


def detect_dynasty(text: str) -> List[str]:
    detected = []
    for dynasty, keywords in DYNASTY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                detected.append(dynasty)
                break
    return detected


def detect_region(text: str) -> List[str]:
    detected = []
    for region, keywords in REGION_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                detected.append(region)
                break
    return detected


def extract_tables(html_content: str) -> List[Dict]:
    soup = BeautifulSoup(html_content, "lxml")
    tables = []
    for table in soup.find_all("table"):
        rows = []
        for tr in table.find_all("tr"):
            cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
            if cells:
                rows.append(cells)
        if rows:
            tables.append({"headers": rows[0], "data": rows[1:]})
    return tables


def chunk_file(filepath: Path) -> List[Chunk]:
    content = filepath.read_text(encoding="utf-8")
    chunks = []
    # 1. 表格 chunk
    for i, table in enumerate(extract_tables(content)):
        table_text = json.dumps(table, ensure_ascii=False)   # JSON 格式，便于 LLM 解析
        chunk = Chunk(
            chunk_id=f"{filepath.stem}_table_{i}",
            source_file=filepath.name,
            content_type="table",
            text=table_text[:2000],
            inferred_dynasty=detect_dynasty(table_text),
            inferred_region=detect_region(table_text),
            table_data=table,
        )
        chunks.append(chunk)
    # 2. 叙述 chunk
    text_only = re.sub(r"<table.*?</table>", "", content, flags=re.DOTALL)
    text_only = re.sub(r"<div.*?</div>",   "", text_only, flags=re.DOTALL)
    for i, section in enumerate(re.split(r"\\n(?=#{1,4}\\s)", text_only)):
        if len(section.strip()) < 50:
            continue
        chunk = Chunk(
            chunk_id=f"{filepath.stem}_section_{i}",
            source_file=filepath.name,
            content_type="narrative",
            text=section.strip()[:3000],
            inferred_dynasty=detect_dynasty(section),
            inferred_region=detect_region(section),
        )
        chunks.append(chunk)
    return chunks

print("Step 3 分块器定义完成。")
"""

STEP35_MD = """\
## Step 3.5 — LLM 动态朝代推断（核心改进）

**动机：** 关键词匹配只能覆盖 27.3% 的 chunk：
- 表格年代列用数字编码（1=西汉，2=东汉），关键词无法匹配
- 叙述段使用「汉代」「两汉」等泛称，超出预设词典

**方案：** 对 `inferred_dynasty == []` 的 chunk，调用 LLM 动态推断：
- 表格 chunk → 让 LLM 解读年代列编码含义
- 叙述 chunk → 让 LLM 直接从文本推断时期

**结果标注：** 每个 chunk 新增 `detection_method` 字段：
- `"keyword"` — 关键词匹配命中
- `"llm"` — LLM 推断
- `"none"` — 两者均失败
"""

STEP35_CODE = """\
# ── Step 3.5: LLM 动态朝代推断 ───────────────────────────────────────────────
# （需要先运行 Step 5 定义 call_llm，或提前在此配置 API Key）

TABLE_DYNASTY_PROMPT = \"\"\"你是一位精通中国考古学的专家。
以下是一张考古数据表格，其中"年代"列可能用数字或简写编码（如 1=西汉早期）。

表头: {headers}
数据样本（前5行）:
{sample_rows}

请识别：
1. 年代编码的含义（如 {{"1": "西汉早期", "2": "东汉中期"}}）
2. 该表格涵盖的所有历史时期列表

输出 JSON（只输出 JSON，不含其他内容）：
{{"dynasties": ["西汉早期", "东汉"], "year_map": {{"1": "西汉", "2": "东汉"}}, "confidence": 0.9}}\"\"\"

NARRATIVE_DYNASTY_PROMPT = \"\"\"你是一位精通中国考古学的专家。
请从以下考古学文本中识别所有涉及的历史时期和地理区域。

文本：
{text}

输出 JSON（只输出 JSON，不含其他内容）：
{{"dynasties": ["西汉", "东汉"], "regions": ["山东", "关中"], "confidence": 0.85}}\"\"\"


def enrich_chunk_dynasty_llm(chunk: Chunk) -> Chunk:
    \"\"\"对单个 chunk 用 LLM 推断朝代（已有结果则跳过）\"\"\"
    if chunk.inferred_dynasty:
        return chunk

    if chunk.content_type == "table" and chunk.table_data:
        sample = "\\n".join(str(row) for row in chunk.table_data["data"][:5])
        prompt = TABLE_DYNASTY_PROMPT.format(
            headers=chunk.table_data["headers"],
            sample_rows=sample,
        )
    else:
        prompt = NARRATIVE_DYNASTY_PROMPT.format(text=chunk.text[:1500])

    try:
        raw = call_llm(prompt, system="你是考古学专家，只输出 JSON。")
        m = re.search(r"\\{[\\s\\S]*\\}", raw)
        if m:
            data = json.loads(m.group())
            chunk.inferred_dynasty = data.get("dynasties", [])
            if not chunk.inferred_region:
                chunk.inferred_region = data.get("regions", [])
            chunk.detection_method = "llm"
            chunk.artifact_category = f"conf={data.get('confidence', '?')}"
    except Exception as e:
        chunk.detection_method = "none"
        chunk.artifact_category = f"llm_err:{str(e)[:40]}"
    return chunk


def enrich_all_chunks_llm(chunks: List[Chunk]) -> List[Chunk]:
    \"\"\"批量 LLM 推断：只处理 inferred_dynasty 为空的 chunk\"\"\"
    empty = [c for c in chunks if not c.inferred_dynasty]
    print(f"需要 LLM 推断的 chunk: {len(empty)}/{len(chunks)}")
    for chunk in tqdm(empty, desc="LLM 推断朝代"):
        enrich_chunk_dynasty_llm(chunk)
    covered = sum(1 for c in chunks if c.inferred_dynasty)
    print(f"推断后覆盖率: {covered}/{len(chunks)} = {covered/len(chunks)*100:.1f}%")
    return chunks

print("Step 3.5 LLM 推断函数定义完成。")
"""

STEP4_CODE = """\
# ── Step 4: 测试分块器（wuziyin.md） ─────────────────────────────────────────
from collections import Counter

test_file = DATA_DIR / "wuziyin.md"
if test_file.exists():
    test_chunks = chunk_file(test_file)
    table_chunks     = [c for c in test_chunks if c.content_type == "table"]
    narrative_chunks = [c for c in test_chunks if c.content_type == "narrative"]

    print(f"文件: {test_file.name}  ({test_file.stat().st_size/1024:.1f} KB)")
    print(f"总 chunk: {len(test_chunks)}  (表格 {len(table_chunks)} / 叙述 {len(narrative_chunks)})")

    empty = sum(1 for c in test_chunks if not c.inferred_dynasty)
    print(f"关键词朝代覆盖率: {(len(test_chunks)-empty)/len(test_chunks)*100:.1f}%  (未命中: {empty})")

    dynasty_cnt = Counter()
    for c in test_chunks:
        dynasty_cnt.update(c.inferred_dynasty)
    print("朝代分布:", dict(dynasty_cnt.most_common()))

    print("\\n--- 前 3 个 chunk 预览 ---")
    for i, chunk in enumerate(test_chunks[:3]):
        print(f"[{i}] {chunk.chunk_id}  type={chunk.content_type}  dynasty={chunk.inferred_dynasty}")
        print(f"     text_preview: {chunk.text[:120].strip()!r}")
else:
    print(f"文件不存在: {test_file}")
"""

STEP45_CODE = """\
# ── Step 4.5: LLM 动态朝代推断测试 ──────────────────────────────────────────
# 前提：已运行 Step 5（call_llm 已定义）且配置了 API Key
#
# 对 test_chunks 中朝代为空的 chunk 调用 LLM 推断

# test_chunks = enrich_all_chunks_llm(test_chunks)  # ← 配置 API Key 后取消注释

# 取消注释后查看覆盖率提升情况：
# covered = sum(1 for c in test_chunks if c.inferred_dynasty)
# print(f"LLM 推断后覆盖率: {covered}/{len(test_chunks)} = {covered/len(test_chunks)*100:.1f}%")
# for c in test_chunks:
#     marker = "🤖" if c.detection_method == "llm" else "🔑" if c.detection_method == "keyword" else "❌"
#     print(f"  {marker} {c.chunk_id:<40} {c.inferred_dynasty}")

print("Step 4.5 已就绪 — 配置 API Key 后取消注释运行。")
"""

STEP5_CODE = """\
# ── Step 5: LLM 接口 ─────────────────────────────────────────────────────────
LLM_BACKEND = "openai"   # 改为 "anthropic" 切换后端

def call_llm(prompt: str, system: str = "", temperature: float = 0.1) -> str:
    \"\"\"统一 LLM 调用接口（OpenAI / Anthropic）\"\"\"
    if LLM_BACKEND == "openai":
        from openai import OpenAI
        client = OpenAI()   # 读取 OPENAI_API_KEY 环境变量
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        resp = client.chat.completions.create(
            model="gpt-4o", messages=messages, temperature=temperature
        )
        return resp.choices[0].message.content

    elif LLM_BACKEND == "anthropic":
        import anthropic
        client = anthropic.Anthropic()   # 读取 ANTHROPIC_API_KEY 环境变量
        resp = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=4096,
            system=system or "你是一位考古学专家。",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
        )
        return resp.content[0].text

    else:
        raise ValueError(f"Unknown backend: {LLM_BACKEND}")

print(f"LLM backend: {LLM_BACKEND}  ✓ 接口定义完成")
"""

STEP6_CODE = """\
# ── Step 6: 阶段 A — 特征发现 Prompt ─────────────────────────────────────────
SYSTEM_PROMPT_DISCOVERY = \"\"\"你是一位精通中国考古学的专家，专注于汉代至北朝时期。
任务：从考古学文献中识别并提取可量化的器物/墓葬特征（计数特征）。
这些特征将用于区分不同历史时期（东汉、魏晋十六国、北魏等）。

要求：
1. 不预设类别，让特征从文本中自然浮现
2. 关注可量化、可比较的特征（数量、比例、类型分布等）
3. 标注每个特征的朝代区分度
4. 给出原文依据\"\"\"

DISCOVERY_PROMPT_TEMPLATE = \"\"\"请从以下考古学文本中提取所有可量化的器物/墓葬特征。

文本类型: {content_type}
推断时期: {inferred_dynasty}
推断区域: {inferred_region}

文本内容:
---
{text}
---

输出 JSON：
{{
  "features": [
    {{
      "feature_name": "特征名称",
      "feature_type": "numeric|categorical|boolean|ratio",
      "value": "具体值（如有）",
      "dynasty_signal": "该特征对哪些时期有区分度",
      "evidence": "原文依据（引用）",
      "confidence": 0.0
    }}
  ]
}}
只输出 JSON。\"\"\"


def discover_features(chunk: Chunk) -> Dict:
    \"\"\"阶段 A：从单个 chunk 发现特征\"\"\"
    prompt = DISCOVERY_PROMPT_TEMPLATE.format(
        content_type=chunk.content_type,
        inferred_dynasty=", ".join(chunk.inferred_dynasty) or "未明确",
        inferred_region=", ".join(chunk.inferred_region)  or "未明确",
        text=chunk.text,
    )
    response = call_llm(prompt, system=SYSTEM_PROMPT_DISCOVERY)
    try:
        m = re.search(r"\\{[\\s\\S]*\\}", response)
        if m:
            return json.loads(m.group())
        return {"features": [], "raw_response": response}
    except json.JSONDecodeError:
        return {"features": [], "raw_response": response, "parse_error": True}

print("Step 6 特征发现 prompt 定义完成。")
"""

STEP7_CODE = """\
# ── Step 7: 试运行 — 阶段 A 特征发现（单个 chunk） ───────────────────────────
# 前提：已运行 Step 5（call_llm）且配置了 API Key

if 'test_chunks' in dir():
    narrative_chunks = [c for c in test_chunks if c.content_type == "narrative" and len(c.text) > 200]
    if narrative_chunks:
        sample_chunk = narrative_chunks[0]
        print(f"测试 chunk : {sample_chunk.chunk_id}")
        print(f"推断时期   : {sample_chunk.inferred_dynasty}")
        print(f"检测方式   : {sample_chunk.detection_method}")
        print(f"文本预览   : {sample_chunk.text[:200]}...\\n")

        # ── 配置 API Key 后取消以下注释 ──
        # result = discover_features(sample_chunk)
        # print(json.dumps(result, ensure_ascii=False, indent=2))
        print("取消注释后运行 LLM 特征发现。（需要 API Key）")
    else:
        print("没有找到合适的叙述 chunk")
else:
    print("请先运行 Step 4 生成 test_chunks。")
"""

STEP8_CODE = """\
# ── Step 8: 批量处理 + 特征词典聚合 ──────────────────────────────────────────
def process_all_files(file_pattern: str = "*.md") -> List[Chunk]:
    \"\"\"处理所有文件，返回所有 chunks（含 LLM 推断兜底）\"\"\"
    all_chunks = []
    files = list(DATA_DIR.rglob(file_pattern))
    for filepath in tqdm(files, desc="切分文件"):
        chunks = chunk_file(filepath)
        all_chunks.extend(chunks)
    print(f"\\n总计: {len(all_chunks)} 个 chunks（关键词阶段）")

    # LLM 推断兜底（对朝代为空的 chunk）
    # all_chunks = enrich_all_chunks_llm(all_chunks)  # ← 配置 API Key 后取消注释
    return all_chunks


def aggregate_feature_vocab(all_features: List[Dict]) -> pd.DataFrame:
    \"\"\"聚合所有发现的特征，生成特征词典\"\"\"
    feature_list = []
    for result in all_features:
        for f in result.get("features", []):
            feature_list.append(f)
    df = pd.DataFrame(feature_list)
    if not df.empty:
        vocab = df.groupby("feature_name").agg({
            "feature_type":    "first",
            "dynasty_signal":  lambda x: ", ".join(set(", ".join(x).split(", "))),
            "evidence":        "count",
        }).rename(columns={"evidence": "occurrence_count"})
        return vocab.sort_values("occurrence_count", ascending=False)
    return df

print("Step 8 批处理函数定义完成。")
"""

NEXTSTEPS_MD = """\
---

## 下一步

1. **配置 API Key** → 运行 Step 4.5 (LLM 推断朝代) → 验证覆盖率提升至 80%+
2. 取消 Step 7 注释 → 运行阶段 A 特征发现，查看 LLM 自动发现哪些特征
3. 根据发现的特征审查 prompt，实现阶段 B 量化提取
4. 批量跑全部 16 个 markdown 文件
5. 朝代判别力分析（卡方检验 / 信息增益）
"""

cells_main = [
    md(TITLE_TODO),
    md(ARCH_MD),
    code(SETUP_CODE),
    code(STEP1_CODE),
    code(STEP2_CODE),
    code(STEP3_CODE),
    md(STEP35_MD),
    code(STEP35_CODE),
    code(STEP4_CODE),
    code(STEP45_CODE),
    code(STEP5_CODE),
    code(STEP6_CODE),
    code(STEP7_CODE),
    code(STEP8_CODE),
    md(NEXTSTEPS_MD),
]

# ─────────────────────────────────────────────────────────────────────────────
# log.ipynb
# ─────────────────────────────────────────────────────────────────────────────

LOG_TITLE_MD = """\
# 工作日志 — 考古朝代识别 Pipeline
## Work Log with Timestamps

本文件记录所有工作节点：时间戳、完成任务、输出摘要、问题与解决方案。

日志持久化到 `./log_entries.json`，`show_log()` 可随时查看历史记录。
"""

LOG_UTILS_CODE = """\
import json
from datetime import datetime
from pathlib import Path

LOG_FILE = Path("./log_entries.json")

def log_entry(action: str, details: str = "", result: str = "", status: str = "done"):
    \"\"\"
    记录一条工作日志
    status: "done" | "in_progress" | "failed" | "skipped"
    \"\"\"
    entry = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "action": action,
        "details": details,
        "result": result,
        "status": status,
    }
    entries = []
    if LOG_FILE.exists():
        with open(LOG_FILE) as f:
            entries = json.load(f)
    entries.append(entry)
    with open(LOG_FILE, "w") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    icons = {"done": "✅", "in_progress": "🔄", "failed": "❌", "skipped": "⏭️"}
    icon = icons.get(status, "📝")
    print(f"{icon} [{entry['timestamp']}] {action}")
    if details: print(f"   详情: {details}")
    if result:  print(f"   结果: {result}")
    return entry


def show_log(n: int = 20):
    \"\"\"显示最近 n 条日志\"\"\"
    if not LOG_FILE.exists():
        print("暂无日志记录。")
        return
    with open(LOG_FILE) as f:
        entries = json.load(f)
    print(f"=== 工作日志（最近 {min(n, len(entries))} / 共 {len(entries)} 条）===\\n")
    icons = {"done": "✅", "in_progress": "🔄", "failed": "❌", "skipped": "⏭️"}
    for e in entries[-n:]:
        icon = icons.get(e["status"], "📝")
        print(f"{icon} [{e['timestamp']}] {e['action']}")
        if e.get("details"): print(f"   详情: {e['details']}")
        if e.get("result"):  print(f"   结果: {e['result']}")
        print()

print("日志工具函数加载完成。  用法: log_entry(action, details, result, status)")
"""

LOG_INIT_CODE = """\
# ── 2026-07-12 项目初始化记录 ─────────────────────────────────────────────────
log_entry("项目初始化",
    details="创建 dynasty_feature_pipeline.ipynb，四层架构：分块/LLM提取/判别分析/验证",
    result="架构文档+代码框架就位")

log_entry("添加 TODO 行动清单",
    details="顶部添加 9 项行动清单，按优先级排序",
    result="TODO 表格写入完成")

log_entry("创建工作日志 log.ipynb",
    details="log_entry/show_log 工具函数，日志持久化到 log_entries.json",
    result="log.ipynb 创建完成")

log_entry("Step 4: 分块器测试 wuziyin.md",
    details="执行 Steps 1-4，发现3个问题：①表格朝代空[]（数字编码）②叙述覆盖率27.3%③text存Python repr",
    result="总chunk 11（表格6/叙述5）；朝代覆盖率27.3%；3个问题记录为TODO")

log_entry("Step 3.5: 新增 LLM 动态朝代推断",
    details="设计并实现 enrich_chunk_dynasty_llm/enrich_all_chunks_llm，覆盖表格数字编码和叙述泛称两类问题",
    result="函数框架就位，待配置 API Key 后运行验证")

log_entry("重构 notebook 为标准 .ipynb JSON 格式",
    details="之前平文本格式导致 IDE 无法显示内容，改写为标准 nbformat 4 JSON",
    result="dynasty_feature_pipeline.ipynb + log.ipynb 均已转为标准格式")
"""

LOG_TEMPLATE_MD = """\
## 模板：新工作节点

```python
log_entry(
    action="",          # 例: "运行 Step 4.5 LLM 推断"
    details="",         # 处理了哪些文件 / 步骤
    result="",          # 覆盖率变化 / 发现特征数
    status="done",      # done | in_progress | failed | skipped
)
```
"""

LOG_SHOW_CODE = """\
# 查看全部日志
show_log(n=50)
"""

cells_log = [
    md(LOG_TITLE_MD),
    code(LOG_UTILS_CODE),
    code(LOG_INIT_CODE),
    md(LOG_TEMPLATE_MD),
    code(LOG_SHOW_CODE),
]

# ─────────────────────────────────────────────────────────────────────────────
# 写入文件
# ─────────────────────────────────────────────────────────────────────────────
root = Path("/Users/xiaohanchen/dev/projects/kaogu-dynasty-feature-pipeline-qodercli")

for path, cells in [
    (root / "dynasty_feature_pipeline.ipynb", cells_main),
    (root / "log.ipynb", cells_log),
]:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(nb(cells), f, ensure_ascii=False, indent=1)
    print(f"✅ 写入: {path.name}  ({path.stat().st_size/1024:.1f} KB)")

print("\n两个 notebook 已生成为标准 nbformat 4 JSON 格式。")
