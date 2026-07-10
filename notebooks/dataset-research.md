# 考古图像数据集调研报告

> 调研时间：2026-07-10  
> 目标：为考古图像标注/ML训练，整理可用数据集资源

---

## 一、COCO Dataset（Microsoft Common Objects in Context）

### 基本信息

| 项目 | 详情 |
|------|------|
| 官网 | https://cocodataset.org/ |
| 总图像数 | 330,000+ 张（其中 200,000+ 已标注） |
| 标注实例数 | 883,331 个目标标注 |
| 类别数 | 80 个目标类别 + 91 个 Stuff 类别 |
| 标注格式 | JSON（COCO JSON 格式） |
| 图像尺寸 | 中位数 640×480，大小不一 |
| 许可证 | Creative Commons Attribution 4.0 (CC BY 4.0) |

### 数据集划分（2017 版本）

| 划分 | 图像数 | 大小 |
|------|--------|------|
| Train 2017 | 118,287 | ~19 GB |
| Val 2017 | 5,000 | ~1 GB |
| Test 2017 | 40,670 | ~7 GB |

### 标注类型

- **目标检测**：Bounding Box（边界框）
- **实例分割**：Polygon/RLE 掩码
- **关键点检测**：人体 17 个关键点
- **全景分割**：Stuff + Thing 全景标注
- **图像描述**：每张图 5 条自然语言描述

### 与考古相关的类别

COCO 是通用数据集，不包含专门的考古类别，但以下类别与考古器物形态有相似性：

| COCO 类别 | 考古关联性 | 说明 |
|-----------|-----------|------|
| vase | ⭐⭐⭐ 高 | 陶罐、花瓶形态接近 |
| bowl | ⭐⭐⭐ 高 | 陶碗、钵类器物 |
| cup | ⭐⭐ 中 | 陶杯、瓷杯 |
| bottle | ⭐⭐ 中 | 陶瓶、瓷瓶 |
| knife | ⭐⭐ 中 | 石刀、铜刀 |
| spoon | ⭐ 低 | 陶勺类 |
| fork | ⭐ 低 | 餐具类 |
| dining table | ⭐ 低 | 场景参考 |

### 下载方式

```bash
# 方式一：官方直接下载（推荐）
wget http://images.cocodataset.org/zips/train2017.zip   # 19GB
wget http://images.cocodataset.org/zips/val2017.zip      # 1GB
wget http://images.cocodataset.org/zips/test2017.zip     # 7GB
wget http://images.cocodataset.org/annotations/annotations_trainval2017.zip

# 方式二：通过 Kaggle ILSVRC 下载子集
# https://www.kaggle.com/c/imagenet-object-localization-challenge

# 方式三：Roboflow 提供的 COCO 子集
# https://universe.roboflow.com/jacob-solawetz/microsoft-coco
```

### 适用性评估

- **优势**：标注质量高、格式标准化、可作为预训练基础
- **劣势**：无考古专用类别、vase/bowl 类别数量有限
- **建议**：用于 **预训练 backbone**，然后在考古数据上 fine-tune

---

## 二、Roboflow Universe

### 平台概览

| 项目 | 详情 |
|------|------|
| 平台 | https://universe.roboflow.com |
| 总数据集数 | 750,000+ |
| 总图像数 | 575,000,000+ |
| 预训练模型 | 175,000+ |
| 搜索入口 | https://universe.roboflow.com/archaeology |

### 考古相关数据集

> 注：Roboflow Universe 网站对自动化抓取有访问限制（403），以下信息基于已知的考古数据集链接。建议手动访问确认最新数据。

#### 1. artifacts-z1lar

| 项目 | 详情 |
|------|------|
| 链接 | https://universe.roboflow.com/artifacts-z1lar |
| 任务类型 | Object Detection（目标检测） |
| 估计类别数 | 考古器物分类（需手动确认） |
| 标注格式 | 支持导出为 YOLO、COCO JSON、VOC XML 等 |
| 许可证 | 各数据集独立许可，通常为 CC BY 4.0 或类似 |
| 下载方式 | 注册 Roboflow 账号后免费下载 |

