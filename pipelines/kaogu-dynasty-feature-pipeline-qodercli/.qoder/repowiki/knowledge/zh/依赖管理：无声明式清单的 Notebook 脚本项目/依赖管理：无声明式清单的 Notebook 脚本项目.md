---
kind: dependency_management
name: 依赖管理：无声明式清单的 Notebook 脚本项目
category: dependency_management
scope:
    - '**'
source_files:
    - dynasty_feature_pipeline.ipynb
---

本仓库是一个基于 Jupyter Notebook 的数据处理流水线原型，**未采用任何 Python 包管理器或依赖声明机制**。具体表现如下：

1. **无依赖清单文件** — 仓库中不存在 `requirements.txt`、`pyproject.toml`、`setup.py`、`poetry.lock`、`Pipfile`、`environment.yml` 等任何标准依赖声明文件。
2. **依赖以注释形式内嵌在 Notebook 中** — 唯一一处依赖安装指令位于 `dynasty_feature_pipeline.ipynb` 第 233 行，以被注释掉的 cell 形式存在：
   ```python
   # !pip install pandas beautifulsoup4 lxml openai anthropic scipy matplotlib plotly tqdm
   ```
3. **运行时通过隐式导入获取依赖** — 代码使用 `import pandas as pd`、`from bs4 import BeautifulSoup`、`from openai import OpenAI`、`import anthropic` 等方式直接引用第三方库，没有显式的版本约束。
4. **LLM 后端可切换但无锁定** — 通过 `LLM_BACKEND = "openai"` 变量在 OpenAI 与 Anthropic SDK 之间切换，两者均未被固定版本。
5. **无虚拟环境/conda 配置** — 未发现 `.venv`、`venv/`、`.conda` 或 conda 环境配置文件。
6. **无私有源/代理配置** — 未设置 `PIP_INDEX_URL`、`PYPI_MIRROR` 或 pip.conf 等私有源。
7. **数据层无依赖** — `data/` 目录仅存放 PaddleOCR-VL 预处理后的 Markdown 文本，不包含任何构建或依赖相关元数据。

**结论**：该项目处于纯 Notebook 探索阶段，尚未建立正式的依赖管理体系。如需提升可复现性，建议引入 `requirements.txt` 或 `pyproject.toml` 并配合虚拟环境使用。