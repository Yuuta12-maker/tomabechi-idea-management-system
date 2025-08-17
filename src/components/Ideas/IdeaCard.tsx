import React, { useState } from 'react'
import { 
  MoreVertical, 
  Edit, 
  Archive, 
  Zap, 
  Calendar,
  Tag,
  Link,
  Lightbulb,
  CheckCircle2
} from 'lucide-react'
import { Idea } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface IdeaCardProps {
  idea: Idea
  isSelected?: boolean
  onSelect?: (ideaId: string) => void
  onEdit?: (idea: Idea) => void
  onArchive?: (ideaId: string) => void
  showCheckbox?: boolean
}

const IdeaCard: React.FC<IdeaCardProps> = ({
  idea,
  isSelected = false,
  onSelect,
  onEdit,
  onArchive,
  showCheckbox = false
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const getEnergyColor = (level: number) => {
    const colors = {
      1: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
      2: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
      3: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
      4: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
      5: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' }
    }
    return colors[level as keyof typeof colors] || colors[3]
  }

  const energyColor = getEnergyColor(idea.energy_level)
  
  // カードの高さを内容に応じて動的に調整
  const getCardHeight = () => {
    const baseHeight = 180
    const contentLength = idea.content.length
    const extraHeight = Math.min(Math.max(contentLength - 100, 0) / 10, 60)
    return baseHeight + extraHeight
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // ボタンやその他のインタラクティブ要素をクリックした場合は何もしない
    const target = e.target as Element
    if (target.closest('button') || target.closest('input')) {
      return
    }
    
    // チェックボックスが表示されている場合は選択/選択解除
    if (showCheckbox && onSelect) {
      e.preventDefault()
      e.stopPropagation()
      onSelect(idea.id)
    } else if (onEdit) {
      // チェックボックスが表示されていない場合は編集
      e.preventDefault()
      e.stopPropagation()
      onEdit(idea)
    }
  }

  return (
    <div
      className={`relative bg-white rounded-lg border transition-all duration-200 cursor-pointer group ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'border-gray-200 hover:shadow-md'
      } ${energyColor.border}`}
      style={{ 
        height: `${getCardHeight()}px`,
        minHeight: '180px'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowMenu(false)
      }}
      onClick={handleCardClick}
    >
      {/* 選択チェックボックス */}
      {showCheckbox && (
        <div className="absolute top-3 left-3 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect?.(idea.id)
            }}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'border-gray-300 hover:border-blue-400 bg-white'
            }`}
          >
            {isSelected && <CheckCircle2 className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* エネルギーレベルインジケーター */}
      <div className={`absolute top-3 right-3 w-8 h-8 rounded-full ${energyColor.bg} ${energyColor.border} border flex items-center justify-center`}>
        <span className={`text-xs font-bold ${energyColor.text}`}>
          {idea.energy_level}
        </span>
      </div>

      {/* メニューボタン */}
      <div className={`absolute top-3 right-12 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </button>
          
          {/* ドロップダウンメニュー */}
          {showMenu && (
            <div className="absolute right-0 top-9 w-32 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(idea)
                  setShowMenu(false)
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <Edit className="h-3 w-3" />
                <span>編集</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive?.(idea.id)
                  setShowMenu(false)
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <Archive className="h-3 w-3" />
                <span>アーカイブ</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* カードコンテンツ */}
      <div className="p-4 h-full flex flex-col">
        {/* タイトル */}
        <h3 className="font-medium text-gray-900 mb-3 line-clamp-2 leading-5">
          {idea.title}
        </h3>

        {/* 内容 */}
        {idea.content && (
          <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-4 leading-relaxed">
            {idea.content}
          </p>
        )}

        {/* フッター情報 */}
        <div className="mt-auto space-y-2">
          {/* タグ */}
          {idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {idea.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                >
                  {tag}
                </span>
              ))}
              {idea.tags.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{idea.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* メタ情報 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(idea.created_at), { 
                    addSuffix: true, 
                    locale: ja 
                  })}
                </span>
              </div>
              
              {idea.related_ideas.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Link className="h-3 w-3" />
                  <span>{idea.related_ideas.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ホバー時のオーバーレイ効果 */}
      <div className={`absolute inset-0 bg-blue-50 rounded-lg transition-opacity pointer-events-none ${
        isHovered && !showMenu ? 'opacity-5' : 'opacity-0'
      }`} />
    </div>
  )
}

export default IdeaCard