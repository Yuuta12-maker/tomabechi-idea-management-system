import { supabase } from './supabase'
import { TomabechiSupabaseUnifier } from './tomabechiAlgorithm'
import type { Idea, Tag, Category } from '@/types'

export class IdeaService {
  private userId: string
  private unifier: TomabechiSupabaseUnifier

  constructor(userId: string) {
    this.userId = userId
    this.unifier = new TomabechiSupabaseUnifier(userId)
  }

  // アイデアの作成
  async createIdea(data: {
    title: string
    content?: string
    energy_level: number
    category_id?: string
    tags?: string[]
  }): Promise<Idea> {
    try {
      console.log('Creating idea for user:', this.userId)
      console.log('Idea data to insert:', {
        title: data.title,
        content: data.content || '',
        energy_level: data.energy_level,
        category_id: data.category_id,
        user_id: this.userId,
        node_type: 'complex',
        arc_data: [],
        comp_arc_data: []
      })

      // アイデアを作成
      const { data: ideaData, error: ideaError } = await supabase
        .from('ideas')
        .insert({
          title: data.title,
          content: data.content || '',
          energy_level: data.energy_level,
          category_id: data.category_id && data.category_id !== '' ? data.category_id : null,
          user_id: this.userId,
          node_type: 'complex',
          arc_data: [],
          comp_arc_data: []
        })
        .select()
        .single()

      if (ideaError) {
        console.error('Error creating idea:', ideaError)
        console.error('Error details:', JSON.stringify(ideaError, null, 2))
        throw new Error(`アイデア作成エラー: ${ideaError.message || ideaError.details || JSON.stringify(ideaError)}`)
      }

      console.log('Created idea data:', ideaData)

      // タグの処理
      if (data.tags && data.tags.length > 0) {
        await this.attachTagsToIdea(ideaData.id, data.tags)
      }

      // 関連アイデアの自動検出（即座に実行）
      try {
        await this.autoDiscoverAndCreateRelations(ideaData.id)
      } catch (error) {
        console.error('Failed to auto-discover relations:', error)
      }

      return await this.getIdeaById(ideaData.id)
    } catch (error) {
      console.error('Failed to create idea:', error)
      throw error
    }
  }

  // アイデアの取得（単体）
  async getIdeaById(ideaId: string): Promise<Idea> {
    try {
      const { data: ideaData, error: ideaError } = await supabase
        .from('ideas')
        .select(`
          *,
          categories (id, name, color),
          idea_tags (
            tags (id, name, color)
          )
        `)
        .eq('id', ideaId)
        .eq('user_id', this.userId)
        .single()

      if (ideaError) throw ideaError

      // タグ情報を整理
      const tags = ideaData.idea_tags?.map((it: any) => it.tags) || []

      // 関連アイデアを取得
      const { data: relationsData } = await supabase
        .from('idea_relations')
        .select('to_idea_id, relation_type, strength')
        .eq('from_idea_id', ideaId)
        .eq('user_id', this.userId)

      const relatedIdeas = relationsData?.map(r => r.to_idea_id) || []

      return {
        id: ideaData.id,
        title: ideaData.title,
        content: ideaData.content || '',
        energy_level: ideaData.energy_level,
        category_id: ideaData.category_id,
        tags: tags.map((tag: any) => tag.name),
        created_at: ideaData.created_at,
        updated_at: ideaData.updated_at,
        archived_at: ideaData.archived_at,
        user_id: ideaData.user_id,
        parent_ideas: [],
        child_ideas: [],
        related_ideas: relatedIdeas,
        attachments: [],
        dg_node_data: {
          id: ideaData.id,
          node_type: ideaData.node_type,
          arc_list: ideaData.arc_data || [],
          comp_arc_list: ideaData.comp_arc_data || [],
          forward_id: ideaData.forward_idea_id,
          copy_id: ideaData.copy_idea_id,
          generation: ideaData.generation,
          name: ideaData.node_type === 'leaf' ? ideaData.title : undefined
        }
      }
    } catch (error) {
      console.error('Failed to get idea:', error)
      throw error
    }
  }

  // アイデア一覧の取得
  async getIdeas(filters?: {
    search?: string
    category_id?: string
    tags?: string[]
    energy_levels?: number[]
    limit?: number
    offset?: number
  }): Promise<Idea[]> {
    try {
      console.log('Getting ideas for user:', this.userId)
      
      let query = supabase
        .from('ideas')
        .select(`
          *,
          categories (id, name, color),
          idea_tags (
            tags (id, name, color)
          )
        `)
        .eq('user_id', this.userId)
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      // フィルター適用
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id)
      }

      if (filters?.energy_levels && filters.energy_levels.length > 0) {
        query = query.in('energy_level', filters.energy_levels)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching ideas:', error)
        throw error
      }

      console.log('Fetched ideas data:', data)
      const ideas: Idea[] = []
      
      for (const ideaData of data || []) {
        // タグフィルターの適用
        const tags = ideaData.idea_tags?.map((it: any) => it.tags.name) || []
        
        if (filters?.tags && filters.tags.length > 0) {
          const hasMatchingTag = filters.tags.some(filterTag => 
            tags.some((tag: string) => tag.toLowerCase().includes(filterTag.toLowerCase()))
          )
          if (!hasMatchingTag) continue
        }

        // 検索フィルターの適用
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase()
          const matchesSearch = 
            ideaData.title.toLowerCase().includes(searchLower) ||
            (ideaData.content && ideaData.content.toLowerCase().includes(searchLower)) ||
            tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
          
          if (!matchesSearch) continue
        }

