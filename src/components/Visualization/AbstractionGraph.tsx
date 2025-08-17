import React, { useState, useEffect, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { 
  Brain, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Filter,
  Eye,
  EyeOff,
  Info
} from 'lucide-react'
import { Idea, ViewState } from '@/types'
import { IdeaService } from '@/services/ideaService'
import { AbstractionAnalyzer, AbstractionLevel } from '@/services/abstractionAnalyzer'
import LoadingSpinner from '@/components/UI/LoadingSpinner'

interface AbstractionGraphProps {
  session: Session
  viewState: ViewState
  onViewStateChange: (viewState: ViewState) => void
}

interface AbstractionNode {
  idea: Idea
  abstraction: AbstractionLevel
  x: number
  y: number
  z: number // 抽象度レベル
  selected: boolean
  highlighted: boolean
}

interface LayerSettings {
  visible: boolean
  opacity: number
  label: string
}

const AbstractionGraph: React.FC<AbstractionGraphProps> = ({
  session,
  viewState,
  onViewStateChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [nodes, setNodes] = useState<AbstractionNode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [layerSettings, setLayerSettings] = useState<Record<number, LayerSettings>>({
    1: { visible: true, opacity: 1, label: '事実・データ層' },
    2: { visible: true, opacity: 1, label: '具体的アイデア層' },
    3: { visible: true, opacity: 1, label: '方法・戦略層' },
    4: { visible: true, opacity: 1, label: '理論・概念層' },
    5: { visible: true, opacity: 1, label: '哲学・原理層' }
  })
  
  const [ideaService] = useState(() => new IdeaService(session.user.id))

  const loadIdeas = async () => {
    try {
      setLoading(true)
      const fetchedIdeas = await ideaService.getIdeas()
      setIdeas(fetchedIdeas)
      
      // 抽象度分析とノード配置
      const analysisNodes = await Promise.all(
        fetchedIdeas.map(async (idea, index) => {
          const abstraction = AbstractionAnalyzer.analyzeAbstractionLevel(idea)
          
          // 改善された配置アルゴリズム
          const level = abstraction.level
          const ideasInLevel = fetchedIdeas.filter(i => 
            AbstractionAnalyzer.analyzeAbstractionLevel(i).level === level
          )
          const levelIndex = ideasInLevel.indexOf(idea)
          const nodesInLevel = ideasInLevel.length
          
          // レベルごとの半径を大きく調整（重複回避）
          const baseRadius = 80
          const radiusIncrement = 70
          const radius = baseRadius + (level - 1) * radiusIncrement
          
          // ノード間隔を広げる
          const angleStep = (2 * Math.PI) / Math.max(3, nodesInLevel)
          const angle = levelIndex * angleStep + (level * 0.2) // レベルごとに少し回転
          
          return {
            idea,
            abstraction,
            x: 500 + radius * Math.cos(angle), // 中心を500,350に調整
            y: 350 + radius * Math.sin(angle),
            z: level * 100, // Z軸は抽象度レベル
            selected: false,
            highlighted: false
          }
        })
      )
      
      setNodes(analysisNodes)
    } catch (error) {
      console.error('Failed to load ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIdeas()
  }, [])

  const toggleLayerVisibility = (level: number) => {
    setLayerSettings(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        visible: !prev[level].visible
      }
    }))
  }

  const handleLayerOpacity = (level: number, opacity: number) => {
    setLayerSettings(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        opacity: opacity / 100
      }
    }))
  }

  const handleNodeClick = (node: AbstractionNode) => {
    setNodes(prev => prev.map(n => ({
      ...n,
      selected: n.idea.id === node.idea.id ? !n.selected : n.selected
    })))
    setSelectedLayer(node.abstraction.level)
  }

  const getNodeStyle = (node: AbstractionNode) => {
    const baseStyle = AbstractionAnalyzer.getAbstractionStyle(node.abstraction.level)
    const layer = layerSettings[node.abstraction.level]
    
    if (!layer.visible) return { ...baseStyle, opacity: 0 }
    
    // サイズを大きく、見やすく調整
    const baseSizes = { small: 16, medium: 20, large: 24 }
    const size = baseSizes[baseStyle.size as keyof typeof baseSizes] * zoom
    
    return {
      ...baseStyle,
      size: size,
      opacity: Math.max(0.7, baseStyle.opacity * layer.opacity), // 最低透明度を保証
      stroke: node.selected ? '#1F2937' : '#FFFFFF',
      strokeWidth: node.selected ? 3 : 2, // 常に境界線を表示
      shadowBlur: 4,
      shadowColor: 'rgba(0,0,0,0.2)'
    }
  }

  const renderNode = (node: AbstractionNode, index: number) => {
    const style = getNodeStyle(node)
    if (style.opacity === 0) return null
    
    const transform = `translate(${node.x}, ${node.y})`
    const titleText = node.idea.title.length > 12 ? node.idea.title.substring(0, 12) + '...' : node.idea.title
    
    return (
      <g key={node.idea.id} transform={transform}>
        {/* ノードの影 */}
        <circle
          cx={2}
          cy={2}
          r={style.size}
          fill="rgba(0,0,0,0.1)"
          opacity={style.opacity * 0.5}
        />
        
        {/* ノード本体 */}
        <circle
          cx={0}
          cy={0}
          r={style.size}
          fill={style.color}
          opacity={style.opacity}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          className="cursor-pointer transition-all duration-300 hover:scale-105"
          onClick={() => handleNodeClick(node)}
        />
        
        {/* 抽象度レベル表示（背景付き） */}
        <g>
          <rect
            x={-8}
            y={-style.size - 18}
            width={16}
            height={12}
            fill="rgba(255,255,255,0.9)"
            stroke={style.color}
            strokeWidth={1}
            rx={2}
            opacity={style.opacity}
          />
          <text
            x={0}
            y={-style.size - 9}
            textAnchor="middle"
            fontSize="9"
            fill={style.color}
            fontWeight="bold"
            opacity={style.opacity}
          >
            L{node.abstraction.level}
          </text>
        </g>
        
        {/* アイデアタイトル（背景付き） */}
        <g>
          <rect
            x={-25}
            y={style.size + 8}
            width={50}
            height={14}
            fill="rgba(255,255,255,0.9)"
            stroke="#E5E7EB"
            strokeWidth={1}
            rx={3}
            opacity={style.opacity * 0.9}
          />
          <text
            x={0}
            y={style.size + 18}
            textAnchor="middle"
            fontSize="8"
            fill="#374151"
            fontWeight="500"
            opacity={style.opacity}
          >
            {titleText}
          </text>
        </g>
        
        {/* 確信度インジケーター（大きく明確に） */}
        <circle
          cx={style.size - 6}
          cy={-style.size + 6}
          r={4}
          fill={node.abstraction.confidence > 0.7 ? '#10B981' : '#F59E0B'}
          stroke="#FFFFFF"
          strokeWidth={1}
          opacity={style.opacity}
        />
      </g>
    )
  }

  const renderConnections = () => {
    // 関係線を簡素化・整理
    return nodes.flatMap((node, i) => 
      node.idea.related_ideas.slice(0, 3).map(relatedId => { // 最大3本まで表示
        const relatedNode = nodes.find(n => n.idea.id === relatedId)
        if (!relatedNode) return null
        
        const sourceLayer = layerSettings[node.abstraction.level]
        const targetLayer = layerSettings[relatedNode.abstraction.level]
        
        if (!sourceLayer.visible || !targetLayer.visible) return null
        
        // 抽象度の差による線のスタイル（よりシンプルに）
        const levelDiff = Math.abs(node.abstraction.level - relatedNode.abstraction.level)
        const strokeWidth = levelDiff === 0 ? 2 : 1
        const opacity = Math.min(sourceLayer.opacity, targetLayer.opacity) * 0.4 // 薄くして邪魔にならないように
        
        // 抽象度差に応じた色
        const strokeColor = levelDiff === 0 ? '#9CA3AF' : levelDiff === 1 ? '#8B5CF6' : '#EC4899'
        
        return (
          <line
            key={`${node.idea.id}-${relatedId}`}
            x1={node.x}
            y1={node.y}
            x2={relatedNode.x}
            y2={relatedNode.y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
            strokeDasharray={levelDiff > 1 ? '8,4' : 'none'}
          />
        )
      })
    ).filter(Boolean)
  }

  const renderLayerGuides = () => {
    return Object.entries(layerSettings).map(([level, settings]) => {
      if (!settings.visible) return null
      
      const levelNum = parseInt(level)
      const baseRadius = 80
      const radiusIncrement = 70
      const radius = baseRadius + (levelNum - 1) * radiusIncrement
      
      return (
        <g key={`layer-${level}`}>
          {/* レイヤー円 */}
          <circle
            cx={500}
            cy={350}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={settings.opacity * 0.4}
          />
          
          {/* レイヤーラベル（すっきりと配置） */}
          <g>
            <rect
              x={500 + radius + 15}
              y={342}
              width={80}
              height={16}
              fill="rgba(255,255,255,0.95)"
              stroke="#E5E7EB"
              strokeWidth={1}
              rx={3}
              opacity={settings.opacity * 0.9}
            />
            <text
              x={500 + radius + 20}
              y={352}
              fontSize="10"
              fill="#6B7280"
              fontWeight="500"
              opacity={settings.opacity}
            >
              Level {level}
            </text>
          </g>
        </g>
      )
    })
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[600px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-full mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                抽象度ゲシュタルト可視化
              </h1>
              <p className="text-gray-600">
                苫米地理論に基づく3次元抽象度空間
              </p>
            </div>
          </div>
          
          {/* コントロールパネル */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
              className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
              className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setRotation(prev => prev + 15)}
              className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex space-x-6">
          {/* 抽象度レイヤーコントロール */}
          <div className="w-64 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Layers className="h-5 w-5 mr-2" />
              抽象度レイヤー
            </h3>
            
            {Object.entries(layerSettings).map(([level, settings]) => {
              const levelNum = parseInt(level)
              const nodeCount = nodes.filter(n => n.abstraction.level === levelNum).length
              
              return (
                <div key={level} className="mb-4 p-3 border border-gray-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleLayerVisibility(levelNum)}
                        className="p-1"
                      >
                        {settings.visible ? 
                          <Eye className="h-4 w-4 text-blue-600" /> : 
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        }
                      </button>
                      <span className="text-sm font-medium">Level {level}</span>
                      <span className="text-xs text-gray-500">({nodeCount})</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    {settings.label}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">透明度:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.opacity * 100}
                      onChange={(e) => handleLayerOpacity(levelNum, parseInt(e.target.value))}
                      className="flex-1"
                      disabled={!settings.visible}
                    />
                    <span className="text-xs text-gray-500 w-8">
                      {Math.round(settings.opacity * 100)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* メインビジュアライゼーション */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <svg
                ref={svgRef}
                width="100%"
                height="700"
                viewBox="0 0 1000 700"
                className="border border-gray-100 rounded bg-gradient-to-br from-gray-50 to-white"
              >
                {/* 背景グリッド */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F3F4F6" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* レイヤーガイド */}
                {renderLayerGuides()}
                
                {/* 接続線 */}
                <g opacity={0.6}>
                  {renderConnections()}
                </g>
                
                {/* ノード */}
                <g transform={`scale(${zoom})`}>
                  {nodes.map(renderNode)}
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* 情報パネル */}
        {showInfo && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">抽象度可視化の見方</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>円の大きさ</strong>: エネルギーレベルと遠近感</p>
              <p>• <strong>色</strong>: 抽象度レベル（灰色→青→紫→ピンク→オレンジ）</p>
              <p>• <strong>位置</strong>: 中心からの距離で抽象度を表現</p>
              <p>• <strong>線</strong>: アイデア間の関係性（点線は抽象度の差あり）</p>
              <p>• <strong>L数字</strong>: 抽象度レベル（1=具象 → 5=抽象）</p>
              <p>• <strong>小円</strong>: 分析確信度（緑=高確信、オレンジ=中確信）</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AbstractionGraph