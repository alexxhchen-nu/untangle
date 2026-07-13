#!/usr/bin/env python3
"""
计数特征提取器 - 考古简报智能分析工具
专业的考古简报计数特征提取与分析平台
"""

import streamlit as st
import json
import pandas as pd
from pathlib import Path
import plotly.express as px
import plotly.graph_objects as go

from extractor_v5 import extract_v5

# ========== 页面配置 ==========
st.set_page_config(
    page_title="计数特征提取器 | 考古简报智能分析",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ========== 自定义样式 ==========
st.markdown("""
<style>
    /* 全局字体 */
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap');
    
    * {
        font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    /* 主标题 */
    .main-title {
        font-size: 2.2rem;
        font-weight: 700;
        color: #1a1a2e;
        text-align: center;
        margin: 0.5rem 0;
        letter-spacing: 0.05em;
    }
    
    .sub-title {
        font-size: 1rem;
        color: #666;
        text-align: center;
        margin-bottom: 2rem;
    }
    
    /* 卡片样式 */
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.2rem;
        border-radius: 12px;
        color: white;
        text-align: center;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
    
    .metric-value {
        font-size: 2rem;
        font-weight: 700;
        margin: 0.3rem 0;
    }
    
    .metric-label {
        font-size: 0.85rem;
        opacity: 0.9;
    }
    
    /* 区域标题 */
    .section-header {
        font-size: 1.3rem;
        font-weight: 600;
        color: #1a1a2e;
        padding: 0.8rem 0;
        border-bottom: 3px solid #667eea;
        margin: 1.5rem 0 1rem 0;
    }
    
    /* 模式卡片 */
    .pattern-card {
        background: white;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 1rem;
        margin: 0.5rem 0;
        transition: all 0.2s ease;
    }
    
    .pattern-card:hover {
        border-color: #667eea;
        box-shadow: 0 2px 12px rgba(102, 126, 234, 0.15);
    }
    
    .pattern-type {
        font-weight: 600;
        color: #667eea;
        font-size: 0.9rem;
    }
    
    .pattern-example {
        color: #666;
        font-size: 0.85rem;
        margin-top: 0.3rem;
    }
    
    .pattern-count {
        font-weight: 700;
        color: #1a1a2e;
        float: right;
    }
    
    /* 器物标签 */
    .artifact-tag {
        display: inline-block;
        background: #f0f2ff;
        color: #667eea;
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        margin: 0.2rem;
        font-size: 0.85rem;
    }
    
    .artifact-tag.copper { background: #fff3e0; color: #e65100; }
    .artifact-tag.pottery { background: #fce4ec; color: #c62828; }
    .artifact-tag.jade { background: #e8f5e9; color: #2e7d32; }
    .artifact-tag.gold { background: #fff8e1; color: #f57f17; }
    
    /* 墓葬卡片 */
    .tomb-card {
        background: white;
        border: 1px solid #e8e8e8;
        border-radius: 12px;
        padding: 1.5rem;
        margin: 1rem 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .tomb-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.8rem;
        border-bottom: 1px solid #f0f0f0;
    }
    
    .tomb-id {
        font-size: 1.2rem;
        font-weight: 700;
        color: #667eea;
    }
    
    .tomb-structure {
        background: #f8f9fa;
        padding: 0.3rem 0.8rem;
        border-radius: 4px;
        font-size: 0.85rem;
        color: #666;
    }
    
    /* 统计表格 */
    .stat-table {
        width: 100%;
        border-collapse: collapse;
    }
    
    .stat-table th {
        background: #f8f9fa;
        padding: 0.6rem;
        text-align: left;
        font-weight: 600;
        color: #1a1a2e;
        border-bottom: 2px solid #667eea;
    }
    
    .stat-table td {
        padding: 0.6rem;
        border-bottom: 1px solid #f0f0f0;
    }
    
    /* 按钮样式 */
    .stButton > button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.6rem 1.5rem;
        font-weight: 600;
        transition: all 0.2s ease;
    }
    
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    
    /* 隐藏默认元素 */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    .stDeployButton {display: none;}
    
    /* 侧边栏样式 */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
    }
    
    /* 分隔线 */
    hr {
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent, #667eea, transparent);
        margin: 2rem 0;
    }
</style>
""", unsafe_allow_html=True)


def format_number(n, decimals=1):
    """格式化数字"""
    if n is None:
        return "-"
    if isinstance(n, int) or (isinstance(n, float) and n == int(n)):
        return str(int(n))
    return f"{n:.{decimals}f}"


def get_artifact_class(name: str) -> str:
    """获取器物标签样式"""
    if '铜' in name or '青铜' in name:
        return 'copper'
    elif '陶' in name:
        return 'pottery'
    elif '玉' in name:
        return 'jade'
    elif '金' in name or '银' in name:
        return 'gold'
    return ''


def main():
    """主函数"""
    
    # ========== 标题区域 ==========
    st.markdown('<div class="main-title">📊 计数特征提取器</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">考古简报智能分析工具 · 两阶段提取技术</div>', unsafe_allow_html=True)
    
    st.markdown("---")
    
    # ========== 侧边栏 ==========
    with st.sidebar:
        st.markdown("### 📁 数据输入")
        
        input_method = st.radio(
            "选择输入方式",
            ["上传文件", "粘贴文本", "使用示例"],
            label_visibility="collapsed"
        )
        
        text_content = ""
        
        if input_method == "上传文件":
            uploaded_file = st.file_uploader(
                "上传考古简报文件",
                type=["md", "txt"],
                help="支持 Markdown 和纯文本格式"
            )
            if uploaded_file:
                text_content = uploaded_file.read().decode("utf-8")
                st.success(f"✅ 已加载: {uploaded_file.name}")
                
        elif input_method == "粘贴文本":
            text_content = st.text_area(
                "粘贴考古简报内容",
                height=200,
                placeholder="请在此粘贴考古简报文本..."
            )
            
        elif input_method == "使用示例":
            example_files = get_example_files()
            if example_files:
                selected = st.selectbox(
                    "选择示例文件",
                    [""] + example_files,
                    format_func=lambda x: Path(x).name if x else "请选择..."
                )
                if selected:
                    with open(selected, 'r', encoding='utf-8') as f:
                        text_content = f.read()
                    st.success(f"✅ 已加载: {Path(selected).name}")
        
        st.markdown("---")
        
        st.markdown("### ℹ️ 功能说明")
        st.markdown("""
        **阶段一：模式发现**
        - 自动扫描全文
        - 识别所有计数模式
        - 统计模式频率
        
        **阶段二：精确提取**
        - 基于发现的模式
        - 按墓葬提取数据
        - 生成结构化报告
        """)
        
        st.markdown("---")
        st.markdown(
            '<div style="text-align: center; color: #999; font-size: 0.8rem;">'
            '计数特征提取器 v1.0<br>考古简报智能分析工具'
            '</div>',
            unsafe_allow_html=True
        )
    
    # ========== 主内容区 ==========
    if not text_content:
        # 空状态
        st.markdown("""
        <div style="text-align: center; padding: 4rem 2rem; color: #999;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📊</div>
            <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">开始分析</div>
            <div>请在左侧上传文件或粘贴文本</div>
        </div>
        """, unsafe_allow_html=True)
        return
    
    # 执行提取
    with st.spinner("正在分析中..."):
        report = extract_v5(text_content)
    
    # ========== 总览指标 ==========
    summary = report.get('summary', {})
    phase1 = report.get('phase1_patterns', {})
    phase2 = report.get('phase2_extraction', {})
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">墓葬数量</div>
            <div class="metric-value">{summary.get('total_tombs', 0)}</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">器物总数</div>
            <div class="metric-value">{summary.get('total_artifacts', 0)}</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        patterns = phase1.get('statistics', {}).get('total_patterns', 0)
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">发现模式</div>
            <div class="metric-value">{patterns}</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        artifact_names = phase1.get('statistics', {}).get('artifact_names', [])
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">器物类型</div>
            <div class="metric-value">{len(artifact_names)}</div>
        </div>
        """, unsafe_allow_html=True)
    
    st.markdown("<hr>", unsafe_allow_html=True)
    
    # ========== 阶段一：模式发现 ==========
    st.markdown('<div class="section-header">🔍 阶段一：模式发现</div>', unsafe_allow_html=True)
    
    discovered_patterns = phase1.get('discovered_patterns', [])
    
    if discovered_patterns:
        col_pattern1, col_pattern2 = st.columns([2, 1])
        
        with col_pattern1:
            # 模式列表
            st.markdown("**发现的计数模式：**")
            
            for p in discovered_patterns[:8]:
                st.markdown(f"""
                <div class="pattern-card">
                    <span class="pattern-count">{p['frequency']} 次</span>
                    <div class="pattern-type">{p['type']}</div>
                    <div class="pattern-example">示例: {p['example']}</div>
                </div>
                """, unsafe_allow_html=True)
        
        with col_pattern2:
            # 模式分布图
            pattern_data = pd.DataFrame(discovered_patterns[:8])
            if not pattern_data.empty:
                fig = px.bar(
                    pattern_data,
                    x='frequency',
                    y='type',
                    orientation='h',
                    title="模式频率分布",
                    color='frequency',
                    color_continuous_scale='Blues'
                )
                fig.update_layout(
                    height=350,
                    showlegend=False,
                    margin=dict(l=0, r=0, t=30, b=0)
                )
                st.plotly_chart(fig, use_container_width=True)
    
    # 发现的器物名称
    if artifact_names:
        st.markdown("**发现的器物名称：**")
        
        # 按类别分组
        categories = {}
        for name in artifact_names:
            if '铜' in name:
                categories.setdefault('铜器', []).append(name)
            elif '陶' in name:
                categories.setdefault('陶器', []).append(name)
            elif '玉' in name:
                categories.setdefault('玉器', []).append(name)
            elif '金' in name or '银' in name:
                categories.setdefault('金银器', []).append(name)
            elif '铁' in name:
                categories.setdefault('铁器', []).append(name)
            else:
                categories.setdefault('其他', []).append(name)
        
        tags_html = ""
        for cat, names in categories.items():
            css_class = get_artifact_class(names[0]) if names else ''
            for name in names:
                tags_html += f'<span class="artifact-tag {css_class}">{name}</span>'
        
        st.markdown(f'<div style="margin: 0.5rem 0;">{tags_html}</div>', unsafe_allow_html=True)
    
    st.markdown("<hr>", unsafe_allow_html=True)
    
    # ========== 阶段二：精确提取 ==========
    st.markdown('<div class="section-header">📋 阶段二：精确提取</div>', unsafe_allow_html=True)
    
    tomb_data = phase2.get('tomb_data', [])
    
    if tomb_data:
        # 类别分布图
        category_dist = summary.get('category_distribution', {})
        if category_dist:
            col_chart1, col_chart2 = st.columns(2)
            
            with col_chart1:
                fig = px.pie(
                    names=list(category_dist.keys()),
                    values=list(category_dist.values()),
                    title="器物类别分布",
                    hole=0.4,
                    color_discrete_sequence=px.colors.qualitative.Set2
                )
                fig.update_layout(height=300, margin=dict(l=0, r=0, t=30, b=0))
                st.plotly_chart(fig, use_container_width=True)
            
            with col_chart2:
                # 各墓葬器物数量
                tomb_counts = [{'墓葬': t['tomb_id'], '数量': t['total_count']} for t in tomb_data]
                df_counts = pd.DataFrame(tomb_counts)
                
                fig = px.bar(
                    df_counts,
                    x='墓葬',
                    y='数量',
                    title="各墓葬器物数量",
                    color='数量',
                    color_continuous_scale='Blues'
                )
                fig.update_layout(height=300, margin=dict(l=0, r=0, t=30, b=0))
                st.plotly_chart(fig, use_container_width=True)
        
        # 各墓葬详情
        st.markdown("**各墓葬详细信息：**")
        
        for tomb in tomb_data:
            tomb_id = tomb['tomb_id']
            structure = tomb['structure']
            
            with st.expander(f"🏺 {tomb_id} · {structure.get('type', '未知结构')} · {tomb['total_count']} 件器物"):
                
                # 墓葬形制
                col_s1, col_s2, col_s3 = st.columns(3)
                
                with col_s1:
                    st.markdown(f"""
                    **结构信息**
                    - 类型: {structure.get('type', '-')}
                    - 形状: {structure.get('shape', '-')}
                    - 方向: {structure.get('direction', '-')}
                    """)
                
                with col_s2:
                    st.markdown(f"""
                    **尺寸信息**
                    - 长: {format_number(structure.get('length'))} 米
                    - 宽: {format_number(structure.get('width'))} 米
                    - 深: {format_number(structure.get('depth'))} 米
                    """)
                
                with col_s3:
                    st.markdown(f"""
                    **其他信息**
                    - 面积: {format_number(structure.get('area'))} ㎡
                    - 墓道: {'有' if structure.get('has_passage') else '无'}
                    - 特征: {', '.join(tomb.get('special_features', [])) or '-'}
                    """)
                
                # 器物列表
                artifacts = tomb.get('artifacts', [])
                if artifacts:
                    st.markdown("**器物列表：**")
                    
                    artifact_data = []
                    for a in artifacts:
                        artifact_data.append({
                            '编号': a.get('id', '-'),
                            '名称': a.get('name', '-'),
                            '类别': a.get('category', '-'),
                            '数量': a.get('count', 1)
                        })
                    
                    df = pd.DataFrame(artifact_data)
                    st.dataframe(df, use_container_width=True, hide_index=True)
                
                # 类别统计
                categories = tomb.get('categories', {})
                if categories:
                    st.markdown(f"**类别统计:** {' · '.join(f'{cat}({count})' for cat, count in categories.items())}")
    
    st.markdown("<hr>", unsafe_allow_html=True)
    
    # ========== 导出区域 ==========
    st.markdown('<div class="section-header">📥 导出结果</div>', unsafe_allow_html=True)
    
    col_dl1, col_dl2, col_dl3 = st.columns(3)
    
    with col_dl1:
        json_data = json.dumps(report, ensure_ascii=False, indent=2)
        st.download_button(
            "📄 下载 JSON 报告",
            json_data,
            "计数特征报告.json",
            "application/json",
            use_container_width=True
        )
    
    with col_dl2:
        # CSV 器物明细
        csv_data = []
        for tomb in tomb_data:
            for artifact in tomb.get('artifacts', []):
                csv_data.append({
                    '墓葬': tomb['tomb_id'],
                    '器物编号': artifact.get('id', ''),
                    '器物名称': artifact.get('name', ''),
                    '类别': artifact.get('category', ''),
                    '数量': artifact.get('count', 1),
                    '结构类型': tomb['structure'].get('type', ''),
                })
        
        if csv_data:
            df_csv = pd.DataFrame(csv_data)
            st.download_button(
                "📊 下载 CSV 明细",
                df_csv.to_csv(index=False, encoding='utf-8-sig'),
                "器物明细.csv",
                "text/csv",
                use_container_width=True
            )
    
    with col_dl3:
        # CSV 模式统计
        if discovered_patterns:
            pattern_csv = pd.DataFrame(discovered_patterns)
            st.download_button(
                "📈 下载模式统计",
                pattern_csv.to_csv(index=False, encoding='utf-8-sig'),
                "模式统计.csv",
                "text/csv",
                use_container_width=True
            )


def get_example_files():
    """获取示例文件"""
    desktop = Path.home() / "Desktop"
    md_files = list(desktop.glob("**/*.md"))
    
    jul11_data = Path.home() / "dev" / "projects" / "jul11_data" / "md"
    if jul11_data.exists():
        md_files.extend(list(jul11_data.glob("**/*.md")))
    
    return sorted(set(str(f) for f in md_files[:20]))


if __name__ == "__main__":
    main()