        ideas.push({
          id: ideaData.id,
          title: ideaData.title,
          content: ideaData.content || '',
          energy_level: ideaData.energy_level,
          category_id: ideaData.category_id,
          tags: tags,
          created_at: ideaData.created_at,
          updated_at: ideaData.updated_at,
          archived_at: ideaData.archived_at,
          user_id: ideaData.user_id,
          parent_ideas: [],
          child_ideas: [],
          related_ideas: [],
          attachments: [],
          dg_node_data: {
            id: ideaData.id,
            node_type: ideaData.node_type,
            arc_list: ideaData.arc_data || [],
            comp_arc_list: ideaData.comp_arc_data || [],
            forward_id: ideaData.forward_idea_id,
            copy_id: ideaData.copy_idea_id,
            generation: ideaData.generation,
            name: ideaData.node_type === 'leaf' ? ideaData.title : undefined
          }
        })
      }

      return ideas
    } catch (error) {
      console.error('Failed to get ideas:', error)
      throw error
    }
  }

  // アイデアの更新
  async updateIdea(ideaId: string, data: {
    title?: string
    content?: string
    energy_level?: number
    category_id?: string
    tags?: string[]
  }): Promise<Idea> {
    try {
      // アイデア本体の更新
      const { error: updateError } = await supabase
        .from('ideas')
        .update({
          title: data.title,
          content: data.content,
          energy_level: data.energy_level,
          category_id: data.category_id && data.category_id !== '' ? data.category_id : null
        })
        .eq('id', ideaId)
        .eq('user_id', this.userId)

      if (updateError) throw updateError

      // タグの更新
      if (data.tags !== undefined) {
        // 既存のタグ関連を削除
        await supabase
          .from('idea_tags')
          .delete()
          .eq('idea_id', ideaId)

        // 新しいタグを追加
        if (data.tags.length > 0) {
          await this.attachTagsToIdea(ideaId, data.tags)
        }
      }

      return await this.getIdeaById(ideaId)
    } catch (error) {
      console.error('Failed to update idea:', error)
      throw error
    }
  }

  // アイデアのアーカイブ（苫米地アルゴリズムの完全単調性により削除ではなくアーカイブ）
  async archiveIdea(ideaId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ideas')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', ideaId)
        .eq('user_id', this.userId)

      if (error) throw error
    } catch (error) {
      console.error('Failed to archive idea:', error)
      throw error
    }
  }

  // タグをアイデアに関連付け
  private async attachTagsToIdea(ideaId: string, tagNames: string[]): Promise<void> {
    for (const tagName of tagNames) {
      // タグが存在しない場合は作成
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .eq('user_id', this.userId)
        .single()

      let tagId: string

      if (existingTag) {
        tagId = existingTag.id
      } else {
        const { data: newTag, error: tagError } = await supabase
          .from('tags')
          .insert({
            name: tagName,
            user_id: this.userId
          })
          .select('id')
          .single()

        if (tagError) throw tagError
        tagId = newTag.id
      }

      // アイデアとタグを関連付け
      await supabase
        .from('idea_tags')
        .insert({
          idea_id: ideaId,
          tag_id: tagId
        })
    }
  }

  // 関連アイデアの自動検出と関係性作成
  private async autoDiscoverAndCreateRelations(ideaId: string): Promise<void> {
    try {
      const relatedIdeas = await this.unifier.autoDiscoverRelations(ideaId)
      
      for (const related of relatedIdeas.slice(0, 5)) { // 最大5個まで
        // 既存の関係をチェック
        const { data: existingRelation } = await supabase
          .from('idea_relations')
          .select('id')
          .eq('from_idea_id', ideaId)
          .eq('to_idea_id', related.id)
          .single()

        if (!existingRelation) {
          await supabase
            .from('idea_relations')
            .insert({
              from_idea_id: ideaId,
              to_idea_id: related.id,
              relation_type: 'similar',
              strength: related.strength,
              user_id: this.userId
            })
        }
      }
    } catch (error) {
      console.error('Failed to auto-discover relations:', error)
    }
  }

  // 2つのアイデアを統合（苫米地アルゴリズム）
  async unifyIdeas(idea1Id: string, idea2Id: string): Promise<Idea | null> {
    try {
      return await this.unifier.unify(idea1Id, idea2Id)
    } catch (error) {
      console.error('Failed to unify ideas:', error)
      return null
    }
  }

  // カテゴリ一覧の取得
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', this.userId)
        .order('name')

      if (error) throw error

      return data?.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        color: cat.color,
        parent_id: cat.parent_id,
        user_id: cat.user_id,
        created_at: cat.created_at
      })) || []
    } catch (error) {
      console.error('Failed to get categories:', error)
      return []
    }
  }

  // タグ一覧の取得
  async getTags(): Promise<Tag[]> {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', this.userId)
        .order('usage_count', { ascending: false })

      if (error) throw error

      return data?.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        usage_count: tag.usage_count,
        user_id: tag.user_id,
        created_at: tag.created_at
      })) || []
    } catch (error) {
      console.error('Failed to get tags:', error)
      return []
    }
  }
}