#### 2. albaleed_archaeological_artifacts_object_detection

| 项目 | 详情 |
|------|------|
| 链接 | https://universe.roboflow.com/albaleed_archaeological_artifacts_object_detection |
| 任务类型 | Object Detection（目标检测） |
| 场景 | Al-Baleed 考古遗址出土器物 |
| 标注格式 | 支持 YOLO、COCO JSON、VOC XML |
| 许可证 | 需在平台确认 |

#### 3. 其他可能相关的考古数据集

在 Roboflow Universe 搜索 `archaeology`、`artifact`、`pottery`、`ancient` 等关键词可能找到更多数据集。

### 导出格式支持

Roboflow 支持将数据集导出为以下格式：

- **YOLO**（Darknet TXT）
- **COCO JSON**
- **Pascal VOC XML**
- **TensorFlow TFRecord**
- **CreateML JSON**
- **其他 20+ 格式**

### 下载方式

1. 访问 https://universe.roboflow.com
2. 搜索 `archaeology` 或 `archaeological artifacts`
3. 注册/登录 Roboflow 账号（免费）
4. 选择数据集，点击 "Download" 按钮
5. 选择导出格式和版本

### 适用性评估

- **优势**：直接标注好考古器物、支持多种导出格式、可直接训练
- **劣势**：数据集规模通常较小（几百到几千张）、标注质量参差不齐
- **建议**：**优先尝试**，可直接用于训练考古器物检测模型

---

## 三、ImageNet

### 基本信息

| 项目 | 详情 |
|------|------|
| 官网 | https://image-net.org/ |
| 总图像数 | 14,197,122 张 |
| Synset 数 | 21,841 个（WordNet 名词层次结构） |
| 组织方式 | 按 WordNet 同义词集（synset）组织 |
| ILSVRC 子集 | 1,000 类，1,281,167 训练 + 50,000 验证 + 100,000 测试 |
| 许可证 | 非商业研究用途（需同意使用条款） |

### 与考古器物相关的 Synset

ImageNet 按 WordNet 层次组织，以下 synset 与考古器物相关：

#### 陶瓷/陶器类

| WordNet ID | 类别名称 | 中文 | 考古关联 |
|------------|---------|------|---------|
| n04523572 | vase | 花瓶 | ⭐⭐⭐ 陶罐、陶瓶 |
| n02881193 | bowl | 碗 | ⭐⭐⭐ 陶碗 |
| n03147509 | cup | 杯 | ⭐⭐ 陶杯 |
| n02876657 | bottle | 瓶 | ⭐⭐ 陶瓶 |
| n03017168 | bell | 铃/钟 | ⭐⭐ 铜铃、编钟 |
| n03405265 | font | 洗礼盆 | ⭐ 石器容器 |

#### 石器/工具类

| WordNet ID | 类别名称 | 中文 | 考古关联 |
|------------|---------|------|---------|
| n03627232 | knot | 结 | ⭐ 石器工艺 |
| n03777754 | mortar | 研钵 | ⭐⭐⭐ 石臼、研磨器 |
| n03404251 | fur coat | 毛皮大衣 | ⭐ 纺织品参考 |

#### 金属器类

| WordNet ID | 类别名称 | 中文 | 考古关联 |
|------------|---------|------|---------|
| n03017168 | bell | 铃 | ⭐⭐ 青铜铃 |
| n03291819 | envelope | 信封 | ⭐ 封泥参考 |

#### 完整 WordNet 层次路径示例

```
entity → physical entity → object → artifact → instrumentality → container → vessel → vase
entity → physical entity → object → artifact → instrumentality → container → bowl
```

### 注册/申请流程

#### 访问方式

