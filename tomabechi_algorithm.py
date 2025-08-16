"""
Tomabechi Quasi-Destructive Unification Algorithm
Modern Python Implementation (2025)

Based on the original 1990 ANSI Common Lisp implementation
by Dr. Hideto Tomabechi (Carnegie Mellon University)
"""

from typing import Optional, Dict, List, Any, Set
from dataclasses import dataclass, field
from enum import Enum
import threading
from weakref import WeakSet

class NodeType(Enum):
    ATOMIC = "atomic"
    LEAF = "leaf" 
    COMPLEX = "complex"

@dataclass
class Arc:
    """アーク（関係）を表すデータ構造"""
    label: str
    value: Any
    
    def __hash__(self):
        return hash((self.label, id(self.value)))
    
    def __eq__(self, other):
        return isinstance(other, Arc) and self.label == other.label

@dataclass
class DGNode:
    """有向グラフノード - 苫米地アルゴリズムの核心データ構造"""
    node_type: NodeType
    arc_list: List[Arc] = field(default_factory=list)
    comp_arc_list: List[Arc] = field(default_factory=list)  # 補完アークリスト（重要！）
    forward: Optional['DGNode'] = None  # 前方参照
    copy: Optional['DGNode'] = None     # 構造共有用
    generation: int = 0                 # 世代管理
    mark: Any = None
    name: Optional[str] = None          # リーフノード用
    
    def __post_init__(self):
        self.id = id(self)  # ユニークID

class UnificationCounter:
    """グローバル統合カウンタ - スレッドセーフ"""
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance.counter = 10  # 元実装と同じく10から開始
        return cls._instance
    
    def next_generation(self):
        with self._lock:
            self.counter += 1
            return self.counter

class UnificationFailure(Exception):
    """統合失敗例外"""
    pass

