---
kind: build_system
name: 构建系统：轻量级 Python 实验工作区（无自动化构建）
category: build_system
scope:
    - '**'
source_files:
    - pyproject.toml
    - scripts/train_classifier.py
    - .gitignore
---

本仓库是一个考古图像分类的机器学习实验项目，采用极简的 Python 包结构，**未引入任何自动化构建、打包或 CI/CD 系统**。具体现状如下：

1. **依赖与包管理**
   - 根目录 `pyproject.toml` 仅声明了包名 `llm-kaogu`、版本 `0.1.0` 和 `requires-python = ">=3.14"`，`dependencies` 为空数组，未定义可执行入口点。
   - 实际运行依赖通过 Notebook 中记录的 `uv 0.11.28 + venv` 环境安装，虚拟环境目录 `.venv/` 被 `.gitignore` 忽略。
   - 子模块 `datasets/archaeoscape` 自带独立的 `environment.yaml`（Conda）、`pyproject.toml`、`.pre-commit-config.yaml`，但该子模块是作为外部数据集模板引入的，并非本项目主构建流程的一部分。

2. **脚本式训练与推理**
   - 所有训练逻辑集中在 `scripts/train_classifier.py`，通过 `argparse` 暴露 `--epochs`、`--lr`、`--batch-size` 等参数，使用 `torchvision.datasets.ImageFolder` 直接读取 `datasets/ArchaeoMind_dataset/{train,val,test}` 目录结构进行训练。
   - 模型权重以硬编码路径 `best_model.pth` 保存在当前工作目录，无版本化或输出目录约定。
   - 另有 `scripts/test_baidu_ocr.py` 用于百度 OCR 接口测试，`main.py` 作为顶层入口（内容未在上下文中展示）。

3. **缺失的构建能力**
   - 仓库中不存在 `Makefile`、`Dockerfile`、`docker-compose.yml`、`.github/workflows/`、`.gitlab-ci.yml`、`Jenkinsfile`、`setup.py`、`requirements.txt`、`build*.sh` 等任何构建/部署配置文件。
   - 没有预训练模型下载脚本、没有交叉编译目标、没有发布流水线。

4. **开发者实践建议**
   - 如需复现实验，应先在 `uv venv` 中安装 PyTorch、torchvision、scikit-learn 等运行时依赖（参考 Notebook 中的环境记录），再直接 `python scripts/train_classifier.py --epochs N --lr LR` 启动训练。
   - 若需增强可重复性，建议在根 `pyproject.toml` 中补充 `dependencies` 列表并定义 `[project.scripts]` 可执行入口；同时考虑引入 `Makefile` 或 shell 脚本封装常用命令（数据准备、训练、评估、导出）。