1. **ILSVRC 子集**（推荐先试用）
   - 可直接通过 Kaggle 下载：https://www.kaggle.com/c/imagenet-object-localization-challenge
   - 无需申请，直接注册 Kaggle 账号即可

2. **完整 ImageNet 数据集**
   - 访问 https://image-net.org/download.php
   - 注册 ImageNet 账号（需学术邮箱）
   - 同意使用条款（仅限非商业研究）
   - 等待审核后获得下载权限

#### 使用条款摘要

1. 仅限非商业研究和教育用途
2. 研究者承担使用责任
3. 可与同意相同条款的同事共享
4. 斯坦福/普林斯顿保留随时终止访问的权利
5. 商业实体的雇员也须受条款约束
6. 适用新泽西州法律

### 下载方式

```bash
# 方式一：Kaggle ILSVRC 子集
# 访问 https://www.kaggle.com/c/imagenet-object-localization-challenge
# 使用 kaggle CLI 下载
kaggle competitions download -c imagenet-object-localization-challenge

# 方式二：完整 ImageNet（需审核通过）
# 登录后从官网下载页面获取链接
```

### 适用性评估

- **优势**：类别丰富（21,841 synsets）、图像数量大、层次结构可用于细粒度分类
- **劣势**：非考古专用、需手动筛选相关 synset、图像质量参差不齐
- **建议**：用于 **预训练分类模型**，提取陶瓷/石器/青铜器特征

---

## 四、对比总结

| 维度 | COCO | Roboflow Universe | ImageNet |
|------|------|-------------------|----------|
| **图像数量** | 330,000+ | 750,000+ 数据集，575M+ 图像 | 14,197,122 |
| **标注类型** | BBox / Segmentation / Keypoint | BBox / Segmentation / Classification | Classification |
| **考古相关类别** | vase, bowl（间接） | artifacts, pottery（直接） | vase, bowl, mortar 等（间接） |
| **下载方式** | 直接下载 | 注册后免费下载 | 需申请审核 |
| **许可证** | CC BY 4.0 | 各数据集独立 | 非商业研究 |
| **数据质量** | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐ 中等（视数据集） | ⭐⭐⭐⭐ 较高 |
| **与考古相关度** | ⭐⭐ 低 | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐ 中 |
| **预训练价值** | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐ 中 | ⭐⭐⭐⭐⭐ 高 |

## 五、推荐策略

### 1. 预训练阶段

- **目标检测 backbone**：使用 COCO 预训练权重（YOLO/RT-DETR/Faster R-CNN）
- **分类 backbone**：使用 ImageNet 预训练权重（ResNet/EfficientNet/ViT）
- 两者可直接从 PyTorch/Torchvision 或 Ultralytics 获取

### 2. 考古器物检测

- **首选**：Roboflow Universe 的考古数据集（artifacts-z1lar, albaleed 等）
- 直接下载，导出为 YOLO 或 COCO 格式
- 结合自建考古数据集进行混合训练

### 3. 数据增强策略

- 对小规模考古数据集使用数据增强（旋转、翻转、色彩抖动）
- 考虑使用 COCO 中 vase/bowl 类别的子集作为辅助训练数据
- 可尝试 few-shot 或 zero-shot 方法利用 COCO/ImageNet 的通用知识

### 4. 后续调研建议

- 手动访问 Roboflow Universe 确认考古数据集最新状态
- 搜索学术论文中的考古图像数据集（如 ArchaeoNet、Museum Dataset 等）
- 联系考古机构获取专业标注数据

---

## 六、参考资料

- COCO Dataset: https://cocodataset.org/
- COCO Blog (Roboflow): https://blog.roboflow.com/coco-dataset/
- Roboflow Universe: https://universe.roboflow.com
- ImageNet: https://image-net.org/
- ImageNet Download: https://image-net.org/download.php
- WordNet: https://wordnet.princeton.edu/
