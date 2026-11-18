#!/usr/bin/env python3
"""
计数特征提取器 - 考古简报智能分析工具
新中式数字古典主义风格
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
    page_icon="鼎",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ========== 自定义样式 ==========
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap');
    
    /* ===== 全局 ===== */
    * {
        font-family: 'Noto Sans SC', -apple-system, 'PingFang SC', 'Heiti SC', sans-serif;
    }
    
    .stApp {
        background: #ffffff;
    }
    
    /* ===== 隐藏默认元素 ===== */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    .stDeployButton {display: none;}
    header[data-testid="stHeader"] {
        background: #ffffff !important;
    }
    
    /* ===== 侧边栏 ===== */
    [data-testid="stSidebar"] {
        background: #f8f9fa !important;
        border-right: 1px solid #dee2e6;
    }
    
    [data-testid="stSidebar"] .stMarkdown h3 {
        font-family: 'Noto Serif SC', serif;
        color: #111111;
        font-weight: 600;
        border-bottom: 2px solid #c0392b;
        padding-bottom: 0.5rem;
    }
    
    /* ===== Hero 区域 ===== */
    .hero-container {
        text-align: center;
        padding: 3rem 2rem 2rem;
        margin-bottom: 2rem;
    }
    
    .hero-subtitle {
        font-family: 'Noto Sans SC', sans-serif;
        font-size: 1rem;
        color: #333333;
        letter-spacing: 0.3em;
        margin-bottom: 0.8rem;
    }
    
    .hero-title {
        font-family: 'Noto Serif SC', 'Source Han Serif', serif;
        font-size: 3rem;
        font-weight: 700;
        color: #111111;
        letter-spacing: 0.15em;
        margin: 0.5rem 0;
        line-height: 1.4;
    }
    
    .hero-seal {
        display: inline-block;
        border: 2px solid #c0392b;
        color: #c0392b;
        padding: 6px 14px;
        font-size: 14px;
        font-family: 'Noto Serif SC', serif;
        transform: rotate(-6deg);
        margin-left: 1rem;
        vertical-align: middle;
        line-height: 1.2;
    }
    
    .hero-description {
        font-size: 0.95rem;
        color: #444444;
        margin-top: 1.2rem;
        letter-spacing: 0.1em;
    }
    
    /* ===== 指标卡片 ===== */
    .metric-card {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 1.2rem 1rem;
        text-align: center;
        transition: all 0.3s ease;
    }
    
    .metric-card:hover {
        border-color: #c0392b;
        box-shadow: 0 4px 20px rgba(192, 57, 43, 0.12);
    }
    
    .metric-value {
        font-family: 'Noto Serif SC', serif;
        font-size: 2.2rem;
        font-weight: 700;
        color: #111111;
        margin: 0.3rem 0;
    }
    
    .metric-label {
        font-size: 0.85rem;
        color: #333333;
        letter-spacing: 0.1em;
    }
    
    /* ===== 区域标题 ===== */
    .section-header {
        font-family: 'Noto Serif SC', serif;
        font-size: 1.4rem;
        font-weight: 600;
        color: #111111;
        padding: 1rem 0 0.8rem;
        border-bottom: 2px solid #c0392b;
        margin: 2rem 0 1.5rem 0;
        letter-spacing: 0.1em;
    }
    
    .section-header::before {
        content: "◆";
        color: #c0392b;
        margin-right: 0.5rem;
        font-size: 0.8em;
    }
    
    /* ===== 卡片 ===== */
    .content-card {
        background: #ffffff;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 1.2rem;
        margin: 0.8rem 0;
        transition: all 0.2s ease;
    }
    
    .content-card:hover {
        border-color: #c0392b;
        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    
    /* ===== 模式卡片 ===== */
    .pattern-card {
        background: #ffffff;
        border: 1px solid #dee2e6;
        border-left: 3px solid #c0392b;
        border-radius: 0 6px 6px 0;
        padding: 1rem 1.2rem;
        margin: 0.6rem 0;
    }
    
    .pattern-type {
        font-family: 'Noto Serif SC', serif;
        font-weight: 600;
        color: #111111;
        font-size: 0.95rem;
    }
    
    .pattern-example {
        color: #555555;
        font-size: 0.85rem;
        margin-top: 0.3rem;
        font-style: italic;
    }
    
    .pattern-count {
        font-family: 'Noto Serif SC', serif;
        font-weight: 700;
        color: #c0392b;
        float: right;
        font-size: 1.1rem;
    }
    
    /* ===== 器物标签 ===== */
    .artifact-tag {
        display: inline-block;
        background: #fce4ec;
        color: #8b2500;
        padding: 0.25rem 0.7rem;
        border-radius: 4px;
        margin: 0.25rem;
        font-size: 0.85rem;
        border: 1px solid #f8bbd0;
    }
    
    .artifact-tag.copper { 
        background: #fff3e0; 
        color: #8b4513; 
        border-color: #ffcc80;
    }
    .artifact-tag.pottery { 
        background: #efebe9; 
        color: #654321; 
        border-color: #d7ccc8;
    }
    .artifact-tag.jade { 
        background: #e8f5e9; 
        color: #2e7d32; 
        border-color: #a5d6a7;
    }
    .artifact-tag.gold { 
        background: #fffde7; 
        color: #f57f17; 
        border-color: #fff59d;
    }
    
    /* ===== 墓葬卡片 ===== */
    .tomb-card {
        background: #ffffff;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem 0;
    }
    
    .tomb-id {
        font-family: 'Noto Serif SC', serif;
        font-size: 1.3rem;
        font-weight: 700;
        color: #111111;
    }
    
    .tomb-structure {
        display: inline-block;
        background: #fce4ec;
        color: #8b2500;
        padding: 0.2rem 0.8rem;
        border-radius: 4px;
        font-size: 0.85rem;
        border: 1px solid #f8bbd0;
    }
    
    /* ===== 按钮 ===== */
    .stButton > button {
        background: #c0392b !important;
        color: white !important;
        border: none !important;
        border-radius: 6px !important;
        padding: 0.6rem 1.5rem !important;
        font-weight: 500 !important;
        letter-spacing: 0.05em;
        transition: all 0.2s ease !important;
    }
    
    .stButton > button:hover {
        background: #a93226 !important;
        box-shadow: 0 4px 15px rgba(192, 57, 43, 0.3) !important;
    }
    
    /* ===== 下载按钮 ===== */
    .stDownloadButton > button {
        background: #ffffff !important;
        color: #111111 !important;
        border: 1px solid #dee2e6 !important;
        border-radius: 6px !important;
    }
    
    .stDownloadButton > button:hover {
        border-color: #c0392b !important;
        color: #c0392b !important;
    }
    
    /* ===== 通知横幅 ===== */
    .notice-banner {
        background: #e3f2fd;
        color: #1565c0;
        font-size: 0.9rem;
        padding: 0.8rem 1.2rem;
        border-radius: 6px;
        margin: 1rem 0;
        border: 1px solid #bbdefb;
    }
    
    /* ===== 分隔线 ===== */
    hr {
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(192, 57, 43, 0.3), transparent);
        margin: 2rem 0;
    }
    
    /* ===== 数据表格 ===== */
    .stDataFrame {
        border-radius: 8px;
        overflow: hidden;
    }
    
    /* ===== Expander ===== */
    .streamlit-expanderHeader {
        font-family: 'Noto Serif SC', serif !important;
        background: #f8f9fa !important;
        border-radius: 8px !important;
        border: 1px solid #dee2e6 !important;
    }
    
    .streamlit-expanderContent {
        background: #ffffff !important;
        border-radius: 0 0 8px 8px !important;
        border: 1px solid #dee2e6 !important;
        border-top: none !important;
    }
    
    /* ===== 滚动条 ===== */
    ::-webkit-scrollbar {
        width: 8px;
    }
    ::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.02);
    }
    ::-webkit-scrollbar-thumb {
        background: rgba(192, 57, 43, 0.2);
        border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: rgba(192, 57, 43, 0.4);
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
    
    # ========== Hero 区域 ==========
    st.markdown("""
    <div class="hero-container">
        <div class="hero-subtitle">考古简报智能分析工具</div>
        <div class="hero-title">
            计数特征提取器
            <span class="hero-seal">AI<br>驅動版</span>
        </div>
        <div class="hero-description">两阶段智能提取 · 模式发现与精确提取</div>
    </div>
    """, unsafe_allow_html=True)
    
    # ========== 侧边栏 ==========
    with st.sidebar:
        st.markdown("### 数据输入")
        
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
                st.success(f"已加载: {uploaded_file.name}")
                
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
                    st.success(f"已加载: {Path(selected).name}")
        
        st.markdown("---")
        
        st.markdown("### 功能说明")
        st.markdown("""
        **阶段一：模式发现**
        - 自动扫描全文
        - 识别计数模式
        - 统计频率分布
        
        **阶段二：精确提取**
        - 基于模式提取
        - 按墓葬组织
        - 结构化输出
        """)
        
        st.markdown("---")
        st.markdown(
            '<div style="text-align: center; color: #999; font-size: 0.8rem; padding: 1rem 0;">'
            '<span style="font-family: Noto Serif SC, serif;">计数特征提取器</span><br>'
            'v1.0 · 考古简报智能分析'
            '</div>',
            unsafe_allow_html=True
        )
    
    # ========== 主内容区 ==========
    if not text_content:
        # 空状态
        st.markdown("""
        <div class="content-card" style="text-align: center; padding: 3rem 2rem; margin: 2rem 0;">
            <div style="font-family: 'Noto Serif SC', serif; font-size: 1.2rem; color: #666; margin-bottom: 0.5rem;">
                请上传文件或粘贴文本以开始分析
            </div>
            <div style="color: #999; font-size: 0.9rem;">
                支持 Markdown、纯文本格式的考古简报
            </div>
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
    st.markdown('<div class="section-header">阶段一：模式发现</div>', unsafe_allow_html=True)
    
    discovered_patterns = phase1.get('discovered_patterns', [])
    
    if discovered_patterns:
        col_pattern1, col_pattern2 = st.columns([2, 1])
        
        with col_pattern1:
            st.markdown('<div class="content-card">', unsafe_allow_html=True)
            st.markdown("**发现的计数模式**")
            
            for p in discovered_patterns[:8]:
                st.markdown(f"""
                <div class="pattern-card">
                    <span class="pattern-count">{p['frequency']} 次</span>
                    <div class="pattern-type">{p['type']}</div>
                    <div class="pattern-example">示例: {p['example']}</div>
                </div>
                """, unsafe_allow_html=True)
            
            st.markdown('</div>', unsafe_allow_html=True)
        
        with col_pattern2:
            pattern_data = pd.DataFrame(discovered_patterns[:8])
            if not pattern_data.empty:
                fig = px.bar(
                    pattern_data,
                    x='frequency',
                    y='type',
                    orientation='h',
                    title="模式频率分布",
                    color='frequency',
                    color_continuous_scale=[[0, '#f5e6d3'], [1, '#c0392b']]
                )
                fig.update_layout(
                    height=350,
                    showlegend=False,
                    margin=dict(l=0, r=0, t=30, b=0),
                    paper_bgcolor='#ffffff',
                    plot_bgcolor='#ffffff',
                    font=dict(family='Noto Sans SC')
                )
                st.plotly_chart(fig, use_container_width=True)
    
    # 发现的器物名称
    if artifact_names:
        st.markdown('<div class="content-card">', unsafe_allow_html=True)
        st.markdown("**发现的器物名称**")
        
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
        st.markdown('</div>', unsafe_allow_html=True)
    
    st.markdown("<hr>", unsafe_allow_html=True)
    
    # ========== 阶段二：精确提取 ==========
    st.markdown('<div class="section-header">阶段二：精确提取</div>', unsafe_allow_html=True)
    
    tomb_data = phase2.get('tomb_data', [])
    
    if tomb_data:
        # 图表
        category_dist = summary.get('category_distribution', {})
        if category_dist:
            col_chart1, col_chart2 = st.columns(2)
            
            with col_chart1:
                fig = px.pie(
                    names=list(category_dist.keys()),
                    values=list(category_dist.values()),
                    title="器物类别分布",
                    hole=0.4,
                    color_discrete_sequence=['#c0392b', '#8b4513', '#2e7d32', '#f57f17', '#654321', '#888']
                )
                fig.update_layout(
                    height=300, 
                    margin=dict(l=0, r=0, t=30, b=0),
                    paper_bgcolor='#ffffff',
                    plot_bgcolor='#ffffff',
                    font=dict(family='Noto Sans SC')
                )
                st.plotly_chart(fig, use_container_width=True)
            
            with col_chart2:
                tomb_counts = [{'墓葬': t['tomb_id'], '数量': t['total_count']} for t in tomb_data]
                df_counts = pd.DataFrame(tomb_counts)
                
                fig = px.bar(
                    df_counts,
                    x='墓葬',
                    y='数量',
                    title="各墓葬器物数量",
                    color='数量',
                    color_continuous_scale=[[0, '#f5e6d3'], [1, '#c0392b']]
                )
                fig.update_layout(
                    height=300, 
                    margin=dict(l=0, r=0, t=30, b=0),
                    paper_bgcolor='#ffffff',
                    plot_bgcolor='#ffffff',
                    font=dict(family='Noto Sans SC')
                )
                st.plotly_chart(fig, use_container_width=True)
        
        # 各墓葬详情
        st.markdown('<div class="content-card">', unsafe_allow_html=True)
        st.markdown("**各墓葬详细信息**")
        
        for tomb in tomb_data:
            tomb_id = tomb['tomb_id']
            structure = tomb['structure']
            
            with st.expander(f"{tomb_id} · {structure.get('type', '未知结构')} · {tomb['total_count']} 件器物"):
                
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
                
                artifacts = tomb.get('artifacts', [])
                if artifacts:
                    st.markdown("**器物列表**")
                    
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
                
                categories = tomb.get('categories', {})
                if categories:
                    st.markdown(f"**类别统计:** {' · '.join(f'{cat}({count})' for cat, count in categories.items())}")
        
        st.markdown('</div>', unsafe_allow_html=True)
    
    st.markdown("<hr>", unsafe_allow_html=True)
    
    # ========== 导出区域 ==========
    st.markdown('<div class="section-header">导出结果</div>', unsafe_allow_html=True)
    
    st.markdown('<div class="content-card">', unsafe_allow_html=True)
    
    col_dl1, col_dl2, col_dl3 = st.columns(3)
    
    with col_dl1:
        json_data = json.dumps(report, ensure_ascii=False, indent=2)
        st.download_button(
            "下载 JSON 报告",
            json_data,
            "计数特征报告.json",
            "application/json",
            use_container_width=True
        )
    
    with col_dl2:
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
                "下载 CSV 明细",
                df_csv.to_csv(index=False, encoding='utf-8-sig'),
                "器物明细.csv",
                "text/csv",
                use_container_width=True
            )
    
    with col_dl3:
        if discovered_patterns:
            pattern_csv = pd.DataFrame(discovered_patterns)
            st.download_button(
                "下载模式统计",
                pattern_csv.to_csv(index=False, encoding='utf-8-sig'),
                "模式统计.csv",
                "text/csv",
                use_container_width=True
            )
    
    st.markdown('</div>', unsafe_allow_html=True)


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
