"""
断代规则匹配引擎
Duandai Rule Engine

基于考古类型学的严格条件匹配，输出断代结果 + 置信度 + 证据链。
"""
import json
import yaml
from pathlib import Path
from typing import List, Dict, Optional, Set
from dataclasses import dataclass, field

# === 数据类 ===

@dataclass
class DatingRule:
    """断代规则"""
    id: str
    dynasty: str
    confidence: float
    conditions: dict
    evidence: str
    weight: float = 1.0

    def matches(self, features: dict) -> tuple[bool, list[str]]:
        """
        检查特征是否满足规则条件。
        返回: (是否匹配, 匹配的证据列表)
        """
        matched_evidence = []

        for key, value in self.conditions.items():
            # 处理 _contains 后缀 (集合包含检查)
            if key.endswith("_contains"):
                base_key = key.replace("_contains", "")
                feat_val = features.get(base_key)
                if feat_val is None:
                    return False, []
                if isinstance(feat_val, (list, set)):
                    if not set(value).issubset(set(feat_val)):
                        return False, []
                    matched_evidence.append(f"{base_key}包含{value}")
                else:
                    return False, []
            else:
                feat_val = features.get(key)
                if feat_val is None:
                    return False, []

                if isinstance(value, (list, set)):
                    if feat_val not in value:
                        return False, []
                    matched_evidence.append(f"{key}={feat_val}")
                elif isinstance(value, bool):
                    if feat_val != value:
                        return False, []
                    matched_evidence.append(f"{key}={feat_val}")
                else:
                    if feat_val != value:
                        return False, []
                    matched_evidence.append(f"{key}={feat_val}")

        return True, matched_evidence


@dataclass
class DatingResult:
    """断代结果"""
    dynasty: str
    confidence: float
    evidence: List[str]
    alternatives: List[Dict]  # [{dynasty, confidence}]
    matched_rules: List[str]
    features_used: Dict

    def to_dict(self) -> dict:
        return {
            "dynasty": self.dynasty,
            "confidence": round(self.confidence, 3),
            "evidence": self.evidence,
            "alternatives": self.alternatives,
            "matched_rules": self.matched_rules,
        }


# === 规则引擎 ===

class DuandaiEngine:
    """断代规则引擎"""

    def __init__(self, rules_path: Optional[str] = None):
        self.rules: List[DatingRule] = []
        if rules_path:
            self.load_rules(rules_path)

    def load_rules(self, path: str):
        """从 YAML 文件加载规则"""
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        for item in data:
            rule = DatingRule(
                id=item["id"],
                dynasty=item["dynasty"],
                confidence=item["confidence"],
                conditions=item.get("conditions", {}),
                evidence=item.get("evidence", ""),
                weight=item.get("weight", 1.0),
            )
            self.rules.append(rule)

        print(f"Loaded {len(self.rules)} rules")

    def predict(self, features: dict) -> DatingResult:
        """
        对给定特征进行断代。

        Args:
            features: 墓葬特征字典

        Returns:
            DatingResult: 断代结果
        """
        matches = []  # [(rule, matched_evidence)]

        for rule in self.rules:
            is_match, evidence = rule.matches(features)
            if is_match:
                matches.append((rule, evidence))

        if not matches:
            return DatingResult(
                dynasty="未知",
                confidence=0.0,
                evidence=["无规则匹配"],
                alternatives=[],
                matched_rules=[],
                features_used=features,
            )

        # 按置信度 * 权重排序
        matches.sort(key=lambda x: x[0].confidence * x[0].weight, reverse=True)

        best_rule, best_evidence = matches[0]
        all_evidence = []
        all_evidence.extend(best_evidence)
        all_evidence.append(best_rule.evidence)

        # 构建替代选项
        alternatives = []
        seen_dynasties = {best_rule.dynasty}
        for rule, evidence in matches[1:5]:  # 最多4个替代
            if rule.dynasty not in seen_dynasties:
                alternatives.append({
                    "dynasty": rule.dynasty,
                    "confidence": round(rule.confidence * rule.weight, 3),
                })
                seen_dynasties.add(rule.dynasty)

        return DatingResult(
            dynasty=best_rule.dynasty,
            confidence=round(best_rule.confidence * best_rule.weight, 3),
            evidence=all_evidence,
            alternatives=alternatives,
            matched_rules=[r.id for r, _ in matches],
            features_used=features,
        )

    def predict_batch(self, tombs: List[dict]) -> List[DatingResult]:
        """批量断代"""
        results = []
        for tomb in tombs:
            features = tomb.get("features", tomb)
            result = self.predict(features)
            results.append(result)
        return results


# === CLI 入口 ===

def main():
    import argparse
    parser = argparse.ArgumentParser(description="断代规则引擎")
    parser.add_argument("--rules", default="src/rules/rules.yaml", help="规则文件路径")
    parser.add_argument("--input", help="输入JSON文件 (墓葬特征)")
    parser.add_argument("--golden", help="验证golden set")
    args = parser.parse_args()

    engine = DuandaiEngine(args.rules)

    if args.golden:
        # 验证模式
        with open(args.golden, "r", encoding="utf-8") as f:
            golden_set = json.load(f)

        correct = 0
        total = len(golden_set)

        print(f"\n{'='*60}")
        print(f"验证 Golden Set ({total} 座墓葬)")
        print(f"{'='*60}\n")

        for tomb in golden_set:
            features = tomb["features"]
            actual = tomb["dynasty_actual"]
            result = engine.predict(features)

            match = result.dynasty == actual
            correct += match

            status = "✓" if match else "✗"
            print(f"{status} {tomb['tomb_id']}")
            print(f"  预测: {result.dynasty} (置信度: {result.confidence})")
            print(f"  实际: {actual}")
            print(f"  证据: {result.evidence[0] if result.evidence else '无'}")
            if result.alternatives:
                print(f"  备选: {[a['dynasty'] for a in result.alternatives[:2]]}")
            print()

        accuracy = correct / total
        print(f"{'='*60}")
        print(f"准确率: {correct}/{total} = {accuracy:.1%}")
        print(f"{'='*60}")

    elif args.input:
        # 单条预测
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, list):
            results = engine.predict_batch(data)
        else:
            result = engine.predict(data)
            results = [result]

        for i, result in enumerate(results):
            print(f"\n--- 墓葬 {i+1} ---")
            print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))

    else:
        # 交互模式
        print("断代规则引擎 - 交互模式")
        print("输入墓葬特征 JSON，输出断代结果")
        print("输入 'quit' 退出\n")

        while True:
            try:
                line = input("特征> ").strip()
                if line.lower() in ("quit", "exit", "q"):
                    break
                if not line:
                    continue

                features = json.loads(line)
                result = engine.predict(features)
                print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
            except json.JSONDecodeError as e:
                print(f"JSON 解析错误: {e}")
            except KeyboardInterrupt:
                break
            except EOFError:
                break


if __name__ == "__main__":
    main()
