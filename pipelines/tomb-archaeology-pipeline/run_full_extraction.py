# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "python-dotenv",
#     "requests",
# ]
# ///
import os
import json
import re
import sqlite3
import time
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import requests
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# 配置
# ---------------------------------------------------------------------------
load_dotenv()

PROJECT_DIR = Path("/root/xiaohanchen/projects/tomb-archaeology-pipeline")
MARKDOWN_DIR = PROJECT_DIR / "markdown"
JSON_DIR = PROJECT_DIR / "json"
DB_PATH = PROJECT_DIR / "tombs.db"

KIMI_API_KEY = os.environ.get("KIMI_API_KEY", "")
KIMI_BASE_URL = os.environ.get("KIMI_BASE_URL", "https://api.kimi.com/coding/v1")
MODEL = "kimi-for-coding"

REPORT_NAME = "章丘女郎山"
MD_PATH = MARKDOWN_DIR / f"{REPORT_NAME}.md"
OUTPUT_JSON = JSON_DIR / f"{REPORT_NAME}.json"
CHECKPOINT_JSON = JSON_DIR / f"{REPORT_NAME}_checkpoint.json"
ERROR_LOG = JSON_DIR / f"{REPORT_NAME}_errors.json"

# 受控词表（用于后处理校验）
VALID_TOMB_FORMS = [
    "土坑竖穴墓", "土坑洞室墓", "砖室墓", "砖椁墓", "石室墓",
    "土坑竖穴砖椁墓", "舟形墓", "瓮棺墓", "其他"
]
VALID_EVIDENCE_FIELDS = [
    "tomb_form", "chronology", "social_rank", "wealth", "ethnicity",
    "burial_custom", "artifact_combination", "other"
]
VALID_EVIDENCE_TYPES = [
    "coin_type", "artifact_typology", "tomb_structure", "regional_comparison",
    "stratigraphy", "report_citation", "text_description", "image_plan",
    "image_section", "radiocarbon", "dna", "historical_record", "other"
]
VALID_EVIDENCE_CONFIDENCE = ["high", "medium", "low", "uncertain"]
VALID_REVIEW_STATUS = ["pending", "confirmed", "disputed", "needs_review"]

# 重试 / rate limit 参数
MAX_RETRIES = 6
BASE_DELAY = 1.0          # 首次重试等待秒数
RATE_LIMIT_DELAY = 0.8    # 正常调用间隔
SAVE_EVERY = 5            # 每 N 座墓葬写一次 checkpoint

# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------
SINGLE_TOMB_PROMPT = '''你是一位中国墓葬考古研究助理。请阅读以下单个墓葬的描述，提取结构化信息。

输出要求：
1. 只返回一个 JSON 对象，不要 Markdown 格式说明，不要 JSON 数组包装。
2. 如果某字段原文未提及，使用 null 或 "未提及"，不要编造。
3. evidence_records 的 interpretation_field 和 evidence_type 必须使用下面英文候选值；uncertainty_records 的 review_status 必须使用英文候选值。

候选形制单标签：
土坑竖穴墓 | 土坑洞室墓 | 砖室墓 | 砖椁墓 | 石室墓 | 土坑竖穴砖椁墓 | 舟形墓 | 瓮棺墓 | 其他

字段：
- tomb_id: 墓葬编号
- site_name: 遗址/墓地名称
- location: 地理位置
- tomb_form: 墓葬形制主标签（单标签）
- tomb_form_confidence: 形制判断置信度（高/中/低）
- tomb_form_basis: 形制判断依据（文字描述/平面图/剖面图/图文一致/图文冲突）
- tomb_type: 报告原文称谓或复合形制描述
- orientation: 墓葬方向
- passage: 墓道有无及方向
- chamber_shape: 墓室平面形状（长方形/梯形/方形/圆形/椭圆形/舟形/不规则/未提及）
- chamber_size: 墓室尺寸（长×宽×深，厘米）
- sealing: 封门方式（无/夯土/砖封门/石封门/木板/未提及）
- coffin: 棺椁情况
- platform: 二层台有无（无/有（生土）/有（熟土）/未提及）
- niche: 壁龛有无（头龛/足龛/侧龛，数量）
- flooring: 铺地材料（无/青砖/石板/夯土/白灰/未提及）
- burial_position: 葬式（直肢/屈肢/二次葬/扰乱葬/仰身直肢/侧身屈肢/俯身/未提及）
- head_direction: 头向
- bone_preservation: 人骨保存情况（完好/较差/仅存牙齿/不存/未提及）
- sacrificial_animals: 殉葬动物种类及位置
- artifact_distribution: 随葬品空间分布
- artifact_types: 器类列表
- artifact_count: 随葬品总数
- artifact_combination: 组合描述
- special_artifacts: 特殊器物（铜鍑/带扣/马具等）
- reported_date: 报告定年
- dated_material: 纪年材料有无
- dating_basis: 定年依据
- special_customs: 特殊葬俗
- reported_ethnicity: 报告族属判断
- evidence_records: 证据数组（每条含 interpretation_field, evidence_type, evidence_content, report_citation, evidence_confidence）
- uncertainty_records: 不确定性数组（每条含 field_name, confidence_score, competing_interpretations, reviewer_notes, review_status）
- note: 其他备注

evidence_records 受控词表（必须英文）：
- interpretation_field: tomb_form / chronology / social_rank / wealth / ethnicity / burial_custom / artifact_combination / other
- evidence_type: coin_type / artifact_typology / tomb_structure / regional_comparison / stratigraphy / report_citation / text_description / image_plan / image_section / radiocarbon / dna / historical_record / other
- evidence_confidence: high / medium / low / uncertain

uncertainty_records 受控词表（必须英文）：
- review_status: pending / confirmed / disputed / needs_review
'''

