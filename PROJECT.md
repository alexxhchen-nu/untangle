# 墓葬形制研究 — 项目概要

## 研究问题

从考古报告中系统提取墓葬数据，分析各类文化因素在区域内的分布，探索墓葬形制背后的年代变化、族属身份与文化认同问题。

### 核心张力

一个墓葬形制在某地出现，同时涉及三个交织维度：

| 维度 | 问题 |
|------|------|
| **年代** | 什么时候出现的？ |
| **族属** | 谁在用？（外来移民 / 本地精英模仿 / 底层自发选择？） |
| **文化认同** | 为什么选这个形制？（表达身份 / 对抗另一种传统 / 宇宙观的物质化？） |

年代判断需要族属背景来限定参照系，族属判断依赖年代排除后世混入因素。文化认同是最难的——可能是主动选择而非被动继承。

### 理论视角

不预设理论框架，先让数据说话。但可参考的解释路径：

1. **社会地位投射** (Binford 1971) — 形制变异反映社会分层的制度化程度
2. **仪式实践** (Saxe 1970, Goldstein 1981) — 形制差异标记群体边界，反映生者群体的社会结构
3. **宇宙观物质化** (Hodder 1982, 1990) — 形制选择是意识形态竞争的产物
4. **能动性实践** (Bourdieu) — 形制变异是策略性的，个体在既定结构中做选择

操作方向：跑出分布图看模式，再选理论工具解释。

---

## 技术目标

### 不做

- 不训练机器学习模型
- 不构建大语言模型
- 不做复杂的深度学习管线

### 要做

| 目标 | 工具 | 说明 |
|------|------|------|
| PDF数据提取 | Python (pymupdf/PyPDF2) + 正则 | 从考古报告中半自动提取墓葬信息，输出结构化CSV |
| GIS可视化 | QGIS | 形制分类地图、时段切片、文化因素分布热力图 |
| 快速工具 | Python脚本 | 可复用的提取和分析管道 |

### 数据管道

```
PDF考古报告
  ↓ (Python提取脚本)
结构化CSV (墓葬编号、形制、尺寸、器物组合、地层关系、坐标/地名)
  ↓ (直接导入)
QGIS → 分布图 / 热力图 / 时段切片
  ↓
统计分析 (形制变异量化描述)
```

### CSV字段设计

基于 CLAUDE.md 中的考古信息提取规范：

**墓葬基本信息**
- 墓葬编号、年代、墓向、墓葬形制
- 墓口长/宽、墓深
- 坐标或地名（用于GIS定位）
- 备注

**随葬器物**
- 器物编号、名称、材质、器型、数量
- 特征描述

---

## 当前状态

- [x] 研究问题初步厘清
- [x] 技术方案确定（PDF提取 + QGIS，不做ML）
- [ ] 等待PDF报告 → 启动数据提取测试
- [ ] 理论框架继续打磨（散步中）
- [ ] QGIS工作流搭建

## 下一步

1. 拿到一份PDF报告，测试提取管道
2. 跑出第一批分布图，看模式
3. 根据数据模式选择/调整理论框架

---

## 参考文献

- Binford, L.R. (1971). Mortuary Practices: Their Study and Their Potential. *Memoirs of the Society for American Archaeology*, 25: 6-29.
- Saxe, A.A. (1970). *Social Dimensions of Mortuary Practices*. PhD dissertation, University of Michigan.
- Goldstein, L. (1981). One-Dimensional Archaeology and Multi-Dimensional People. In *The Archaeology of Death*, pp. 53-69.
- Hodder, I. (1982). *Symbols in Action*. Cambridge University Press.
- Hodder, I. (1990). *The Domestication of Europe*. Blackwell.
