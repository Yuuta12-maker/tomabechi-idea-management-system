// Supabase自動生成型定義（手動で作成）
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          preferences: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          preferences?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          preferences?: any
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          parent_id: string | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string
          parent_id?: string | null
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string
          parent_id?: string | null
          user_id?: string
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          color: string
          usage_count: number
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          usage_count?: number
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          usage_count?: number
          user_id?: string
          created_at?: string
        }
      }
      ideas: {
        Row: {
          id: string
          title: string
          content: string | null
          energy_level: number
          category_id: string | null
          user_id: string
          node_type: string
          generation: number
          forward_idea_id: string | null
          copy_idea_id: string | null
          arc_data: any
          comp_arc_data: any
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          title: string
          content?: string | null
          energy_level?: number
          category_id?: string | null
          user_id: string
          node_type?: string
          generation?: number
          forward_idea_id?: string | null
          copy_idea_id?: string | null
          arc_data?: any
          comp_arc_data?: any
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string | null
          energy_level?: number
          category_id?: string | null
          user_id?: string
          node_type?: string
          generation?: number
          forward_idea_id?: string | null
          copy_idea_id?: string | null
          arc_data?: any
          comp_arc_data?: any
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
      }
      idea_tags: {
        Row: {
          idea_id: string
          tag_id: string
        }
        Insert: {
          idea_id: string
          tag_id: string
        }
        Update: {
          idea_id?: string
          tag_id?: string
        }
      }
      idea_relations: {
        Row: {
          id: string
          from_idea_id: string
          to_idea_id: string
          relation_type: string
          strength: number
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          from_idea_id: string
          to_idea_id: string
          relation_type: string
          strength?: number
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          from_idea_id?: string
          to_idea_id?: string
          relation_type?: string
          strength?: number
          user_id?: string
          created_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          idea_id: string
          file_name: string
          file_type: string
          file_size: number
          storage_path: string
          created_at: string
        }
        Insert: {
          id?: string
          idea_id: string
          file_name: string
          file_type: string
          file_size: number
          storage_path: string
          created_at?: string
        }
        Update: {
          id?: string
          idea_id?: string
          file_name?: string
          file_type?: string
          file_size?: number
          storage_path?: string
          created_at?: string
        }
      }
      unification_counter: {
        Row: {
          id: string
          user_id: string
          counter: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          counter?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          counter?: number
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_ideas: {
        Args: {
          search_query: string
          user_uuid: string
        }
        Returns: {
          id: string
          title: string
          content: string
          energy_level: number
          created_at: string
          rank: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}