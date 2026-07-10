---
kind: dependency_management
name: Python 依赖管理：双轨声明与子项目 Conda 环境
category: dependency_management
scope:
    - '**'
source_files:
    - pyproject.toml
    - datasets/archaeoscape/environment.yaml
    - datasets/archaeoscape/pyproject.toml
---

本仓库采用根级 PyProject 与子项目 Conda 的双轨依赖管理模式，顶层包仅做元数据声明，实际 ML 工作流依赖集中在 datasets/archaeoscape 子项目中。

1. 使用的系统与工具
- 根项目：使用 PEP 621 风格的 pyproject.toml 声明包名、版本与 Python 最低版本要求（requires-python = ">=3.14"），但 dependencies 为空数组，未在此处锁定第三方库。
- 子项目 datasets/archaeoscape：使用 Conda environment.yaml 作为主依赖清单，通过 conda-forge / pytorch / nvidia 等 channel 安装带编译器的科学计算与深度学习包；同时通过 pip: 段引入无法在 conda 中直接提供的包。
- 测试与覆盖率：同子项目的 pyproject.toml 仅配置 pytest 与 coverage 的 tool 选项，不声明运行时依赖。

2. 关键文件与位置
- 根级包定义：pyproject.toml
- 子项目依赖清单：datasets/archaeoscape/environment.yaml
- 子项目测试/覆盖率配置：datasets/archaeoscape/pyproject.toml
- 训练脚本（间接暴露依赖）：scripts/train_classifier.py（使用 torch/torchvision/sklearn）、scripts/test_baidu_ocr.py（requests）、scripts/pdf_ocr_extract.py（fitz）

3. 架构与约定
- 分层隔离：根目录只承载实验入口与 Notebook，不绑定具体运行依赖；ML 相关依赖全部收敛到 archaeoscape 子项目，避免污染全局环境。
- 版本策略：Conda 层对核心包采用主版本固定加可选补丁通配符（如 scikit-image=0.22.*、pre-commit=3.*、pytest=7.*），保证跨用户一致性的同时允许小版本演进；非 conda 可提供的包下沉到 pip: 段。
- Channel 优先级：显式列出 pytorch、nvidia、conda-forge、defaults，确保 CUDA 构建链稳定。
- 无锁文件：仓库未提交 requirements.txt、poetry.lock、Pipfile.lock 或 uv.lock，也未见 vendoring 目录，依赖复现完全依赖 environment.yaml 的版本约束。

4. 开发者应遵循的规则
- 新增运行时依赖时，优先写入 datasets/archaeoscape/environment.yaml 的 dependencies 列表；若该包不在任何已配置 channel 中，再添加到 pip: 段。
- 为所有关键依赖指定最小主版本（参考现有写法），避免隐式升级导致破坏性变更。
- 根级 pyproject.toml 的 dependencies 保持为空，不要在此添加运行期包；如需发布可复用包，再逐步完善。
- 本地开发通过 conda env create -f datasets/archaeoscape/environment.yaml 创建独立环境，不要在系统 Python 中直接 pip install。
- 若未来需要可复现的精确快照，建议在 CI 中生成并归档 conda env export 输出或迁移到 uv/poetry 并纳入 lock 文件。