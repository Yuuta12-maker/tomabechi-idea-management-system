import React, { useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { X, Zap, ArrowRight, CheckCircle } from 'lucide-react'
import { Idea } from '@/types'
import { IdeaService } from '@/services/ideaService'
import { AbstractionAnalyzer } from '@/services/abstractionAnalyzer'
import LoadingSpinner from '@/components/UI/LoadingSpinner'

interface IdeaUnificationProps {
  session: Session
  ideas: Idea[]
  selectedIdeas: string[]
  onClose: () => void
  onSuccess: () => void
}

const IdeaUnification: React.FC<IdeaUnificationProps> = ({
  session,
  ideas,
  selectedIdeas,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Idea | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const ideaService = new IdeaService(session.user.id)
  
  const selectedIdeaObjects = ideas.filter(idea => selectedIdeas.includes(idea.id))
  
  const handleUnify = async () => {
    if (selectedIdeas.length !== 2) {
      setError('統合には正確に2つのアイデアを選択してください')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const [idea1Id, idea2Id] = selectedIdeas
      const unifiedIdea = await ideaService.unifyIdeas(idea1Id, idea2Id)
      
      if (unifiedIdea) {
        setResult(unifiedIdea)
      } else {
        setError('アイデアの統合に失敗しました。アイデアが十分に類似していない可能性があります。')
      }
    } catch (err) {
      console.error('Unification error:', err)
      setError('統合処理中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }
  
  const handleComplete = () => {
    onSuccess()
    onClose()
  }
  
  if (result) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <h2 className="text-xl font-bold text-gray-900">統合完了</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-2">
                  新しい統合アイデアが作成されました
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-green-700">タイトル:</span>
                    <div className="text-green-900">{result.title}</div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-green-700">内容:</span>
                    <div className="text-green-900 text-sm">{result.content}</div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Zap className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">
                        エネルギー: {result.energy_level}/5
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-green-700">
                      タグ: {result.tags.join(', ') || 'なし'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  閉じる
                </button>
                <button
                  onClick={handleComplete}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  完了
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-bold text-gray-900">
                アイデア統合 - 苫米地アルゴリズム
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                統合するアイデア ({selectedIdeas.length}/2)
              </h3>
              
              {selectedIdeas.length !== 2 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700">
                    統合には正確に2つのアイデアを選択してください。
                    現在選択されているアイデア: {selectedIdeas.length}個
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                {selectedIdeaObjects.map((idea, index) => (
                  <div key={idea.id} className="flex items-center space-x-4">
                    <div className="flex-1 bg-gray-50 rounded-lg p-4 border">
                      <div className="font-medium text-gray-900 mb-1">
                        {idea.title}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {idea.content.substring(0, 100)}
                        {idea.content.length > 100 ? '...' : ''}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Zap className="h-3 w-3" />
                          <span>エネルギー: {idea.energy_level}/5</span>
                        </span>
                        <span>タグ: {idea.tags.join(', ') || 'なし'}</span>
                      </div>
                    </div>
                    
                    {index === 0 && selectedIdeaObjects.length === 2 && (
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">
                準破壊的統合について
              </h4>
              <p className="text-sm text-blue-700">
                苫米地アルゴリズムによる統合は、2つのアイデアの構造を保持しながら、
                新しい統合されたアイデアを生成します。元のアイデアは完全単調性により
                保持され、新しい関係性が構築されます。
              </p>
              
              {/* 抽象度予測表示 */}
              {selectedIdeaObjects.length === 2 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">抽象度予測</h5>
                  {(() => {
                    const idea1 = selectedIdeaObjects[0]
                    const idea2 = selectedIdeaObjects[1]
                    const abs1 = AbstractionAnalyzer.analyzeAbstractionLevel(idea1)
                    const abs2 = AbstractionAnalyzer.analyzeAbstractionLevel(idea2)
                    const predictedAbs = AbstractionAnalyzer.calculateUnificationAbstraction(idea1, idea2)
                    
                    return (
                      <div className="text-xs text-blue-700 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>{idea1.title.substring(0, 15)}...</span>
                          <span className="bg-blue-200 px-2 py-1 rounded">Lv.{abs1.level}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{idea2.title.substring(0, 15)}...</span>
                          <span className="bg-blue-200 px-2 py-1 rounded">Lv.{abs2.level}</span>
                        </div>
                        <div className="flex items-center justify-center pt-2">
                          <ArrowRight className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex items-center justify-between bg-blue-100 p-2 rounded">
                          <span className="font-medium">統合結果予測</span>
                          <span className="bg-purple-200 px-2 py-1 rounded font-bold">
                            Lv.{predictedAbs.level}
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          {AbstractionAnalyzer.getAbstractionDescription(predictedAbs.level)}
                        </p>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleUnify}
                disabled={selectedIdeas.length !== 2 || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors
                         flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>統合中...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>統合実行</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IdeaUnification