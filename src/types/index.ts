// 苫米地アルゴリズム関連の型定義
export enum NodeType {
  ATOMIC = 'atomic',
  LEAF = 'leaf',
  COMPLEX = 'complex'
}

export interface Arc {
  label: string;
  value: any;
}

export interface DGNode {
  id: string;
  node_type: NodeType;
  arc_list: Arc[];
  comp_arc_list: Arc[];
  forward_id?: string;
  copy_id?: string;
  generation: number;
  mark?: any;
  name?: string;
}

// アイデア管理システムの型定義
export interface Idea {
  id: string;
  title: string;
  content: string;
  energy_level: number; // 1-5のエネルギー値
  category_id?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  archived_at?: string;
  user_id: string;
  parent_ideas: string[]; // 親アイデアのID配列
  child_ideas: string[]; // 子アイデアのID配列
  related_ideas: string[]; // 関連アイデアのID配列
  attachments: Attachment[];
  dg_node_data?: DGNode; // 苫米地アルゴリズム用ノードデータ
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  parent_id?: string;
  user_id: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  usage_count: number;
  user_id: string;
  created_at: string;
}

export interface IdeaRelation {
  id: string;
  from_idea_id: string;
  to_idea_id: string;
  relation_type: RelationType;
  strength: number; // 関係の強さ (0.0-1.0)
  created_at: string;
  user_id: string;
}

export enum RelationType {
  SIMILAR = 'similar',
  DERIVED = 'derived',
  COMBINED = 'combined',
  INSPIRED = 'inspired',
  CONFLICTS = 'conflicts',
  SUPPORTS = 'supports'
}

export interface Attachment {
  id: string;
  idea_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  preferences: UserPreferences;
  created_at: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  default_view: 'list' | 'grid' | 'graph';
  auto_relate_ideas: boolean;
  energy_scale_type: '1-3' | '1-5' | '1-10';
  notification_settings: NotificationSettings;
}

export interface NotificationSettings {
  idea_reminders: boolean;
  daily_digest: boolean;
  weekly_report: boolean;
}

// UI状態管理用の型
export interface ViewState {
  currentView: 'list' | 'grid' | 'graph' | 'timeline';
  selectedIdeas: string[];
  searchQuery: string;
  activeFilters: FilterState;
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
}

export interface FilterState {
  categories: string[];
  tags: string[];
  energyLevels: number[];
  dateRange: {
    start?: string;
    end?: string;
  };
  relationType?: RelationType;
}

export type SortOption = 
  | 'created_at'
  | 'updated_at'
  | 'energy_level'
  | 'title'
  | 'relevance';

// グラフ可視化用の型
export interface GraphNode {
  id: string;
  label: string;
  type: 'idea' | 'category' | 'tag';
  energy?: number;
  category?: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// 分析レポート用の型
export interface AnalyticsData {
  totalIdeas: number;
  ideasThisWeek: number;
  ideasThisMonth: number;
  averageEnergyLevel: number;
  topCategories: CategoryStats[];
  topTags: TagStats[];
  ideaCreationPattern: TimeSeriesData[];
  relationshipDensity: number;
}

export interface CategoryStats {
  category: Category;
  ideaCount: number;
  averageEnergy: number;
}

export interface TagStats {
  tag: Tag;
  ideaCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TimeSeriesData {
  date: string;
  count: number;
  energy: number;
}