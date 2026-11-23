# Archaeological Tomb Parser

从中国考古报告中提取结构化墓葬数据 / Extract structured tomb data from Chinese archaeological reports.

## 功能

- **命令面板**: `Ctrl/Cmd+P` → "Parse archaeological tombs"
- **右键菜单**: 文件资源管理器 → "Extract tomb data"
- **三格式导出**: JSON + CSV（Excel 兼容） + Markdown
- **自动识别**: M+编号、YSTG4AM1 前缀、散文描述

## 安装

### 社区插件

1. Obsidian 设置 → 社区插件 → 浏览
2. 搜索 "Archaeological Tomb Parser"
3. 安装并启用

### 手动安装

1. 下载 `main.js`、`manifest.json`、`styles.css`
2. 复制到 `<vault>/.obsidian/plugins/archaeo-tombs/`
3. 设置 → 社区插件 → 启用

## 使用

1. 打开考古报告（`.md` 或 `.txt`）
2. `Cmd+P` → "Parse archaeological tombs"
3. 结果保存在 `<文件名>_tombs/` 文件夹

## 支持的墓葬 ID 格式

| 格式 | 示例 |
|------|------|
| `M+数字` | M1, M32 |
| `前缀+M+数字` | YSTG4AM1 |
| 散文描述 | "宋墓。长方形土坑墓。" |

## MCP 服务器

如需更强大的自定义格式解析，请使用 [MCP 服务器版本](https://github.com/alexxhchen-nu/untangle/tree/main/parsers/archaeo-tomb-parser)。

## License

MIT