# ---------------------------------------------------------------------------
# 工具函数
# ---------------------------------------------------------------------------
def chunk_tombs(md_text: str) -> List[str]:
    """按墓葬编号把报告切成单个墓葬段落。"""
    pattern = re.compile(r"(?=M\d+\s*位于)")
    chunks = pattern.split(md_text)
    return [c.strip() for c in chunks if re.match(r"M\d+\s*位于", c.strip())]


def extract_tomb_id(chunk: str) -> str:
    m = re.match(r"M\d+", chunk.strip())
    return m.group(0) if m else "unknown"


def normalize_value(value: Any, valid_values: List[str], default: str = "") -> Tuple[Any, bool]:
    """把中文字段值映射到受控词表；返回 (新值, 是否被修正)。"""
    if value is None:
        return value, False
    s = str(value).strip()
    if not s:
        return value, False
    if s in valid_values:
        return s, False
    # 常见中文 -> 英文映射
    mapping = {
        "高": "high", "中": "medium", "低": "low", "不确定": "uncertain",
        "待审核": "pending", "已确认": "confirmed", "有争议": "disputed", "需要复核": "needs_review",
        "形制": "tomb_form", "年代": "chronology", "社会等级": "social_rank",
        "财富": "wealth", "族属": "ethnicity", "葬俗": "burial_custom",
        "器物组合": "artifact_combination", "其他": "other",
        "钱币类型": "coin_type", "器物类型学": "artifact_typology", "墓葬结构": "tomb_structure",
        "区域比较": "regional_comparison", "地层学": "stratigraphy", "报告引文": "report_citation",
        "文字描述": "text_description", "平面图": "image_plan", "剖面图": "image_section",
        "碳十四": "radiocarbon", "DNA": "dna", "历史文献": "historical_record",
    }
    if s in mapping:
        return mapping[s], True
    # 尝试 case-insensitive 匹配
    lower_s = s.lower()
    for v in valid_values:
        if v.lower() == lower_s:
            return v, True
    return value, False


def validate_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """对单条记录做受控词表后处理，返回修正后的记录并添加 _validation_warnings。"""
    warnings = []

    # tomb_form
    if record.get("tomb_form") and record["tomb_form"] not in VALID_TOMB_FORMS:
        # 尝试从字符串中匹配
        for form in VALID_TOMB_FORMS:
            if form in str(record["tomb_form"]):
                record["tomb_form"] = form
                warnings.append(f"tomb_form normalized to '{form}'")
                break

    # evidence_records
    for ev in record.get("evidence_records", []):
        for field, valid in [
            ("interpretation_field", VALID_EVIDENCE_FIELDS),
            ("evidence_type", VALID_EVIDENCE_TYPES),
            ("evidence_confidence", VALID_EVIDENCE_CONFIDENCE),
        ]:
            new_val, fixed = normalize_value(ev.get(field), valid)
            if fixed:
                ev[field] = new_val
                warnings.append(f"evidence.{field} normalized to '{new_val}'")

    # uncertainty_records
    for un in record.get("uncertainty_records", []):
        new_val, fixed = normalize_value(un.get("review_status"), VALID_REVIEW_STATUS)
        if fixed:
            un["review_status"] = new_val
            warnings.append(f"uncertainty.review_status normalized to '{new_val}'")

    if warnings:
        record["_validation_warnings"] = warnings
    return record


