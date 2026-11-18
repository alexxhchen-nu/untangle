#!/usr/bin/env python3
"""
考古简报计数特征提取器 v5 - 两阶段提取版
Archaeological Report Count Feature Extractor v5 - Two-Phase Extraction

阶段1: 扫描全文，发现所有可能的计数特征模式
阶段2: 基于发现的模式，精确提取每个墓葬的数据
"""

import re
import json
from typing import List, Dict, Optional, Tuple, Set
from dataclasses import dataclass, asdict, field
from pathlib import Path
from collections import defaultdict, Counter


@dataclass
class CountPattern:
    """计数模式"""
    pattern_type: str          # 模式类型
    example: str               # 示例
    frequency: int             # 出现频率
    regex: str                 # 正则表达式
    unit: str                  # 单位


@dataclass
class TombData:
    """墓葬数据"""
    tomb_id: str
    structure: Dict            # 墓葬形制
    artifacts: List[Dict]      # 器物列表
    total_count: int           # 器物总数
    categories: Dict[str, int] # 类别统计
    dimensions: Dict           # 尺寸数据
    weights: Dict              # 重量数据
    special_features: List[str] # 特殊特征


@dataclass
class ExtractionReport:
    """提取报告"""
    # 阶段1结果
    discovered_patterns: List[CountPattern]
    pattern_statistics: Dict
    
    # 阶段2结果
    tomb_data: List[TombData]
    
    # 汇总
    summary: Dict


