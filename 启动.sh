#!/bin/bash

# 计数特征提取器 - 启动脚本
# 考古简报智能分析工具

echo "📊 计数特征提取器"
echo "================"
echo "考古简报智能分析工具"
echo ""

# 检查依赖
echo "📦 检查依赖..."
pip3 install -r requirements.txt -q 2>/dev/null

echo "✅ 依赖已就绪"
echo ""

# 启动应用
echo "🚀 正在启动..."
echo "   应用将在浏览器中自动打开"
echo "   按 Ctrl+C 停止运行"
echo ""

streamlit run app.py \
    --server.headless true \
    --browser.gatherUsageStats false \
    --theme.base "light" \
    --theme.primaryColor "#667eea" \
    --theme.backgroundColor "#ffffff" \
    --theme.secondaryBackgroundColor "#f8f9fa" \
    --theme.textColor "#1a1a2e"