def extract_single_tomb(chunk: str, api_key: str, base_url: str) -> Dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    messages = [
        {"role": "system", "content": SINGLE_TOMB_PROMPT},
        {"role": "user", "content": f"请提取以下墓葬信息：\n\n{chunk[:12000]}"}
    ]
    payload = {
        "model": MODEL,
        "messages": messages,
        "response_format": {"type": "json_object"},
        "temperature": 1,
    }
    resp = requests.post(f"{base_url}/chat/completions", headers=headers, json=payload, timeout=300)
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    try:
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            return parsed
        if isinstance(parsed, list) and len(parsed) > 0:
            return parsed[0]
        return {"error": "empty response", "raw": content}
    except json.JSONDecodeError:
        return {"error": "json decode failed", "raw": content[:500]}


def extract_single_tomb_with_retry(chunk: str, api_key: str, base_url: str) -> Dict[str, Any]:
    tomb_id = extract_tomb_id(chunk)
    last_exception = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = extract_single_tomb(chunk, api_key, base_url)
            if result.get("error"):
                raise RuntimeError(result.get("error"))
            result["_extraction_attempts"] = attempt
            return result
        except Exception as e:
            last_exception = e
            delay = BASE_DELAY * (2 ** (attempt - 1))
            print(f"  [{tomb_id}] 第 {attempt}/{MAX_RETRIES} 次失败: {e}，{delay:.1f}s 后重试...")
            time.sleep(delay)
    return {
        "error": f"max retries exceeded: {last_exception}",
        "tomb_id": tomb_id,
        "_extraction_attempts": MAX_RETRIES,
    }


def save_checkpoint(results: List[Dict[str, Any]], path: Path):
    path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")


def load_checkpoint(path: Path) -> List[Dict[str, Any]]:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return []


def load_errors(path: Path) -> List[Dict[str, Any]]:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return []


