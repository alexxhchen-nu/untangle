---
kind: error_handling
name: 错误处理：Notebook 脚本式流水线中的异常与日志策略
category: error_handling
scope:
    - '**'
source_files:
    - dynasty_feature_pipeline.ipynb
---

本仓库为考古器物计数特征提取的 Jupyter Notebook 流水线（`dynasty_feature_pipeline.ipynb`），代码以 Python + Pandas + LLM API 调用为主，未引入专门的错误处理框架或自定义错误类型。整体呈现以下特点：

1. **异常传播方式**：绝大多数 I/O、LLM 调用、数据解析操作依赖标准库异常（如 `FileNotFoundError`、`OSError`、网络/HTTP 异常等）直接向上抛出，由 Notebook 运行时捕获并中断执行；未见 `try/except` 包裹的业务级错误恢复逻辑。
2. **无统一错误类型/错误码**：仓库中不存在 `errors/` 目录、自定义 Exception 类或错误码常量定义，也没有将业务语义（如“OCR 文本缺失”“LLM 返回格式不合法”）封装为结构化错误对象。
3. **日志与可观测性**：未发现集中式日志配置（如 `logging` 模块初始化、日志级别管理、结构化日志输出），调试主要依赖 Notebook 单元格的打印输出和异常堆栈。
4. **中间件/重试机制**：作为一次性分析脚本，未实现请求重试、熔断、降级等容错中间件；对第三方服务（PaddleOCR-VL、LLM API）的失败仅表现为异常终止。
5. **开发者约定**：当前项目规模较小且面向探索性研究，错误处理遵循“快速失败 + 人工介入”的轻量约定——在 Notebook 中通过显式的断言、空值检查以及手动重跑来定位问题，而非自动化恢复。

综上，该仓库属于“低复杂度 Notebook 脚本”形态，尚未建立系统化的错误处理体系；若后续演进为可复用的 Pipeline 服务，建议引入结构化错误类型、统一的异常包装层以及带重试/超时的外部调用封装。