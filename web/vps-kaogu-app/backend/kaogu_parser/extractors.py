"""
Auto-detection and extraction logic for archaeological reports.
Adapted from template_parse_tombs.py.
"""

import re
from .tomb_parser import WebTombParser


# Tomb type patterns
TOMB_TYPES = [
    "土坑竖穴砖椁墓", "梯形土坑竖穴墓", "长方形土坑竖穴墓", "土坑竖穴墓",
    "土坑洞室墓", "砖室墓", "舟形墓", "砖、石室墓", "石室墓",
    "土坑墓", "洞室墓", "竖穴土坑墓", "砖椁墓", "木椁墓", "崖墓", "土洞墓",
    "梯形土坑竖穴", "长方形土坑竖穴", "土坑竖穴",
]

# Dynasty keywords
DYNASTY_KEYWORDS = {
    '商': '商代', '周': '周代', '西周': '西周', '东周': '东周',
    '春秋': '春秋', '战国': '战国',
    '秦': '秦代', '汉': '汉代', '西汉': '西汉', '东汉': '东汉',
    '三国': '三国', '魏晋': '魏晋', '晋': '晋代',
    '南朝': '南朝', '北朝': '北朝', '十六国': '十六国',
    '隋': '隋代', '唐': '唐代', '五代': '五代',
    '宋': '宋代', '北宋': '北宋', '南宋': '南宋',
    '辽': '辽代', '金': '金代', '西夏': '西夏',
    '元': '元代', '明': '明代', '清': '清代',
    '近现代': '近现代', '现代': '近现代',
}


def detect_report_type(content: str) -> str:
    """Detect whether the report is tomb-focused or a site report."""
    lines = content.splitlines(keepends=True)

    # Count tomb headers (## M\d+ patterns)
    tomb_header_count = 0
    for line in lines:
        if re.match(r'^#{1,3}\s*(?:[一二三四五六七八九十百千]+[、．.\s]+\s*)?(?:\d+[、．.\s]+\s*)?(M\s*\d+)\b', line):
            tomb_header_count += 1

    # Count "M\d+位于" description patterns
    desc_count = len(re.findall(r'M\s*\d+\s*位于', content))

    if tomb_header_count >= 1 or desc_count >= 1:
        return "tomb_focused"

    # Check for prefixed tomb IDs
    prefixed = len(re.findall(r'[A-Z]+M\d+', content))
    if prefixed >= 5:
        return "prefixed_ids"

    return "site_report"


def detect_dynasty_chapters(content: str) -> list[tuple[int, int, str]]:
    """Detect dynasty chapter boundaries from headers."""
    lines = content.splitlines(keepends=True)
    chapters = []

    for i, line in enumerate(lines):
        # Match chapter headers like 第二章, 第三章, etc.
        m = re.match(r'^#+\s*第([二三四五六七八九十百]+)章', line)
        if m:
            chapter_num = m.group(1)
            # Try to find dynasty name in the header or nearby lines
            dynasty = ""
            nearby = ' '.join(lines[i:min(i+3, len(lines))])
            for kw, name in DYNASTY_KEYWORDS.items():
                if kw in nearby:
                    dynasty = name
                    break
            chapters.append((i + 1, chapter_num, dynasty))

    # Fill in end lines
    result = []
    for idx, (start, num, dynasty) in enumerate(chapters):
        if idx + 1 < len(chapters):
            end = chapters[idx + 1][0] - 1
        else:
            end = len(lines)
        result.append((start, end, dynasty))

    return result


def get_dynasty_from_context(line_num: int, chapters: list[tuple[int, int, str]]) -> str:
    """Get dynasty for a given line number based on chapter boundaries."""
    for start, end, dynasty in chapters:
        if start <= line_num <= end:
            return dynasty
    return ""


def extract_tomb_type(text: str) -> str:
    """Extract tomb type from description text."""
    text_no_space = text.replace(' ', '')
    for t in TOMB_TYPES:
        if t in text_no_space:
            return t
    return ""


