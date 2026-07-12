---
kind: configuration_system
name: 配置系统：无独立配置文件，参数内嵌于 Notebook
category: configuration_system
scope:
    - '**'
source_files:
    - dynasty_feature_pipeline.ipynb
---

该仓库未实现独立的配置系统。整个 Pipeline 以单文件 Jupyter Notebook（`dynasty_feature_pipeline.ipynb`）形式组织，所有运行期参数均以 Python 常量或变量硬编码在 Notebook 代码单元格中，不存在 `config/`、`*.yaml`、`*.toml`、`.env` 等外部配置文件。

具体表现：
- 路径与目录：`DATA_DIR = Path("./data")`、`OUTPUT_DIR = Path("./output")` 直接写死在单元格中。
- LLM 后端选择：`LLM_BACKEND = "openai"` 通过字符串切换 OpenAI / Anthropic，API key 依赖客户端默认环境变量（如 `OPENAI_API_KEY`），但 Notebook 中并未显式加载 `.env` 或使用 `python-dotenv` 等库。
- 领域关键词表：`DYNASTY_KEYWORDS`、`REGION_KEYWORDS` 作为字典常量定义在 Notebook 内，用于朝代感知分块与标注。
- Prompt 模板：`SYSTEM_PROMPT_DISCOVERY`、`DISCOVERY_PROMPT_TEMPLATE` 等 prompt 文本也直接嵌入代码单元格。
- 数据源：仅依赖 `./data/` 下的 Markdown 文件，没有清单或索引文件来声明输入集合。

因此，本仓库对“配置”的处理方式是**零配置**——所有可调项都是 Notebook 内的 Python 变量，修改需直接编辑 Notebook 单元格。若未来需要扩展为可复现实验或多人协作，建议将上述常量抽取到独立的 `config.py` 或 YAML/TOML 文件中，并通过 `python-dotenv` 管理 API Key 等敏感信息。