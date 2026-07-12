---
kind: external_dependency
name: OpenAI GPT-4o 作为阶段 A/B 特征提取的后端之一
slug: openai
category: external_dependency
category_hints:
    - vendor_identity
    - sdk_real_api
scope:
    - '**'
---

### OpenAI GPT-4o
- 角色：本项目的 LLM 后端之一，用于阶段 A（特征发现）与阶段 B（结构化量化提取）
- 注意：API key 需由运行环境注入（环境变量），当前代码未硬编码密钥；Anthropic 为可选备选后端