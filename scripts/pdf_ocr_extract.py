"""
PDF → Baidu OCR → structured tomb data extraction.
"""
import os, sys, json, base64, requests, argparse, fitz, re, time
from pathlib import Path

BAIDU_API_KEY = os.environ.get("BAIDU_OCR_API_KEY", "REDACTED")
BAIDU_SECRET = os.environ.get("BAIDU_OCR_SECRET_KEY", "REDACTED")

def get_access_token():
    url = "https://aip.baidubce.com/oauth/2.0/token"
    params = {"grant_type": "client_credentials", "client_id": BAIDU_API_KEY, "client_secret": BAIDU_SECRET}
    resp = requests.post(url, params=params)
    resp.raise_for_status()
    return resp.json()["access_token"]

def ocr_image(token, image_bytes):
    url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token={token}"
    img_b64 = base64.b64encode(image_bytes).decode()
    resp = requests.post(url, data={"image": img_b64}, headers={"Content-Type": "application/x-www-form-urlencoded"})
    result = resp.json()
    if "words_result" in result:
        return "\n".join(w["words"] for w in result["words_result"])
    return ""

def extract_tomb_data(text):
    tombs = []
    tomb_pattern = re.compile(r'([一二三四五六七八九十百]+号?墓|[Mm]\d+号?墓|第[一二三四五六七八九十]+号墓)')
    dim_pattern = re.compile(r'(\d+\.?\d*)\s*(?:米|厘米|cm|m)')
    artifact_pattern = re.compile(r'(陶|铜|铁|玉|石|骨|漆|木|金|银|贝|玛瑙|绿松)(器|罐|壶|鼎|豆|簋|爵|斝|觚|盘|盆|碗|杯|尊|罍|瓮|鬲|剑|戈|矛|刀|镞|戟|弩机|璧|琮|璜|玦|环|串珠|坠饰|带钩|耳环|手镯|铃|鼓|磬)')
    
    lines = text.split("\n")
    current_tomb = None
    
    for line in lines:
        tomb_match = tomb_pattern.search(line)
        if tomb_match:
            if current_tomb:
                tombs.append(current_tomb)
            current_tomb = {"墓葬编号": tomb_match.group(1), "原文": line, "尺寸": [], "器物": []}
        
        dim_match = dim_pattern.findall(line)
        if dim_match and current_tomb:
            current_tomb["尺寸"].extend([float(d) for d in dim_match])
        
        art_match = artifact_pattern.findall(line)
        if art_match and current_tomb:
            for m in art_match:
                current_tomb["器物"].append("".join(m))
    
    if current_tomb:
        tombs.append(current_tomb)
    return tombs

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_path")
    parser.add_argument("--pages", type=int, default=50)
    parser.add_argument("--start", type=int, default=30)
    parser.add_argument("--output", default="data/extracted")
    args = parser.parse_args()
    
    os.makedirs(args.output, exist_ok=True)
    
    print("Getting Baidu OCR token...")
    token = get_access_token()
    
    doc = fitz.open(args.pdf_path)
    end_page = min(args.start + args.pages, doc.page_count)
    print(f"Processing pages {args.start+1}-{end_page} from {args.pdf_path}")
    
    all_text = []
    all_tombs = []
    
    for i in range(args.start, end_page):
        page = doc[i]
        pix = page.get_pixmap(dpi=100)
        img_bytes = pix.tobytes("png")
        
        text = ocr_image(token, img_bytes)
        if text.strip():
            all_text.append(f"=== Page {i+1} ===\n{text}")
            tombs = extract_tomb_data(text)
            all_tombs.extend(tombs)
            if tombs:
                print(f"  Page {i+1}: {len(tombs)} tomb(s) — {[t['墓葬编号'] for t in tombs]}")
        
        if (i + 1) % 10 == 0:
            print(f"  Progress: {i+1}/{end_page} pages...")
        time.sleep(0.1)
    
    doc.close()
    
    stem = Path(args.pdf_path).stem
    text_path = os.path.join(args.output, f"{stem}_ocr.txt")
    tomb_path = os.path.join(args.output, f"{stem}_tombs.json")
    
    with open(text_path, "w") as f:
        f.write("\n\n".join(all_text))
    with open(tomb_path, "w") as f:
        json.dump(all_tombs, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*50}")
    print(f"Pages: {args.start+1}-{end_page}")
    print(f"Tomb references: {len(all_tombs)}")
    print(f"Files: {text_path}, {tomb_path}")
    
    if all_tombs:
        print(f"\nTomb summary:")
        for t in all_tombs[:10]:
            arts = ", ".join(t["器物"][:5]) if t["器物"] else "(no artifacts)"
            print(f"  {t['墓葬编号']}: {arts}")

if __name__ == "__main__":
    main()
