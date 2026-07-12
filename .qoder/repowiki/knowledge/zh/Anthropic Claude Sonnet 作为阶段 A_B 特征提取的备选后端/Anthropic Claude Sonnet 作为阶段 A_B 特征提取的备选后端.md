---
kind: external_dependency
name: Anthropic Claude Sonnet 作为阶段 A/B 特征提取的备选后端
slug: anthropic-claude
category: external_dependency
category_hints:
    - vendor_identity
    - sdk_real_api
scope:
    - '**'
---

### Anthropic Claude Sonnet
- 集成点：`dynasty_feature_pipeline.ipynb` 中 `LLM_BACKEND = "anthropic"` 时走此分支；默认模型为 `claude-sonnet-4-20250514`
- 注意：同样依赖运行环境注入 API key；当前仅定义接口，Step 7 实际调用被注释