def extract_artifacts_from_desc(text: str, tomb_id: str) -> list[dict]:
    """Extract artifacts from tomb description paragraph."""
    artifacts = []

    # Check for "无随葬品" or "未发现...随葬品"
    if '无随葬品' in text or '未发现' in text and '随葬品' in text:
        return artifacts

    # Try "随葬品有..." pattern first
    m = re.search(r'随葬品有(.+?)(?:$|(?:图\d|图版))', text, re.DOTALL)
    if m:
        desc = m.group(1)
    else:
        # Try inline "随葬N件XXX" or "随葬品为N件XXX" or "随葬品共N件"
        desc = text

    # Words that are not artifact names
    SKIP_WORDS = {'随葬', '随葬品', '随葬品为', '随葬品有', '随葬品共', '随葬的',
                  '墓主', '其中', '口含', '放置', '出土', '发现', '位于',
                  '品为', '品有', '品共', '的', '左侧', '右侧', '足部', '头部',
                  '足端', '头端', '保存', '较差', '较好', '墓底', '墓口'}

    seen_names = set()

    # Pattern 1: "N件/枚XXX" — name after number (most common: "1件陶鬲")
    for m in re.finditer(r'(\d+)\s*(?:件|枚|把|具|颗|面)\s*([\u4e00-\u9fff]{2,5}?)(?=[，。；、（(）)图版\s\n]|位于|置于|放|在|墓|$)', desc):
        name = m.group(2).strip()
        count = int(m.group(1))
        if not name or name in SKIP_WORDS or name in seen_names:
            continue
        if not (WebTombParser.classify_material(name) != '其他' or
                WebTombParser.classify_vessel_type(name) != name):
            continue
        seen_names.add(name)
        artifacts.append({
            "器物编号": f"{tomb_id}:{len(artifacts)+1}",
            "器物名称": name,
            "材质": WebTombParser.classify_material(name),
            "器型": WebTombParser.classify_vessel_type(name),
            "数量": count,
            "特征描述": ""
        })

    # Pattern 2: "XXX N件" — name before number (structured lists like "蛋形瓮14件")
    for m in re.finditer(r'([\u4e00-\u9fff]{2,6})\s*(\d+)\s*(?:件|枚|把|具|颗)', desc):
        name = m.group(1).strip()
        name = re.sub(r'^(?:其中|随葬|出土)', '', name)
        name = name.strip()
        count = int(m.group(2))
        if not name or name in SKIP_WORDS or name in seen_names:
            continue
        if not (WebTombParser.classify_material(name) != '其他' or
                WebTombParser.classify_vessel_type(name) != name):
            continue
        seen_names.add(name)
        artifacts.append({
            "器物编号": f"{tomb_id}:{len(artifacts)+1}",
            "器物名称": name,
            "材质": WebTombParser.classify_material(name),
            "器型": WebTombParser.classify_vessel_type(name),
            "数量": count,
            "特征描述": ""
        })

    return artifacts


def extract_detailed_artifacts(text: str, tomb_id: str) -> list[dict]:
    """Extract detailed artifact descriptions."""
    artifacts = []
    pattern = r'^([\u4e00-\u9fff]+)\s+(\d+)\s*件[。.]?\s*(?:（(M\d+:\d+(?:-\d+)?)）)?\s*(.+?)(?=\n\n|\n<|\n##|\Z)'

    for m in re.finditer(pattern, text, re.MULTILINE | re.DOTALL):
        name = m.group(1)
        name = re.sub(r'^其中', '', name)
        count = int(m.group(2))
        item_id = m.group(3) if m.group(3) else f"{tomb_id}:{len(artifacts)+1}"
        desc = m.group(4).strip()
        desc = re.sub(r'图\s*[\d-]+', '', desc)
        desc = re.sub(r'图版\s*[\d-]+', '', desc)
        desc = desc.strip()

        artifacts.append({
            "器物编号": item_id,
            "器物名称": name,
            "材质": WebTombParser.classify_material(name),
            "器型": WebTombParser.classify_vessel_type(name),
            "数量": count,
            "特征描述": desc[:200] if desc else ""
        })

    return artifacts