class PatternDiscovery:
    """模式发现器 - 阶段1"""
    
    # 预定义的计数模式
    PREDEFINED_PATTERNS = {
        # 器物数量
        'artifact_count': [
            (r'共(\d+)件', '件'),
            (r'出土.*?(\d+)件', '件'),
            (r'计[有]?(\d+)件', '件'),
            (r'(\d+)件', '件'),
        ],
        
        # 枚数
        'piece_count': [
            (r'(\d+)枚', '枚'),
            (r'共(\d+)枚', '枚'),
        ],
        
        # 套/组
        'set_count': [
            (r'(\d+)套', '套'),
            (r'(\d+)组', '组'),
        ],
        
        # 编号引用
        'artifact_id': [
            (r'M(\d+)[：:](\d+)', '件'),
            (r'M(\d+)[：:](\d+)号', '件'),
        ],
        
        # 墓葬尺寸
        'tomb_dimension': [
            (r'(?:墓口)?长([\d.]+)米', '米'),
            (r'(?:墓口)?宽([\d.]+)米', '米'),
            (r'(?:墓)?深([\d.]+)米', '米'),
        ],
        
        # 器物尺寸
        'artifact_dimension': [
            (r'口径([\d.]+)厘米', '厘米'),
            (r'通高([\d.]+)厘米', '厘米'),
            (r'高([\d.]+)厘米', '厘米'),
            (r'长([\d.]+)厘米', '厘米'),
            (r'宽([\d.]+)厘米', '厘米'),
            (r'厚([\d.]+)厘米', '厘米'),
            (r'底[径]?([\d.]+)厘米', '厘米'),
            (r'足[径]?([\d.]+)厘米', '厘米'),
        ],
        
        # 重量
        'weight': [
            (r'重([\d.]+)克', '克'),
            (r'([\d.]+)克', '克'),
        ],
        
        # 范围值
        'range_value': [
            (r'([\d.]+)[-—～至]([\d.]+)厘米', '厘米'),
            (r'([\d.]+)[-—～至]([\d.]+)米', '米'),
        ],
        
        # 方向
        'direction': [
            (r'方向[为是]?([\d.]+)度', '度'),
            (r'(南北|东西|东南|西南|东北|西北)向', ''),
            (r'北偏[东西]([\d.]+)度', '度'),
        ],
        
        # 墓葬结构类型
        'structure_type': [
            (r'(土坑竖穴|砖室|木椁|石室|洞室|瓮棺|空心砖|画像石|壁画)墓', ''),
        ],
        
        # 形状
        'shape': [
            (r'(长方形|方形|圆形|椭圆形|甲字形|中字形|刀形)', ''),
        ],
        
        # 墓道
        'passage': [
            (r'墓道.*?长([\d.]+)米', '米'),
            (r'墓道.*?宽([\d.]+)米', '米'),
        ],
    }
    
    # 器物名称模式
    ARTIFACT_NAME_PATTERNS = [
        r'(铜|陶|玉|铁|金|银|漆|骨|石|玛瑙|琉璃)(鼎|壶|钫|盆|灯|罐|碗|盘|杯|璧|枕|握|蝉|盒|俑|剑|戈|矛|镞|镜|钱|铃|衔|镳|軎)',
        r'(铜|陶|玉|铁|金|银)(器|礼器|兵器|工具|饰品)',
    ]
    
    def __init__(self):
        self.discovered_patterns: List[CountPattern] = []
        self.artifact_names: Set[str] = set()
        self.pattern_frequency: Dict[str, int] = Counter()
    
    def discover(self, text: str) -> Tuple[List[CountPattern], Dict]:
        """发现所有计数模式"""
        self.discovered_patterns = []
        self.artifact_names = set()
        self.pattern_frequency = Counter()
        
        # 预处理
        cleaned = self._preprocess(text)
        
        # 分句
        sentences = re.split(r'[。；\n]+', cleaned)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        # 扫描每个句子
        for sent in sentences:
            self._scan_sentence(sent)
        
        # 统计和排序
        self._rank_patterns()
        
        # 生成统计信息
        stats = self._generate_statistics()
        
        return self.discovered_patterns, stats
    
    def _preprocess(self, text: str) -> str:
        """预处理"""
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
        text = text.replace('：', ':').replace('，', ',')
        return text
    
    def _scan_sentence(self, sentence: str):
        """扫描句子，发现模式"""
        
        # 扫描预定义模式
        for pattern_type, patterns in self.PREDEFINED_PATTERNS.items():
            for regex, unit in patterns:
                matches = list(re.finditer(regex, sentence))
                if matches:
                    self.pattern_frequency[pattern_type] += len(matches)
                    
                    # 记录示例
                    example = matches[0].group()
                    if len(example) > 30:
                        example = example[:30] + "..."
                    
                    # 检查是否已存在
                    existing = [p for p in self.discovered_patterns if p.pattern_type == pattern_type]
                    if not existing:
                        self.discovered_patterns.append(CountPattern(
                            pattern_type=pattern_type,
                            example=example,
                            frequency=len(matches),
                            regex=regex,
                            unit=unit
                        ))
                    else:
                        existing[0].frequency += len(matches)
        
        # 扫描器物名称
        for pattern in self.ARTIFACT_NAME_PATTERNS:
            matches = re.finditer(pattern, sentence)
            for match in matches:
                self.artifact_names.add(match.group())
    
    def _rank_patterns(self):
        """按频率排序模式"""
        self.discovered_patterns.sort(key=lambda x: x.frequency, reverse=True)
    
    def _generate_statistics(self) -> Dict:
        """生成统计信息"""
        return {
            'total_patterns': len(self.discovered_patterns),
            'pattern_frequency': dict(self.pattern_frequency),
            'artifact_names': sorted(list(self.artifact_names)),
            'top_patterns': [
                {
                    'type': p.pattern_type,
                    'example': p.example,
                    'frequency': p.frequency
                }
                for p in self.discovered_patterns[:10]
            ]
        }


