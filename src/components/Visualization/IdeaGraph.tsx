import React, { useState, useEffect, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { ViewState, Idea } from '@/types'
import { IdeaService } from '@/services/ideaService'
import { supabase } from '@/services/supabase'
import LoadingSpinner from '@/components/UI/LoadingSpinner'
import { Zap, Search, Filter, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'

interface Node {
  id: string
  x: number
  y: number
  title: string
  energy_level: number
  color: string
  idea: Idea
}

interface Edge {
  from: string
  to: string
  strength: number
}

interface IdeaGraphProps {
  session: Session
  viewState: ViewState
  onViewStateChange: (viewState: ViewState) => void
}

const IdeaGraph: React.FC<IdeaGraphProps> = ({ 
  session, 
  viewState, 
  onViewStateChange 
}) => {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragNode, setDragNode] = useState<Node | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [ideaService] = useState(() => new IdeaService(session.user.id))

  const getEnergyColor = (level: number) => {
    const colors = {
      1: '#9CA3AF', // gray
      2: '#3B82F6', // blue
      3: '#10B981', // green
      4: '#F59E0B', // yellow
      5: '#EF4444'  // red
    }
    return colors[level as keyof typeof colors] || colors[3]
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const fetchedIdeas = await ideaService.getIdeas({ limit: 50 })
      setIdeas(fetchedIdeas)
      
      // ノードの生成
      const newNodes: Node[] = fetchedIdeas.map((idea, index) => {
        const angle = (index / fetchedIdeas.length) * 2 * Math.PI
        const radius = Math.min(250, Math.max(100, fetchedIdeas.length * 15))
        const centerX = 400
        const centerY = 300
        
        return {
          id: idea.id,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          title: idea.title,
          energy_level: idea.energy_level,
          color: getEnergyColor(idea.energy_level),
          idea
        }
      })
      setNodes(newNodes)
      
      // エッジの生成（データベースから関連性を取得）
      const newEdges: Edge[] = []
      
      // 既存のrelated_ideasからエッジを作成
      for (const idea of fetchedIdeas) {
        for (const relatedId of idea.related_ideas) {
          if (fetchedIdeas.find(i => i.id === relatedId)) {
            newEdges.push({
              from: idea.id,
              to: relatedId,
              strength: 0.5
            })
          }
        }
      }
      
      // データベースから直接関連性を取得
      try {
        const { data: relations, error: relationError } = await supabase
          .from('idea_relations')
          .select('from_idea_id, to_idea_id, strength, relation_type')
          .eq('user_id', session.user.id)
        
        console.log('Database relations query result:', { relations, error: relationError })
        
        if (relations) {
          console.log('Found relations in database:', relations.length)
          for (const relation of relations) {
            // 両方のアイデアが現在の表示対象に含まれているかチェック
            const fromExists = fetchedIdeas.find(i => i.id === relation.from_idea_id)
            const toExists = fetchedIdeas.find(i => i.id === relation.to_idea_id)
            
            console.log(`Relation check: from=${relation.from_idea_id} (${fromExists ? 'exists' : 'missing'}), to=${relation.to_idea_id} (${toExists ? 'exists' : 'missing'})`)
            
            if (fromExists && toExists) {
              // 重複チェック
              const exists = newEdges.some(e => 
                (e.from === relation.from_idea_id && e.to === relation.to_idea_id) ||
                (e.from === relation.to_idea_id && e.to === relation.from_idea_id)
              )
              
              if (!exists) {
                console.log(`Adding edge: ${relation.from_idea_id} -> ${relation.to_idea_id} (strength: ${relation.strength})`)
                newEdges.push({
                  from: relation.from_idea_id,
                  to: relation.to_idea_id,
                  strength: relation.strength || 0.5
                })
              }
            }
          }
        } else {
          console.log('No relations found in database, checking if relations exist...')
          // 関係性がない場合、手動で関係性を生成してデータベースに保存
          if (fetchedIdeas.length >= 2) {
            console.log('Triggering manual relation creation for all ideas...')
            const ideaService = new IdeaService(session.user.id)
            for (const idea of fetchedIdeas) {
              try {
                await ideaService.createIdea({
                  title: idea.title,
                  content: idea.content,
                  energy_level: idea.energy_level,
                  category_id: idea.category_id,
                  tags: idea.tags
                })
              } catch (error) {
                console.log('Relation creation attempt (may already exist):', error)
              }
            }
          }
        }
      } catch (relationError) {
        console.error('Failed to load relations:', relationError)
      }
      
      // 実際の関係性のみを表示（サンプル関係性は削除）
      
      console.log('Generated edges:', newEdges)
      console.log('Total ideas:', fetchedIdeas.length)
      console.log('Ideas details:', fetchedIdeas.map(i => ({ 
        id: i.id, 
        title: i.title, 
        content: i.content, 
        tags: i.tags,
        energy: i.energy_level 
      })))
      
      // 手動で関係性検出をテスト
      if (fetchedIdeas.length >= 2) {
        console.log('Testing manual relation discovery for first idea...')
        const ideaService = new IdeaService(session.user.id)
        ideaService.getIdeas({ limit: 1 }).then(async (testIdeas) => {
          if (testIdeas.length > 0) {
            const testIdea = testIdeas[0]
            console.log('Test idea:', testIdea.title)
            // 手動でautoDiscoverRelationsを呼び出してテスト
            try {
              const unifier = new (await import('@/services/tomabechiAlgorithm')).TomabechiSupabaseUnifier(session.user.id)
              const relations = await unifier.autoDiscoverRelations(testIdea.id)
              console.log('Manual relation discovery result:', relations)
            } catch (error) {
              console.error('Manual relation discovery failed:', error)
            }
          }
        })
      }
      
      setEdges(newEdges)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleNodeClick = (node: Node) => {
    setSelectedNode(selectedNode?.id === node.id ? null : node)
  }

  const handleMouseDown = (e: React.MouseEvent, node?: Node) => {
    if (node) {
      setDragNode(node)
      setIsDragging(true)
    } else {
      setIsDragging(true)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    if (dragNode) {
      // ノードのドラッグ
      const rect = svgRef.current?.getBoundingClientRect()
      if (rect) {
        const newX = (e.clientX - rect.left) / zoom - pan.x
        const newY = (e.clientY - rect.top) / zoom - pan.y
        
        setNodes(prev => prev.map(node => 
          node.id === dragNode.id 
            ? { ...node, x: newX, y: newY }
            : node
        ))
      }
    } else {
      // パンの処理
      const deltaX = e.movementX / zoom
      const deltaY = e.movementY / zoom
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragNode(null)
  }

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.1, Math.min(3, prev + delta)))
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                ゲシュタルト可視化
              </h1>
              <p className="text-gray-600">
                アイデア間の関係性をインタラクティブに可視化（{ideas.length}個のアイデア）
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadData}
                className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                関係性再計算
              </button>
              <button
                onClick={async () => {
                  console.log('Force creating relations...')
                  const ideaService = new IdeaService(session.user.id)
                  const allIdeas = await ideaService.getIdeas({ limit: 50 })
                  
                  for (const idea of allIdeas) {
                    try {
                      // 関係性の強制再作成
                      await (async () => {
                        const unifier = new (await import('@/services/tomabechiAlgorithm')).TomabechiSupabaseUnifier(session.user.id)
                        const relations = await unifier.autoDiscoverRelations(idea.id)
                        
                        for (const related of relations.slice(0, 3)) {
                          const { error } = await supabase
                            .from('idea_relations')
                            .upsert({
                              from_idea_id: idea.id,
                              to_idea_id: related.id,
                              relation_type: 'similar',
                              strength: related.strength,
                              user_id: session.user.id
                            })
                          if (error) {
                            console.log('Upsert error (may be expected):', error)
                          }
                        }
                      })()
                    } catch (error) {
                      console.log('Relation creation error:', error)
                    }
                  }
                  
                  // 再読み込み
                  setTimeout(() => loadData(), 1000)
                }}
                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                関係性強制作成
              </button>
              <button
                onClick={() => handleZoom(0.1)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleZoom(-0.1)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-500">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* メイン可視化エリア */}
          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <svg
              ref={svgRef}
              width="100%"
              height="600"
              className="cursor-move"
              onMouseDown={(e) => handleMouseDown(e)}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <g transform={`scale(${zoom}) translate(${pan.x}, ${pan.y})`}>
                {/* エッジ（線） */}
                {edges.map((edge, index) => {
                  const fromNode = nodes.find(n => n.id === edge.from)
                  const toNode = nodes.find(n => n.id === edge.to)
                  if (!fromNode || !toNode) return null
                  
                  const strokeWidth = Math.max(1, edge.strength * 3)
                  const strokeColor = edge.strength > 0.6 ? '#3B82F6' : '#9CA3AF'
                  
                  return (
                    <g key={index}>
                      <line
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        opacity={0.7}
                        strokeDasharray={edge.strength < 0.5 ? '5,5' : undefined}
                      />
                      {/* 関係性の強度を示すラベル（閾値を下げて表示しやすく） */}
                      {edge.strength > 0.05 && (
                        <text
                          x={(fromNode.x + toNode.x) / 2}
                          y={(fromNode.y + toNode.y) / 2}
                          textAnchor="middle"
                          className={`text-xs pointer-events-none ${edge.strength > 0.3 ? 'fill-blue-600' : 'fill-gray-500'}`}
                          fontSize="10"
                        >
                          {Math.round(edge.strength * 100)}%
                        </text>
                      )}
                    </g>
                  )
                })}
                
                {/* ノード（円） */}
                {nodes.map((node) => (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={8 + node.energy_level * 2}
                      fill={node.color}
                      stroke={selectedNode?.id === node.id ? '#374151' : 'white'}
                      strokeWidth={selectedNode?.id === node.id ? 3 : 2}
                      className="cursor-pointer"
                      onClick={() => handleNodeClick(node)}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        handleMouseDown(e, node)
                      }}
                    />
                    <text
                      x={node.x}
                      y={node.y - 15}
                      textAnchor="middle"
                      className="text-xs fill-gray-700 pointer-events-none"
                      fontSize="10"
                    >
                      {node.title.length > 10 ? node.title.substring(0, 10) + '...' : node.title}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </div>

          {/* サイドパネル */}
          {selectedNode && (
            <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedNode.title}
                </h3>
                <div className="flex items-center space-x-2 mb-3">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white`} style={{ backgroundColor: selectedNode.color }}>
                    <Zap className="h-3 w-3 mr-1" />
                    エネルギー {selectedNode.energy_level}
                  </div>
                </div>
                {selectedNode.idea.content && (
                  <p className="text-gray-600 text-sm mb-3">
                    {selectedNode.idea.content}
                  </p>
                )}
                {selectedNode.idea.tags.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-500 mb-2">タグ:</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.idea.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedNode.idea.related_ideas.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">関連アイデア:</div>
                    <div className="text-sm text-gray-600">
                      {selectedNode.idea.related_ideas.length}個の関連
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 空の状態 */}
        {ideas.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center text-gray-500">
              <div className="mb-4">
                <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🕸️</span>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ゲシュタルト可視化
              </h3>
              <p className="mb-4">
                アイデア間の関係性をネットワークグラフで表示します
              </p>
              <div className="text-sm text-gray-400">
                アイデアを追加すると、ここに可視化が表示されます
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IdeaGraph