def parse_tomb_focused(parser: WebTombParser, content: str) -> None:
    """Parse a tomb-focused report with M+number headers."""
    lines = content.splitlines(keepends=True)
    chapters = detect_dynasty_chapters(content)

    # Find tomb headers
    tomb_headers = []
    for i, line in enumerate(lines):
        m = re.match(r'^#{1,3}\s*(?:[一二三四五六七八九十百千]+[、．.\s]+\s*)?(?:\d+[、．.\s]+\s*)?(M\s*\d+)\b', line)
        if m:
            tomb_id = m.group(1).replace(' ', '')
            tomb_headers.append((i + 1, tomb_id))

    for idx, (line_num, tomb_id) in enumerate(tomb_headers):
        start_line = line_num - 1
        if idx + 1 < len(tomb_headers):
            end_line = tomb_headers[idx + 1][0] - 1
        else:
            end_line = len(lines)

        tomb_text = ''.join(lines[start_line:end_line])
        tomb_text_clean = re.sub(r'<div[^>]*>.*?</div>', ' ', tomb_text, flags=re.DOTALL)
        tomb_text_clean = re.sub(r'\s+', ' ', tomb_text_clean)

        dynasty = get_dynasty_from_context(line_num, chapters)

        # If no dynasty from chapters, try to detect from text
        if not dynasty:
            for kw, name in DYNASTY_KEYWORDS.items():
                if kw in tomb_text[:200]:
                    dynasty = name
                    break

        desc_match = re.search(r'(M\s*\d+\s*位于.+?图\s*[\d-]+[）\)])', tomb_text_clean, re.DOTALL)
        if not desc_match:
            # Take everything until next header or HTML div block (greedy across paragraphs)
            desc_match = re.search(r'(M\s*\d+\s*位于.+?)(?=\n##|\n<div|\n\n\n|\Z)', tomb_text, re.DOTALL)

        if not desc_match:
            parser.add_tomb({
                "墓葬编号": tomb_id,
                "年代": dynasty,
                "备注": "描述未找到",
            })
            continue

        desc = desc_match.group(1)
        direction = WebTombParser.extract_direction(desc)
        tomb_type = extract_tomb_type(tomb_text_clean)
        dims = WebTombParser.extract_dimensions(desc)

        notes = []
        if '被盗' in desc or '盗扰' in desc:
            notes.append("盗扰")
        if '迁葬' in desc:
            notes.append("迁葬")
        if '合葬' in desc:
            notes.append("合葬")
        if '打破' in desc:
            notes.append("被打破")

        artifacts = extract_artifacts_from_desc(desc, tomb_id)
        detailed = extract_detailed_artifacts(tomb_text, tomb_id)
        if detailed and not artifacts:
            artifacts = detailed
        elif detailed:
            detailed_dict = {a['器物名称']: a for a in detailed}
            for a in artifacts:
                if a['器物名称'] in detailed_dict:
                    d = detailed_dict[a['器物名称']]
                    if d['特征描述'] and not a['特征描述']:
                        a['特征描述'] = d['特征描述']
                    if d['器物编号'] and ':' in d['器物编号']:
                        a['器物编号'] = d['器物编号']

        parser.add_tomb({
            "墓葬编号": tomb_id,
            "年代": dynasty,
            "墓向": direction,
            "墓葬形制": tomb_type,
            "墓口长": dims["墓口长"],
            "墓口宽": dims["墓口宽"],
            "墓深": dims["墓深"],
            "发掘位置": "",
            "层位": "",
            "备注": "；".join(notes) if notes else "",
            "随葬器物": artifacts
        })


def parse_prefixed_ids(parser: WebTombParser, content: str) -> None:
    """Parse reports with prefixed tomb IDs (e.g., YSTG4AM1)."""
    lines = content.splitlines(keepends=True)

    # Find all prefixed tomb ID occurrences
    tomb_pattern = re.compile(r'([A-Z]+M(\d+))')
    seen_ids = set()

    for i, line in enumerate(lines):
        for m in tomb_pattern.finditer(line):
            full_id = m.group(1)
            if full_id in seen_ids:
                continue
            seen_ids.add(full_id)

            # Get context around this line
            start = max(0, i - 2)
            end = min(len(lines), i + 8)
            context = ''.join(lines[start:end])

            direction = WebTombParser.extract_direction(context)
            tomb_type = extract_tomb_type(context)
            dims = WebTombParser.extract_dimensions(context)

            # Try to detect dynasty from context
            dynasty = ""
            for kw, name in DYNASTY_KEYWORDS.items():
                if kw in context[:300]:
                    dynasty = name
                    break

            parser.add_tomb({
                "墓葬编号": full_id,
                "年代": dynasty,
                "墓向": direction,
                "墓葬形制": tomb_type,
                "墓口长": dims["墓口长"],
                "墓口宽": dims["墓口宽"],
                "墓深": dims["墓深"],
                "备注": "",
            })