class TomabechiUnifier:
    """苫米地準破壊的統合アルゴリズム実装"""
    
    def __init__(self, structure_sharing: bool = True):
        self.structure_sharing = structure_sharing
        self.counter = UnificationCounter()
        self.shared_structures: WeakSet = WeakSet()  # 構造共有管理
    
    def dereference(self, node: DGNode) -> DGNode:
        """参照解決 - forwardチェーンをたどる"""
        current = node
        path = []
        
        # 循環参照検出
        while current.forward is not None:
            if current in path:
                raise ValueError("Circular reference detected")
            path.append(current)
            current = current.forward
        
        # パス圧縮最適化
        for node_in_path in path:
            node_in_path.forward = current
            
        return current
    
    def is_leaf_node(self, node: DGNode) -> bool:
        """リーフノード判定"""
        return node.node_type == NodeType.LEAF
    
    def is_complex_node(self, node: DGNode) -> bool:
        """複合ノード判定"""
        return node.node_type == NodeType.COMPLEX
    
    def find_arc(self, label: str, arc_list: List[Arc]) -> Optional[Arc]:
        """指定ラベルのアークを検索"""
        for arc in arc_list:
            if arc.label == label:
                return arc
        return None
    
    def intersect_arcs(self, arcs1: List[Arc], arcs2: List[Arc]) -> List[Arc]:
        """アークの積集合計算 - 共通ラベルを持つアーク"""
        shared = []
        labels1 = {arc.label for arc in arcs1}
        
        for arc2 in arcs2:
            if arc2.label in labels1:
                shared.append(arc2)
        
        return shared
    
    def complement_arcs(self, arcs1: List[Arc], arcs2: List[Arc]) -> List[Arc]:
        """アークの補集合計算 - arcs1にのみ存在するアーク"""
        labels2 = {arc.label for arc in arcs2}
        complement = []
        
        for arc1 in arcs1:
            if arc1.label not in labels2:
                complement.append(arc1)
        
        return complement
    
    def unify_core(self, node1: DGNode, node2: DGNode) -> bool:
        """核心統合アルゴリズム - 準破壊的統合"""
        # 参照解決
        dg1 = self.dereference(node1)
        dg2 = self.dereference(node2)
        
        # 同一ノードチェック
        if dg1 is dg2:
            return True
        
        # リーフノード同士の統合
        if self.is_leaf_node(dg1) and self.is_leaf_node(dg2):
            if dg1.name == dg2.name:
                return True
            else:
                raise UnificationFailure("Leaf nodes with different names")
        
        # 片方がリーフノードの場合
        if self.is_leaf_node(dg1):
            dg1.forward = dg2
            dg1.generation = self.counter.next_generation()
            return True
        
        if self.is_leaf_node(dg2):
            dg2.forward = dg1
            dg2.generation = self.counter.next_generation()
            return True
        
        # 複合ノード同士の統合 - アルゴリズムの核心部分
        shared_arcs = self.intersect_arcs(dg1.arc_list, dg2.arc_list)
        new_arcs = self.complement_arcs(dg2.arc_list, dg1.arc_list)
        
        if not shared_arcs:
            # 共通アークがない場合 - 単純併合
            dg1.comp_arc_list.extend(new_arcs)
            dg1.generation = self.counter.next_generation()
            dg1.forward = dg2
            return True
        else:
            # 共通アークがある場合 - 再帰的統合
            for arc in shared_arcs:
                arc1 = self.find_arc(arc.label, dg1.arc_list)
                if arc1:
                    # 再帰的統合実行
                    self.unify_core(arc1.value, arc.value)
            
            # 補完アーク追加（単調性保証）
            dg1.comp_arc_list.extend(new_arcs)
            dg1.generation = self.counter.next_generation()
            dg1.forward = dg2
            return True
    
    def copy_with_comp_arcs(self, node: DGNode) -> DGNode:
        """構造共有を考慮したコピー生成"""
        if self.structure_sharing and node in self.shared_structures:
            # 既存の共有構造を利用
            return node.copy if node.copy else node
        
        # 新しいノードを作成
        new_node = DGNode(
            node_type=node.node_type,
            arc_list=node.arc_list.copy(),
            comp_arc_list=node.comp_arc_list.copy(),
            name=node.name
        )
        
        # comp_arc_listの内容をarc_listに統合
        new_node.arc_list.extend(new_node.comp_arc_list)
        new_node.comp_arc_list.clear()
        
        if self.structure_sharing:
            node.copy = new_node
            self.shared_structures.add(node)
        
        return new_node
    
    def unify(self, node1: DGNode, node2: DGNode) -> Optional[DGNode]:
        """トップレベル統合関数"""
        try:
            if self.unify_core(node1, node2):
                result = self.copy_with_comp_arcs(node1)
                return result
            return None
        except UnificationFailure:
            return None

def create_leaf_node(name: str) -> DGNode:
    """リーフノード作成ヘルパー"""
    return DGNode(NodeType.LEAF, name=name)

def create_complex_node(arcs: List[Arc]) -> DGNode:
    """複合ノード作成ヘルパー"""
    return DGNode(NodeType.COMPLEX, arc_list=arcs)

# 使用例とテスト
def demonstration():
    """苫米地アルゴリズムのデモンストレーション"""
    unifier = TomabechiUnifier(structure_sharing=True)
    
    # ノード作成
    node_a = create_leaf_node("A")
    node_b = create_leaf_node("B")
    
    # 複合ノード作成
    complex1 = create_complex_node([
        Arc("feature1", node_a),
        Arc("feature2", create_leaf_node("X"))
    ])
    
    complex2 = create_complex_node([
        Arc("feature1", node_b),
        Arc("feature3", create_leaf_node("Y"))
    ])
    
    print("=== 苫米地アルゴリズム実行デモ ===")
    print(f"統合前 - Complex1のアーク数: {len(complex1.arc_list)}")
    print(f"統合前 - Complex2のアーク数: {len(complex2.arc_list)}")
    
    # 統合実行
    result = unifier.unify(complex1, complex2)
    
    if result:
        print(f"✅ 統合成功!")
        print(f"結果ノードのアーク数: {len(result.arc_list)}")
        print(f"世代番号: {result.generation}")
        print(f"構造共有有効: {unifier.structure_sharing}")
    else:
        print("❌ 統合失敗")

if __name__ == "__main__":
    demonstration()