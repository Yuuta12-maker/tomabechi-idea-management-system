import { Idea } from '@/types'

export interface AbstractionLevel {
  level: number // 1-5の抽象度レベル
  confidence: number // 0-1の確信度
  reasoning: string[] // 判定理由
  keywords: string[] // 抽象度を示すキーワード
}

export class AbstractionAnalyzer {
  // 抽象度を示すキーワードマップ
  private static readonly ABSTRACTION_KEYWORDS = {
    level1: [
      '事実', 'データ', '数値', '統計', '測定', '観察', '記録',
      '具体的', '実際', '現実', '実例', '証拠', '詳細'
    ],
    level2: [
      'アイデア', '提案', '案', '方案', '解決策', '対策', 'プラン',
      '手法', '技術', '実装', '実行', '操作', '処理'
    ],
    level3: [
      '方法', '手順', '戦略', 'アプローチ', 'メソッド', 'フレームワーク',
      'システム', '構造', 'プロセス', '体系', '仕組み', 'スキーム'
    ],
    level4: [
      '理論', '概念', 'コンセプト', 'モデル', 'パラダイム', '思想',
      '原理', '法則', 'ルール', '定理', '公理', '仮説'
    ],
    level5: [
      '哲学', '存在', '本質', '真理', '価値', '意味', '目的',
      '究極', '根本', '普遍', '絶対', '超越', '統一'
    ]
  }

  // 文の複雑さを示すパターン
  private static readonly COMPLEXITY_PATTERNS = {
    simple: /^[^。]{1,20}。?$/,
    medium: /^[^。]{21,50}。.*$/,
    complex: /^[^。]{51,}。.*。.*$/
  }

  // 抽象的概念を示す語句
  private static readonly ABSTRACT_PHRASES = [
    'について考える', 'という観点', 'の本質', 'の意味',
    'というもの', 'とは何か', 'の関係性', 'の構造',
    'の原理', 'の法則', 'のメカニズム', 'のシステム'
  ]

  /**
   * アイデアの抽象度を分析
   */
  static analyzeAbstractionLevel(idea: Idea): AbstractionLevel {
    const text = `${idea.title} ${idea.content}`.toLowerCase()
    const reasoning: string[] = []
    const detectedKeywords: string[] = []
    
    // 各レベルのキーワードマッチング
    const levelScores = this.calculateKeywordScores(text, detectedKeywords, reasoning)
    
    // 文の複雑さを評価
    const complexityBonus = this.analyzeComplexity(idea.content, reasoning)
    
    // 抽象的表現の検出
    const abstractionBonus = this.detectAbstractExpressions(text, reasoning)
    
    // エネルギーレベルによる補正
    const energyBonus = this.calculateEnergyBonus(idea.energy_level, reasoning)
    
    // タグによる抽象度推定
    const tagBonus = this.analyzeTagAbstraction(idea.tags, reasoning)
    
    // 総合スコア計算
    const totalScore = levelScores.weightedSum + complexityBonus + abstractionBonus + energyBonus + tagBonus
    
    // 抽象度レベル決定（1-5）
    const level = Math.min(5, Math.max(1, Math.round(totalScore)))
    
    // 確信度計算（キーワードマッチ度と文の一貫性）
    const confidence = Math.min(1, (levelScores.maxScore + 0.3) / 1.3)
    
    reasoning.push(`総合スコア: ${totalScore.toFixed(2)} → レベル${level}`)
    
    return {
      level,
      confidence,
      reasoning,
      keywords: detectedKeywords
    }
  }

  /**
   * キーワードベースのスコア計算
   */
  private static calculateKeywordScores(text: string, detectedKeywords: string[], reasoning: string[]) {
    const scores = [0, 0, 0, 0, 0] // level1-5のスコア
    
    Object.entries(this.ABSTRACTION_KEYWORDS).forEach(([levelKey, keywords], index) => {
      const level = index + 1
      let matches = 0
      
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          matches++
          detectedKeywords.push(keyword)
        }
      })
      