def parse_site_report(parser: WebTombParser, content: str) -> None:
    """Parse site reports where tombs are mentioned incidentally."""
    lines = content.splitlines(keepends=True)
    seen_ids = set()

    for i, line in enumerate(lines):
        # Find M+number references
        for m in re.finditer(r'\b(M\s*(\d+))\b', line):
            tomb_id = m.group(1).replace(' ', '')
            if tomb_id in seen_ids:
                continue
            seen_ids.add(tomb_id)

            start = max(0, i - 2)
            end = min(len(lines), i + 6)
            context = ''.join(lines[start:end])

            direction = WebTombParser.extract_direction(context)
            tomb_type = extract_tomb_type(context)
            dims = WebTombParser.extract_dimensions(context)

            dynasty = ""
            for kw, name in DYNASTY_KEYWORDS.items():
                if kw in context[:300]:
                    dynasty = name
                    break

            artifacts = extract_artifacts_from_desc(context, tomb_id)

            parser.add_tomb({
                "墓葬编号": tomb_id,
                "年代": dynasty,
                "墓向": direction,
                "墓葬形制": tomb_type,
                "墓口长": dims["墓口长"],
                "墓口宽": dims["墓口宽"],
                "墓深": dims["墓深"],
                "备注": "",
                "随葬器物": artifacts
            })

    # Also look for bulk tomb mentions
    for i, line in enumerate(lines):
        m = re.search(r'(现代|近现代).*?(\d+)\s*座', line)
        if m:
            dynasty = m.group(1)
            count = int(m.group(2))
            parser.add_tomb({
                "墓葬编号": f"{dynasty}墓葬群",
                "年代": "近现代",
                "备注": f"报告记载共发现{count}座墓葬",
            })


def auto_parse(report_name: str, content: str) -> WebTombParser:
    """
    Main entry point: auto-detect report type and parse.
    Returns a populated WebTombParser instance.
    """
    # Clean HTML image tags but preserve newlines (needed for header detection)
    content = re.sub(r'<div[^>]*>.*?</div>', ' ', content, flags=re.DOTALL)

    # Fix OCR line-break artifacts: merge lines that break mid-word
    # e.g. "深0.5\n\n米" -> "深0.5米"
    lines = content.split('\n')
    merged = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            merged.append('')
            continue
        if merged:
            prev = merged[-1].rstrip()
            # Previous line ends with digit/dot and this line starts with a unit/continuation
            if prev and re.search(r'[\d.~]$', prev) and re.match(r'^[米厘米毫寸尺丈]', stripped):
                merged[-1] = prev + stripped
                continue
            # Previous line ends with digit and this starts with punctuation that continues the sentence
            if prev and re.search(r'[\d]$', prev) and re.match(r'^[，、。；：的和及与米]', stripped):
                merged[-1] = prev + stripped
                continue
        merged.append(line)
    content = '\n'.join(merged)

    parser = WebTombParser(report_name, content)
    report_type = detect_report_type(content)

    if report_type == "tomb_focused":
        parse_tomb_focused(parser, content)
    elif report_type == "prefixed_ids":
        parse_prefixed_ids(parser, content)
    else:
        parse_site_report(parser, content)

    parser.sort_tombs()

    total_artifacts = sum(len(t.get('随葬器物', [])) for t in parser.tombs)
    parser.source_note = (
        f"来源：{report_name}，"
        f"共提取{len(parser.tombs)}座墓葬，"
        f"{total_artifacts}件随葬器物。"
        f"报告类型：{report_type}"
    )

    return parser