class PreciseExtractor:
    """精确提取器 - 阶段2"""
    
    def __init__(self, discovered_patterns: List[CountPattern], artifact_names: Set[str]):
        self.patterns = discovered_patterns
        self.artifact_names = artifact_names
        
        # 构建正则表达式映射
        self.regex_map = {}
        for p in discovered_patterns:
            if p.pattern_type not in self.regex_map:
                self.regex_map[p.pattern_type] = []
            self.regex_map[p.pattern_type].append((p.regex, p.unit))
        
        # 墓葬结构关键词
        self.structure_keywords = {
            '土坑竖穴墓': ['土坑竖穴', '竖穴土坑', '长方形土坑'],
            '砖室墓': ['砖室', '砖墓'],
            '木椁墓': ['木椁', '椁室'],
            '石室墓': ['石室', '石墓'],
            '洞室墓': ['洞室', '崖洞'],
            '瓮棺墓': ['瓮棺', '瓦棺'],
        }
        
        self.shape_keywords = {
            '长方形': ['长方形', '长方'],
            '方形': ['方形', '正方形'],
            '圆形': ['圆形'],
            '甲字形': ['甲字形', '甲字'],
            '中字形': ['中字形', '中字'],
        }
    
    def extract(self, text: str) -> List[TombData]:
        """提取所有墓葬数据"""
        # 预处理
        cleaned = self._preprocess(text)
        
        # 按墓葬分段
        tomb_segments = self._segment_by_tomb(cleaned)
        
        # 提取每个墓葬
        tomb_data_list = []
        for tomb_id, segment in tomb_segments.items():
            tomb_data = self._extract_tomb(tomb_id, segment)
            tomb_data_list.append(tomb_data)
        
        return tomb_data_list
    
    def _preprocess(self, text: str) -> str:
        """预处理"""
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
        text = text.replace('：', ':').replace('，', ',')
        return text
    
    def _segment_by_tomb(self, text: str) -> Dict[str, str]:
        """按墓葬分段"""
        segments = {}
        
        # 查找所有墓葬编号
        tomb_pattern = r'(?:^|\n)(M\d+)[^M]*?(?=\nM|\n\n|$)'
        matches = list(re.finditer(tomb_pattern, text, re.MULTILINE | re.DOTALL))
        
        for match in matches:
            tomb_id = match.group(1)
            segment = match.group(0).strip()
            if tomb_id not in segments:
                segments[tomb_id] = segment
            else:
                segments[tomb_id] += "\n" + segment
        
        # 如果没有找到墓葬编号，把整个文本作为一个墓葬
        if not segments:
            segments['unknown'] = text
        
        return segments
    
    def _extract_tomb(self, tomb_id: str, text: str) -> TombData:
        """提取单个墓葬数据"""
        
        # 提取墓葬形制
        structure = self._extract_structure(text)
        
        # 提取器物
        artifacts = self._extract_artifacts(text, tomb_id)
        
        # 统计
        total_count = sum(a.get('count', 1) for a in artifacts)
        categories = Counter(a.get('category', '其他') for a in artifacts)
        
        # 提取尺寸
        dimensions = self._extract_dimensions(text)
        
        # 提取重量
        weights = self._extract_weights(text)
        
        # 特殊特征
        special_features = self._extract_special_features(text)
        
        return TombData(
            tomb_id=tomb_id,
            structure=structure,
            artifacts=artifacts,
            total_count=total_count,
            categories=dict(categories),
            dimensions=dimensions,
            weights=weights,
            special_features=special_features
        )
    
    def _extract_structure(self, text: str) -> Dict:
        """提取墓葬形制"""
        structure = {
            'type': None,
            'shape': None,
            'direction': None,
            'length': None,
            'width': None,
            'depth': None,
            'area': None,
            'has_passage': False,
        }
        
        # 结构类型
        for stype, keywords in self.structure_keywords.items():
            if any(kw in text for kw in keywords):
                structure['type'] = stype
                break
        
        # 形状
        for shape, keywords in self.shape_keywords.items():
            if any(kw in text for kw in keywords):
                structure['shape'] = shape
                break
        
        # 方向
        direction_patterns = [
            (r'方向[为是]?([\d.]+)度', 'angle'),
            (r'(南北|东西|东南|西南)向', 'compass'),
        ]
        for regex, dtype in direction_patterns:
            match = re.search(regex, text)
            if match:
                structure['direction'] = match.group(1)
                break
        
        # 尺寸
        length_match = re.search(r'(?:墓口)?长([\d.]+)米', text)
        if length_match:
            structure['length'] = float(length_match.group(1))
        
        width_match = re.search(r'(?:墓口)?宽([\d.]+)米', text)
        if width_match:
            structure['width'] = float(width_match.group(1))
        
        depth_match = re.search(r'(?:墓)?深([\d.]+)米', text)
        if depth_match:
            structure['depth'] = float(depth_match.group(1))
        
        # 计算面积
        if structure['length'] and structure['width']:
            structure['area'] = round(structure['length'] * structure['width'], 2)
        
        # 墓道
        if '墓道' in text:
            structure['has_passage'] = True
        
        return structure
    
    def _extract_artifacts(self, text: str, tomb_id: str) -> List[Dict]:
        """提取器物"""
        artifacts = []
        
        # 提取编号引用
        for match in re.finditer(r'M(\d+)[：:](\d+)([^\d]*)', text):
            artifact_id = f"M{match.group(1)}:{match.group(2)}"
            suffix = match.group(3).strip()
            
            # 查找器物名称
            name = self._find_artifact_name(text, match.start())
            category = self._get_category(name)
            
            artifacts.append({
                'id': artifact_id,
                'name': name or '未知器物',
                'category': category,
                'count': 1
            })
        
        # 提取器物数量
        count_patterns = [
            (r'([\u4e00-\u9fa5]{1,6})(?:共|各)?(\d+)件', 'name_count'),
            (r'共(\d+)件', 'total'),
        ]
        
        for regex, ptype in count_patterns:
            for match in re.finditer(regex, text):
                if ptype == 'name_count':
                    name = match.group(1)
                    count = int(match.group(2))
                else:
                    name = '器物'
                    count = int(match.group(1))
                
                category = self._get_category(name)
                
                # 检查是否已存在
                if not any(a['name'] == name for a in artifacts):
                    artifacts.append({
                        'name': name,
                        'category': category,
                        'count': count
                    })
        
        return artifacts
    
    def _find_artifact_name(self, text: str, pos: int) -> Optional[str]:
        """查找器物名称"""
        # 向前查找
        prefix = text[:pos]
        for pattern in self.artifact_names:
            matches = list(re.finditer(re.escape(pattern), prefix))
            if matches:
                return matches[-1].group()
        
        # 向后查找
        suffix = text[pos:]
        for pattern in self.artifact_names:
            match = re.search(re.escape(pattern), suffix)
            if match:
                return match.group()
        
        return None
    
    def _get_category(self, name: str) -> str:
        """获取器物类别"""
        if not name:
            return '其他'
        
        category_map = {
            '陶': '陶器', '泥质': '陶器',
            '铜': '铜器', '青铜': '铜器', '鎏金': '铜器',
            '铁': '铁器',
            '玉': '玉器', '碧玉': '玉器',
            '石': '石器',
            '骨': '骨器',
            '漆': '漆木器', '木': '漆木器',
            '金': '金银器', '银': '金银器',
            '车': '车马器', '马': '车马器',
        }
        
        for key, category in category_map.items():
            if key in name:
                return category
        
        return '其他'
    
    def _extract_dimensions(self, text: str) -> Dict:
        """提取尺寸"""
        dimensions = {}
        
        dim_patterns = [
            (r'口径([\d.]+)厘米', '口径'),
            (r'通高([\d.]+)厘米', '通高'),
            (r'高([\d.]+)厘米', '高'),
            (r'长([\d.]+)厘米', '长'),
            (r'宽([\d.]+)厘米', '宽'),
            (r'厚([\d.]+)厘米', '厚'),
        ]
        
        for regex, dim_type in dim_patterns:
            match = re.search(regex, text)
            if match:
                dimensions[dim_type] = float(match.group(1))
        
        return dimensions
    
    def _extract_weights(self, text: str) -> Dict:
        """提取重量"""
        weights = {}
        
        match = re.search(r'重([\d.]+)克', text)
        if match:
            weights['weight'] = float(match.group(1))
        
        return weights
    
    def _extract_special_features(self, text: str) -> List[str]:
        """提取特殊特征"""
        features = []
        
        keywords = ['盗洞', '盗扰', '陪葬', '殉葬', '封土', '二层台', '壁龛', '积石', '积炭']
        for kw in keywords:
            if kw in text:
                features.append(kw)
        
        return features


