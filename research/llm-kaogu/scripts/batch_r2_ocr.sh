#!/bin/bash
set -e

WORKDIR="/root/xiaohanchen/projects/vps-llm-kaogu"
PDF_DIR="$WORKDIR/data/r2-journals"
DB="$WORKDIR/kaogu.db"
LOG="$WORKDIR/logs/r2_ocr_$(date +%Y%m%d_%H%M%S).log"

mkdir -p "$PDF_DIR" "$WORKDIR/logs"

echo "=== R2 期刊 PDF OCR 批处理 ===" | tee "$LOG"
echo "开始时间: $(date)" | tee -a "$LOG"

# 1. 下载文物期刊
echo "" | tee -a "$LOG"
echo "--- 下载 文物期刊 ---" | tee -a "$LOG"
rclone copy r2:literature/考古期刊/文物/ "$PDF_DIR/文物/" --include "*.pdf" --progress 2>&1 | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "--- 下载 文物1972 ---" | tee -a "$LOG"
rclone copy r2:literature/考古期刊/文物1972/ "$PDF_DIR/文物1972/" --include "*.pdf" --progress 2>&1 | tee -a "$LOG"

# 2. 下载考古学报
echo "" | tee -a "$LOG"
echo "--- 下载 考古学报 ---" | tee -a "$LOG"
rclone copy r2:literature/考古期刊/考古学报/ "$PDF_DIR/考古学报/" --include "*.pdf" --progress 2>&1 | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "下载完成: $(date)" | tee -a "$LOG"
echo "PDF 数量:" | tee -a "$LOG"
find "$PDF_DIR" -name "*.pdf" | wc -l | tee -a "$LOG"

# 3. OCR 处理
echo "" | tee -a "$LOG"
echo "--- 开始 OCR 处理 ---" | tee -a "$LOG"

cd "$WORKDIR"
source .venv/bin/activate 2>/dev/null || true

for dir in "$PDF_DIR/文物" "$PDF_DIR/文物1972" "$PDF_DIR/考古学报"; do
    if [ -d "$dir" ]; then
        echo "" | tee -a "$LOG"
        echo "处理目录: $dir" | tee -a "$LOG"
        python scripts/ocr_pipeline.py --batch "$dir" --db "$DB" 2>&1 | tee -a "$LOG"
    fi
done

echo "" | tee -a "$LOG"
echo "=== 全部完成 ===" | tee -a "$LOG"
echo "结束时间: $(date)" | tee -a "$LOG"

# 最终统计
echo "" | tee -a "$LOG"
echo "--- 数据库统计 ---" | tee -a "$LOG"
sqlite3 "$DB" "SELECT COUNT(*) as 墓葬数 FROM tombs;" | tee -a "$LOG"
sqlite3 "$DB" "SELECT COUNT(*) as 器物数 FROM artifacts;" | tee -a "$LOG"
sqlite3 "$DB" "SELECT COUNT(*) as 报告数 FROM reports;" | tee -a "$LOG"

