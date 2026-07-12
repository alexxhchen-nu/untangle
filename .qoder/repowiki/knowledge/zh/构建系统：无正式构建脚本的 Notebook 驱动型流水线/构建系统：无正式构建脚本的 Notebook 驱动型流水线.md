---
kind: build_system
name: 构建系统：无正式构建脚本的 Notebook 驱动型流水线
category: build_system
scope:
    - '**'
---

本仓库不包含任何传统意义上的构建系统。仓库中不存在 Makefile、Dockerfile、CI 配置、requirements.txt、pyproject.toml、setup.py 或 build.sh 等构建/打包/发布相关文件。整个项目以单个 Jupyter Notebook（`dynasty_feature_pipeline.ipynb`）作为唯一的“可执行工件”，所有依赖安装通过 Notebook cell 中的 `pip install` 注释形式声明，运行方式是在本地 Jupyter 环境中逐单元格执行。因此，该类别对本仓库不适用。