      scores[index] = matches / keywords.length
      if (matches > 0) {
        reasoning.push(`レベル${level}キーワード: ${matches}個検出`)
      }
    })
    
    // 重み付き合計（高い抽象度により高い重み）
    const weights = [1, 1.2, 1.5, 2, 3]
    const weightedSum = scores.reduce((sum, score, index) => sum + score * weights[index], 0)
    const maxScore = Math.max(...scores)
    
    return { scores, weightedSum, maxScore }
  }

  /**
   * 文の複雑さを分析
   */
  private static analyzeComplexity(content: string, reasoning: string[]): number {
    if (!content) return 0
    
    const sentences = content.split('。').filter(s => s.trim())
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
    
    let bonus = 0
    
    if (avgLength > 50) {
      bonus += 0.5
      reasoning.push('複雑な文構造を検出')
    }
    
    // 接続詞や論理的表現の検出
    const logicalExpressions = ['したがって', 'なぜなら', 'つまり', 'すなわち', 'というのは']
    const logicalCount = logicalExpressions.filter(expr => content.includes(expr)).length
    
    if (logicalCount > 0) {
      bonus += logicalCount * 0.2
      reasoning.push(`論理的表現: ${logicalCount}個検出`)
    }
    
    return bonus
  }

  /**
   * 抽象的表現の検出
   */
  private static detectAbstractExpressions(text: string, reasoning: string[]): number {
    let bonus = 0
    let count = 0
    
    this.ABSTRACT_PHRASES.forEach(phrase => {
      if (text.includes(phrase)) {
        count++
      }
    })
    
    bonus = count * 0.3
    if (count > 0) {
      reasoning.push(`抽象的表現: ${count}個検出`)
    }
    
    return bonus
  }

  /**
   * エネルギーレベルによる補正
   */
  private static calculateEnergyBonus(energyLevel: number, reasoning: string[]): number {
    // 高エネルギーのアイデアは抽象度が高い傾向
    const bonus = (energyLevel - 3) * 0.2
    if (bonus !== 0) {
      reasoning.push(`エネルギーレベル補正: ${energyLevel} → ${bonus.toFixed(1)}`)
    }
    return bonus
  }

  /**
   * タグによる抽象度推定
   */
  private static analyzeTagAbstraction(tags: string[], reasoning: string[]): number {
    if (tags.length === 0) return 0
    
    let bonus = 0
    const abstractTags = ['理論', '哲学', '概念', 'システム', '原理', '思想']
    const concreteTags = ['実装', '具体', '実例', 'データ', '測定']
    
    const abstractCount = tags.filter(tag => 
      abstractTags.some(abstractTag => tag.includes(abstractTag))
    ).length
    
    const concreteCount = tags.filter(tag => 
      concreteTags.some(concreteTag => tag.includes(concreteTag))
    ).length
    
    bonus = (abstractCount - concreteCount) * 0.3
    
    if (abstractCount > 0 || concreteCount > 0) {
      reasoning.push(`タグ分析: 抽象${abstractCount}個, 具象${concreteCount}個`)
    }
    
    return bonus
  }

  /**
   * 統合時の抽象度計算
   */
  static calculateUnificationAbstraction(idea1: Idea, idea2: Idea): AbstractionLevel {
    const abs1 = this.analyzeAbstractionLevel(idea1)
    const abs2 = this.analyzeAbstractionLevel(idea2)
    
    // 統合により抽象度は通常上昇
    const newLevel = Math.min(5, Math.max(abs1.level, abs2.level) + 1)
    const avgConfidence = (abs1.confidence + abs2.confidence) / 2
    
    const reasoning = [
      `統合前: ${idea1.title}(Lv.${abs1.level}) + ${idea2.title}(Lv.${abs2.level})`,
      `統合により抽象度上昇: レベル${newLevel}`,
      ...abs1.reasoning.slice(0, 2),
      ...abs2.reasoning.slice(0, 2)
    ]
    
    return {
      level: newLevel,
      confidence: avgConfidence,
      reasoning,
      keywords: [...abs1.keywords, ...abs2.keywords]
    }
  }

  /**
   * 抽象度レベルの説明文を取得
   */
  static getAbstractionDescription(level: number): string {
    const descriptions = {
      1: '事実・データ層：具体的な情報や観察可能な事実',
      2: '具体的アイデア層：実装可能な提案や解決策',
      3: '方法・戦略層：体系的なアプローチや手法',
      4: '理論・概念層：抽象的な理論やモデル',
      5: '哲学・原理層：根本的な価値観や存在論的な概念'
    }
    return descriptions[level as keyof typeof descriptions] || '未定義'
  }

  /**
   * 抽象度に応じた視覚的スタイルを取得
   */
  static getAbstractionStyle(level: number) {
    const styles = {
      1: { color: '#6B7280', size: 'small', shape: 'circle', opacity: 0.8 },
      2: { color: '#3B82F6', size: 'medium', shape: 'circle', opacity: 0.85 },
      3: { color: '#8B5CF6', size: 'medium', shape: 'square', opacity: 0.9 },
      4: { color: '#EC4899', size: 'large', shape: 'diamond', opacity: 0.95 },
      5: { color: '#F59E0B', size: 'large', shape: 'star', opacity: 1.0 }
    }
    return styles[level as keyof typeof styles] || styles[3]
  }
}