def init_database(db_path: Path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS tombs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tomb_id TEXT, site_name TEXT, location TEXT, tomb_form TEXT,
        tomb_form_confidence TEXT, tomb_form_basis TEXT, tomb_type TEXT,
        orientation TEXT, passage TEXT, chamber_shape TEXT, chamber_size TEXT,
        sealing TEXT, coffin TEXT, platform TEXT, niche TEXT, flooring TEXT,
        burial_position TEXT, head_direction TEXT, bone_preservation TEXT,
        sacrificial_animals TEXT, artifact_distribution TEXT, artifact_types TEXT,
        artifact_count TEXT, artifact_combination TEXT, special_artifacts TEXT,
        reported_date TEXT, dated_material TEXT, dating_basis TEXT,
        special_customs TEXT, reported_ethnicity TEXT,
        source_pdf TEXT, source_md TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS evidence_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tomb_id TEXT, site_name TEXT, interpretation_field TEXT,
        evidence_type TEXT, evidence_content TEXT, report_citation TEXT,
        evidence_confidence TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS uncertainty_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tomb_id TEXT, site_name TEXT, field_name TEXT,
        confidence_score REAL, competing_interpretations TEXT,
        reviewer_notes TEXT, review_status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    conn.close()


def import_to_db(json_path: Path, db_path: Path, report_name: str):
    init_database(db_path)
    conn = sqlite3.connect(db_path)
    tombs = json.loads(json_path.read_text(encoding="utf-8"))

    tomb_cols = [
        "tomb_id", "site_name", "location", "tomb_form", "tomb_form_confidence",
        "tomb_form_basis", "tomb_type", "orientation", "passage", "chamber_shape",
        "chamber_size", "sealing", "coffin", "platform", "niche", "flooring",
        "burial_position", "head_direction", "bone_preservation", "sacrificial_animals",
        "artifact_distribution", "artifact_types", "artifact_count",
        "artifact_combination", "special_artifacts", "reported_date",
        "dated_material", "dating_basis", "special_customs", "reported_ethnicity",
        "source_pdf", "source_md"
    ]

    for tomb in tombs:
        if tomb.get("error"):
            continue
        values = [str(tomb.get(c, "")) if tomb.get(c, "") is not None else "" for c in tomb_cols]
        placeholders = ", ".join(["?"] * len(tomb_cols))
        conn.execute(f"INSERT INTO tombs ({', '.join(tomb_cols)}) VALUES ({placeholders})", values)

        for ev in tomb.get("evidence_records", []):
            ev_cols = ["tomb_id", "site_name", "interpretation_field", "evidence_type", "evidence_content", "report_citation", "evidence_confidence"]
            ev_vals = [
                tomb.get("tomb_id", ""), tomb.get("site_name", ""),
                ev.get("interpretation_field", ""), ev.get("evidence_type", ""),
                ev.get("evidence_content", ""), ev.get("report_citation", ""),
                ev.get("evidence_confidence", "")
            ]
            conn.execute(f"INSERT INTO evidence_records ({', '.join(ev_cols)}) VALUES ({', '.join(['?'] * len(ev_cols))})", ev_vals)

        for un in tomb.get("uncertainty_records", []):
            un_cols = ["tomb_id", "site_name", "field_name", "confidence_score", "competing_interpretations", "reviewer_notes", "review_status"]
            un_vals = [
                tomb.get("tomb_id", ""), tomb.get("site_name", ""),
                un.get("field_name", ""), un.get("confidence_score", 0.5),
                un.get("competing_interpretations", ""), un.get("reviewer_notes", ""),
                un.get("review_status", "pending")
            ]
            conn.execute(f"INSERT INTO uncertainty_records ({', '.join(un_cols)}) VALUES ({', '.join(['?'] * len(un_cols))})", un_vals)

    conn.commit()
    conn.close()
    print(f"已导入 {len(tombs)} 座墓葬到 {db_path}")


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def main():
    if not KIMI_API_KEY:
        raise RuntimeError("KIMI_API_KEY 未设置")
    if not MD_PATH.exists():
        raise FileNotFoundError(f"找不到 Markdown 文件: {MD_PATH}")

    JSON_DIR.mkdir(exist_ok=True)

    md_text = MD_PATH.read_text(encoding="utf-8")
    chunks = chunk_tombs(md_text)
    print(f"[{datetime.now().isoformat()}] 识别到 {len(chunks)} 个墓葬段落")

    # 断点续跑：加载 checkpoint
    results = load_checkpoint(CHECKPOINT_JSON)
    errors = load_errors(ERROR_LOG)
    done_ids = {r.get("tomb_id") for r in results if not r.get("error")}
    print(f"已完成 {len(done_ids)} 座，上次错误 {len(errors)} 条")

    total_chunks = len(chunks)
    for i, chunk in enumerate(chunks, 1):
        tomb_id = extract_tomb_id(chunk)
        if tomb_id in done_ids:
            print(f"[{i}/{total_chunks}] {tomb_id} 已存在，跳过")
            continue

        print(f"[{i}/{total_chunks}] 抽取 {tomb_id} ...")
        try:
            result = extract_single_tomb_with_retry(chunk, KIMI_API_KEY, KIMI_BASE_URL)
            result = validate_record(result)
            result["tomb_id"] = tomb_id
            result["site_name"] = result.get("site_name") or REPORT_NAME
            result["source_md"] = MD_PATH.name
            result["source_pdf"] = f"{REPORT_NAME}.pdf"

            if result.get("error"):
                errors.append({
                    "tomb_id": tomb_id,
                    "index": i,
                    "error": result["error"],
                    "raw": result.get("raw", "")[:500],
                    "timestamp": datetime.now().isoformat(),
                })
                print(f"  [{tomb_id}] 最终失败，已记录 error log")

            results.append(result)
            done_ids.add(tomb_id)

            # 定期保存 checkpoint
            if len(results) % SAVE_EVERY == 0:
                save_checkpoint(results, CHECKPOINT_JSON)
                if errors:
                    ERROR_LOG.write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"  -> checkpoint 已保存，当前成功 {len([r for r in results if not r.get('error')])}/{len(results)}")

            time.sleep(RATE_LIMIT_DELAY)

        except Exception as e:
            print(f"  [{tomb_id}] 未捕获异常: {e}")
            traceback.print_exc()
            errors.append({
                "tomb_id": tomb_id,
                "index": i,
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            })

    # 最终保存
    save_checkpoint(results, CHECKPOINT_JSON)
    OUTPUT_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    if errors:
        ERROR_LOG.write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")

    success_count = len([r for r in results if not r.get("error")])
    print(f"\n[{datetime.now().isoformat()}] 完成")
    print(f"总墓葬: {len(chunks)}, 成功: {success_count}, 失败: {len(errors)}")
    print(f"JSON: {OUTPUT_JSON}")
    print(f"Checkpoint: {CHECKPOINT_JSON}")
    print(f"Error log: {ERROR_LOG}")

    # 导入数据库
    import_to_db(OUTPUT_JSON, DB_PATH, REPORT_NAME)


if __name__ == "__main__":
    main()
