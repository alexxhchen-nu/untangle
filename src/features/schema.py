"""
断代特征体系定义
"""
from enum import Enum
from typing import Optional, Set, List
from dataclasses import dataclass, field

class TombType(str, Enum):
    PIT_PIT = "土坑竖穴"
    BRICK = "砖室"
    STONE = "石室"
    CLIFF = "崖墓"
    EARTH_CAVE = "土洞"
    WOOD_COFFIN = "木椁墓"
    MIXED = "混合"
    UNKNOWN = "未知"

class TombShape(str, Enum):
    RECTANGLE = "长方形"
    KNIFE = "刀形"
    CONVEX = "凸字形"
    SQUARE = "方形"
    CROSS = "十字形"
    IRREGULAR = "不规则"
    MULTI_CHAMBER = "多室"
    UNKNOWN = "未知"

class CoinType(str, Enum):
    WUZHU = "五铢"
    BANLIANG = "半两"
    KAIYUAN = "开元"
    OTHER = "其他"
    NONE = "无"

class LampType(str, Enum):
    DOU_LAMP = "豆灯"
    FIGURE_LAMP = "人俑灯"
    BOSHAN = "博山炉"
    SIMPLE = "普通灯"
    NONE = "无"

@dataclass
class TombFeatures:
    tomb_type: str = "未知"
    tomb_shape: str = "未知"
    has_tunnel: bool = False
    tunnel_direction: Optional[str] = None
    chamber_count: int = 1
    length: Optional[float] = None
    width: Optional[float] = None
    depth: Optional[float] = None
    direction: Optional[float] = None
    has_erbantai: bool = False
    has_bikan: bool = False
    floor_material: Optional[str] = None
    seal_method: Optional[str] = None
    vessel_combo: Set[str] = field(default_factory=set)
    has_bronze: bool = False
    has_iron: bool = False
    has_ceramic: bool = False
    has_jade: bool = False
    has_lacquer: bool = False
    has_coin: str = "无"
    has_mirror: bool = False
    has_lamp: str = "无"
    has_unicorn: bool = False
    special_items: Set[str] = field(default_factory=set)
    burial_position: str = "未知"
    head_direction: Optional[str] = None
    goods_placement: Optional[str] = None
    has_animal_sacrifice: bool = False
    animal_species: Set[str] = field(default_factory=set)
    tomb_id: str = ""
    dynasty_claimed: Optional[str] = None
    dynasty_actual: Optional[str] = None
    confidence: float = 0.0
    source: str = ""