class ArchaeologicalCountExtractorV5:
    """考古简报计数特征提取器 v5 - 两阶段提取"""
    
    def __init__(self):
        self.pattern_discovery = PatternDiscovery()
        self.precise_extractor = None
    
    def extract(self, text: str) -> Dict:
        """两阶段提取"""
        
        # 阶段1: 发现模式
        discovered_patterns, pattern_stats = self.pattern_discovery.discover(text)
        
        # 阶段2: 精确提取
        self.precise_extractor = PreciseExtractor(
            discovered_patterns,
            self.pattern_discovery.artifact_names
        )
        tomb_data_list = self.precise_extractor.extract(text)
        
        # 生成报告
        report = self._generate_report(discovered_patterns, pattern_stats, tomb_data_list)
        
        return report
    
    def _generate_report(self, patterns: List[CountPattern], pattern_stats: Dict, 
                         tomb_data_list: List[TombData]) -> Dict:
        """生成报告"""
        
        # 墓葬数据
        tomb_data_dicts = []
        for td in tomb_data_list:
            tomb_data_dicts.append({
                'tomb_id': td.tomb_id,
                'structure': td.structure,
                'artifacts': td.artifacts,
                'total_count': td.total_count,
                'categories': td.categories,
                'dimensions': td.dimensions,
                'weights': td.weights,
                'special_features': td.special_features,
            })
        
        # 汇总
        total_tombs = len(tomb_data_list)
        total_artifacts = sum(td.total_count for td in tomb_data_list)
        
        # 类别统计
        all_categories = Counter()
        for td in tomb_data_list:
            for cat, count in td.categories.items():
                all_categories[cat] += count
        
        # 结构类型统计
        structure_types = Counter()
        for td in tomb_data_list:
            if td.structure.get('type'):
                structure_types[td.structure['type']] += 1
        
        # 尺寸统计
        all_lengths = [td.structure['length'] for td in tomb_data_list if td.structure.get('length')]
        all_widths = [td.structure['width'] for td in tomb_data_list if td.structure.get('width')]
        all_depths = [td.structure['depth'] for td in tomb_data_list if td.structure.get('depth')]
        
        summary = {
            'total_tombs': total_tombs,
            'total_artifacts': total_artifacts,
            'avg_artifacts_per_tomb': round(total_artifacts / total_tombs, 1) if total_tombs else 0,
            'category_distribution': dict(all_categories),
            'structure_types': dict(structure_types),
            'size_ranges': {
                'length': (min(all_lengths), max(all_lengths)) if all_lengths else None,
                'width': (min(all_widths), max(all_widths)) if all_widths else None,
                'depth': (min(all_depths), max(all_depths)) if all_depths else None,
            }
        }
        
        return {
            'phase1_patterns': {
                'discovered_patterns': [
                    {
                        'type': p.pattern_type,
                        'example': p.example,
                        'frequency': p.frequency,
                        'regex': p.regex,
                        'unit': p.unit,
                    }
                    for p in patterns
                ],
                'statistics': pattern_stats,
            },
            'phase2_extraction': {
                'tomb_data': tomb_data_dicts,
            },
            'summary': summary,
        }


def extract_v5(text: str) -> Dict:
    """便捷函数"""
    extractor = ArchaeologicalCountExtractorV5()
    return extractor.extract(text)


if __name__ == "__main__":
    test_text = """
    M1为长方形土坑竖穴墓，方向185°。墓口长2.50米、宽1.20米、深3.10米。
    墓道位于北侧。出土器物共15件：铜鼎9件，铜壶8件，陶罐6件。
    M1:2号大铜鼎，口径34.9厘米、通高38.3厘米。
    
    M2为长方形砖室墓，南北向。墓口长3.00米、宽1.50米、深2.80米。
    出土器物共8件：陶罐5件，铜镜2件。
    
    M3为长方形土坑竖穴墓，方向175°。墓口长2.20米、宽1.00米、深2.50米。
    出土器物共5件：陶罐3件，铜钱若干。
    """
    
    result = extract_v5(test_text)
    print(json.dumps(result, ensure_ascii=False, indent=2))
