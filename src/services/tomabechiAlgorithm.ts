import { supabase } from './supabase'
import type { Idea, Arc, NodeType } from '@/types'
import { RelationType } from '@/types'

export class TomabechiSupabaseUnifier {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async getNextGeneration(): Promise<number> {
    const { data, error } = await supabase
      .from('unification_counter')
      .select('counter')
      .eq('user_id', this.userId)
      .single()

    if (error) {
      throw new Error(`Failed to get counter: ${error.message}`)
    }

    const newCounter = data.counter + 1

    await supabase
      .from('unification_counter')
      .update({ counter: newCounter })
      .eq('user_id', this.userId)

    return newCounter
  }

  async dereference(ideaId: string): Promise<Idea> {
    let currentId = ideaId
    const visited = new Set<string>()

    while (true) {
      if (visited.has(currentId)) {
        throw new Error('Circular reference detected')
      }
      visited.add(currentId)

      const { data: idea, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', currentId)
        .single()

      if (error) {
        throw new Error(`Failed to dereference idea: ${error.message}`)
      }

      if (!idea.forward_idea_id) {
        return this.convertToIdea(idea)
      }

      currentId = idea.forward_idea_id
    }
  }

  private convertToIdea(dbRow: any): Idea {
    return {
      id: dbRow.id,
      title: dbRow.title,
      content: dbRow.content || '',
      energy_level: dbRow.energy_level,
      category_id: dbRow.category_id,
      tags: [], // 別途取得が必要
      created_at: dbRow.created_at,
      updated_at: dbRow.updated_at,
      archived_at: dbRow.archived_at,
      user_id: dbRow.user_id,
      parent_ideas: [],
      child_ideas: [],
      related_ideas: [],
      attachments: [],
      dg_node_data: {
        id: dbRow.id,
        node_type: dbRow.node_type as NodeType,
        arc_list: dbRow.arc_data || [],
        comp_arc_list: dbRow.comp_arc_data || [],
        forward_id: dbRow.forward_idea_id,
        copy_id: dbRow.copy_idea_id,
        generation: dbRow.generation,
        name: dbRow.node_type === 'leaf' ? dbRow.title : undefined
      }
    }
  }

  private isLeafNode(idea: Idea): boolean {
    return idea.dg_node_data?.node_type === 'leaf'
  }

  private findArc(label: string, arcList: Arc[]): Arc | undefined {
    return arcList.find(arc => arc.label === label)
  }

  private intersectArcs(arcs1: Arc[], arcs2: Arc[]): Arc[] {
    const labels1 = new Set(arcs1.map(arc => arc.label))
    return arcs2.filter(arc => labels1.has(arc.label))
  }

  private complementArcs(arcs1: Arc[], arcs2: Arc[]): Arc[] {
    const labels2 = new Set(arcs2.map(arc => arc.label))
    return arcs1.filter(arc => !labels2.has(arc.label))
  }

  async unifyCore(idea1Id: string, idea2Id: string): Promise<boolean> {
    const dg1 = await this.dereference(idea1Id)
    const dg2 = await this.dereference(idea2Id)

    if (dg1.id === dg2.id) {
      return true
    }

    const node1 = dg1.dg_node_data!
    const node2 = dg2.dg_node_data!

    // リーフノード同士の統合
    if (this.isLeafNode(dg1) && this.isLeafNode(dg2)) {
      if (node1.name === node2.name) {
        return true
      } else {
        throw new Error('Leaf nodes with different names cannot be unified')
      }
    }

    // 片方がリーフノードの場合
    if (this.isLeafNode(dg1)) {
      await this.setForwardReference(dg1.id, dg2.id)
      return true
    }

    if (this.isLeafNode(dg2)) {
      await this.setForwardReference(dg2.id, dg1.id)
      return true
    }

    // 複合ノード同士の統合
    const sharedArcs = this.intersectArcs(node1.arc_list, node2.arc_list)
    const newArcs = this.complementArcs(node2.arc_list, node1.arc_list)

    if (sharedArcs.length === 0) {
      // 共通アークがない場合 - 単純併合
      const updatedCompArcs = [...node1.comp_arc_list, ...newArcs]
      await this.updateIdeaNode(dg1.id, {
        comp_arc_data: updatedCompArcs,
        forward_idea_id: dg2.id,
        generation: await this.getNextGeneration()
      })
      return true
    } else {
      // 共通アークがある場合 - 再帰的統合
      for (const sharedArc of sharedArcs) {
        const arc1 = this.findArc(sharedArc.label, node1.arc_list)
        if (arc1 && typeof arc1.value === 'string') {
          // 再帰的統合実行
          await this.unifyCore(arc1.value, sharedArc.value)
        }
      }

      // 補完アーク追加（単調性保証）
      const updatedCompArcs = [...node1.comp_arc_list, ...newArcs]
      await this.updateIdeaNode(dg1.id, {
        comp_arc_data: updatedCompArcs,
        forward_idea_id: dg2.id,
        generation: await this.getNextGeneration()
      })
      return true
    }
  }

  private async setForwardReference(fromId: string, toId: string): Promise<void> {
    const generation = await this.getNextGeneration()
    await supabase
      .from('ideas')
      .update({
        forward_idea_id: toId,
        generation: generation
      })
      .eq('id', fromId)
  }

  private async updateIdeaNode(ideaId: string, updates: Partial<{
    arc_data: Arc[]
    comp_arc_data: Arc[]
    forward_idea_id: string | null
    copy_idea_id: string | null
    generation: number
  }>): Promise<void> {
    const { error } = await supabase
      .from('ideas')
      .update(updates)
      .eq('id', ideaId)

    if (error) {
      throw new Error(`Failed to update idea node: ${error.message}`)
    }
  }

  async copyWithCompArcs(ideaId: string): Promise<Idea> {
    const idea = await this.dereference(ideaId)
    const node = idea.dg_node_data!

    // 新しいアイデアとして作成
    const mergedArcs = [...node.arc_list, ...node.comp_arc_list]
    
    const { data: newIdea, error } = await supabase
      .from('ideas')
      .insert({
        title: `${idea.title} (統合結果)`,
        content: idea.content,
        energy_level: idea.energy_level,
        category_id: idea.category_id,
        user_id: this.userId,
        node_type: node.node_type,
        arc_data: mergedArcs,
        comp_arc_data: [],
        generation: node.generation
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create unified idea: ${error.message}`)
    }

    // 元のアイデアにコピー参照を設定
    await supabase
      .from('ideas')
      .update({ copy_idea_id: newIdea.id })
      .eq('id', ideaId)

    return this.convertToIdea(newIdea)
  }

  async unify(idea1Id: string, idea2Id: string): Promise<Idea | null> {
    try {
      const success = await this.unifyCore(idea1Id, idea2Id)
      if (success) {
        const result = await this.copyWithCompArcs(idea1Id)
        
        // 関係性をデータベースに記録
        await this.createIdeaRelation(idea1Id, idea2Id, RelationType.COMBINED, 1.0)
        
        return result
      }
      return null
    } catch (error) {
      console.error('Unification failed:', error)
      return null
    }
  }

  private async createIdeaRelation(
    fromId: string, 
    toId: string, 
    relationType: RelationType, 
    strength: number
  ): Promise<void> {
    await supabase
      .from('idea_relations')
      .insert({
        from_idea_id: fromId,
        to_idea_id: toId,
        relation_type: relationType,
        strength: strength,
        user_id: this.userId
      })
  }

  async autoDiscoverRelations(ideaId: string): Promise<Array<{id: string, strength: number}>> {
    const idea = await this.dereference(ideaId)
    
    // 他のアイデアを取得
    const { data: allIdeas, error } = await supabase
      .from('ideas')
      .select(`
        id, title, content, energy_level,
        idea_tags (
          tags (name)
        )
      `)
      .eq('user_id', this.userId)
      .neq('id', ideaId)
      .is('archived_at', null)

    if (error) {
      console.error('Failed to fetch ideas for relation discovery:', error)
      return []
    }

    const relations: Array<{id: string, strength: number}> = []

    for (const otherIdea of allIdeas || []) {
      const strength = this.calculateSimilarity(idea, {
        ...otherIdea,
        tags: otherIdea.idea_tags?.map((it: any) => it.tags.name) || []
      })
      
      // 関係性が一定の閾値以上の場合のみ追加（閾値を下げて検出しやすくする）
      if (strength > 0.1) {
        relations.push({ id: otherIdea.id, strength })
      }
      
      // デバッグ用：類似性スコアをログ出力
      console.log(`Similarity between "${idea.title}" and "${otherIdea.title}": ${strength.toFixed(3)}`)
    }

    // 関係性の強い順にソート
    return relations.sort((a, b) => b.strength - a.strength)
  }

  private calculateSimilarity(idea1: any, idea2: any): number {
    let totalScore = 0
    let maxScore = 0

    // 1. タイトルの類似性 (重み: 40%)
    const titleSimilarity = this.textSimilarity(idea1.title || '', idea2.title || '')
    totalScore += titleSimilarity * 0.4
    maxScore += 0.4

    // 2. 内容の類似性 (重み: 30%)
    const contentSimilarity = this.textSimilarity(idea1.content || '', idea2.content || '')
    totalScore += contentSimilarity * 0.3
    maxScore += 0.3

    // 3. タグの重複 (重み: 20%)
    const tags1 = idea1.tags || []
    const tags2 = idea2.tags || []
    const commonTags = tags1.filter((tag: string) => tags2.includes(tag))
    const tagSimilarity = tags1.length > 0 || tags2.length > 0 
      ? (commonTags.length * 2) / (tags1.length + tags2.length)
      : 0
    totalScore += tagSimilarity * 0.2
    maxScore += 0.2

    // 4. エネルギーレベルの近似性 (重み: 10%)
    const energyDiff = Math.abs(idea1.energy_level - idea2.energy_level)
    const energySimilarity = 1 - (energyDiff / 4) // 0-1の範囲に正規化
    totalScore += energySimilarity * 0.1
    maxScore += 0.1

    return maxScore > 0 ? totalScore / maxScore : 0
  }

  private textSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0
    
    // 日本語対応の改善された類似性計算
    const normalize = (text: string) => text.toLowerCase().replace(/[、。！？\s]/g, '')
    const normalized1 = normalize(text1)
    const normalized2 = normalize(text2)
    
    // 文字レベルでの共通部分を検出
    let commonChars = 0
    const chars1 = Array.from(normalized1)
    const chars2 = Array.from(normalized2)
    
    // 共通文字数をカウント
    const used2 = new Set<number>()
    for (let i = 0; i < chars1.length; i++) {
      for (let j = 0; j < chars2.length; j++) {
        if (!used2.has(j) && chars1[i] === chars2[j]) {
          commonChars++
          used2.add(j)
          break
        }
      }
    }
    
    // 部分文字列の検出（2文字以上）
    let substringScore = 0
    for (let len = 2; len <= Math.min(normalized1.length, normalized2.length); len++) {
      for (let i = 0; i <= normalized1.length - len; i++) {
        const substring = normalized1.substr(i, len)
        if (normalized2.includes(substring)) {
          substringScore += len * len // 長い部分文字列ほど高得点
        }
      }
    }
    
    const charSimilarity = commonChars * 2 / (chars1.length + chars2.length)
    const substringWeight = substringScore / (normalized1.length * normalized2.length)
    
    return Math.min(1, charSimilarity * 0.3 + substringWeight * 0.7)
  }

  async createStructureSharedNode(baseIdeaId: string, newTitle: string, newContent: string): Promise<Idea> {
    const baseIdea = await this.dereference(baseIdeaId)
    const baseNode = baseIdea.dg_node_data!

    const { data: newIdea, error } = await supabase
      .from('ideas')
      .insert({
        title: newTitle,
        content: newContent,
        energy_level: baseIdea.energy_level,
        category_id: baseIdea.category_id,
        user_id: this.userId,
        node_type: 'complex',
        arc_data: baseNode.arc_list, // 構造共有
        comp_arc_data: [],
        generation: 0
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create structure shared idea: ${error.message}`)
    }

    // 関係性を記録
    await this.createIdeaRelation(newIdea.id, baseIdeaId, RelationType.DERIVED, 0.8)

    return this.convertToIdea(newIdea)
  }
}