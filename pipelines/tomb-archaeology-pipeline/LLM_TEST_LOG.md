# LLM 抽取测试日志

## 2026-07-11

### 配置

- API: https://api.kimi.com/coding/v1
- Model: kimi-for-coding
- 测试样本：章丘女郎山.md 前 5 座墓葬（M3, M23, M32, M58, M72）
- 抽取方式：分块抽取（每个墓葬一次 API 调用）

### 关键发现

1. **temperature 必须设为 1**：该模型只接受 `temperature=1`，否则返回 400 Bad Request。
2. **整篇抽取格式不稳定**：一次性传入多个墓葬时，模型返回格式多变（数组、对象、嵌套对象、非 JSON 等）。
3. **分块抽取非常稳定**：每次只处理单个墓葬段落，返回单个 JSON 对象，字段准确。

### 测试结果

成功抽取 5 座墓葬，字段覆盖：
- tomb_form 均为"土坑竖穴墓"，置信度高
- chamber_size、orientation、burial_position、head_direction 等实测字段准确
- evidence_records 能自动记录证据（如 M23 的形制、随葬品、葬具证据）
- uncertainty_records 能标记不确定性（如 M23 头向、年代未明确）

### 数据入库

- 数据库：tombs.db
- tombs 表：5 条
- evidence_records 表：多条
- uncertainty_records 表：多条

### 后续建议

1. 采用分块策略处理完整报告（410 座墓葬）。
2. 增加 rate limit / 重试机制（目前 sleep 0.5s）。
3. 对 evidence_records / uncertainty_records 的受控词表做后处理校验。
4. 批量跑完全部 410 座墓葬后，再做关联规则分析。
