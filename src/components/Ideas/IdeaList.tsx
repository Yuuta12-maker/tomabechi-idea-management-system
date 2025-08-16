import React, { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List as ListIcon,
  Lightbulb,
  Calendar,
  Tag,
  Zap,
  MoreVertical,
  Edit,
  Archive,
  Link
} from 'lucide-react'
import { ViewState, Idea } from '@/types'
import { IdeaService } from '@/services/ideaService'
import IdeaForm from './IdeaForm'
import LoadingSpinner from '@/components/UI/LoadingSpinner'
import FilterPanel from '@/components/UI/FilterPanel'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface IdeaListProps {
  session: Session
  viewState: ViewState
  onViewStateChange: (viewState: ViewState) => void
}

const IdeaList: React.FC<IdeaListProps> = ({ 
  session, 
  viewState, 
  onViewStateChange 
}) => {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [ideaService] = useState(() => new IdeaService(session.user.id))

  const loadIdeas = async () => {
    try {
      setLoading(true)
      const fetchedIdeas = await ideaService.getIdeas({
        search: viewState.searchQuery,
        category_id: viewState.activeFilters.categories[0], // 簡単化のため最初のカテゴリのみ
        tags: viewState.activeFilters.tags,
        energy_levels: viewState.activeFilters.energyLevels,
        limit: 50
      })
      setIdeas(fetchedIdeas)
    } catch (error) {
      console.error('Failed to load ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIdeas()
  }, [viewState.searchQuery, viewState.activeFilters])

  // サイドバーからのアイデア作成イベントを監視
  useEffect(() => {
    const handleOpenForm = () => setShowForm(true)
    window.addEventListener('openIdeaForm', handleOpenForm)
    return () => window.removeEventListener('openIdeaForm', handleOpenForm)
  }, [])

  // ドロップダウンメニューの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleCreateIdea = async (data: any) => {
    try {
      console.log('Creating idea with data:', JSON.stringify(data, null, 2))
      console.log('Data types:', {
        title: typeof data.title,
        content: typeof data.content,
        energy_level: typeof data.energy_level,
        category_id: typeof data.category_id,
        tags: Array.isArray(data.tags) ? 'array' : typeof data.tags
      })
      const newIdea = await ideaService.createIdea(data)
      console.log('Created idea:', newIdea)
      await loadIdeas()
      setShowForm(false)
    } catch (error) {
      console.error('Failed to create idea:', error)
      alert(`アイデアの作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  const handleUpdateIdea = async (data: any) => {
    if (!editingIdea) return
    
    try {
      await ideaService.updateIdea(editingIdea.id, data)
      await loadIdeas()
      setEditingIdea(null)
    } catch (error) {
      console.error('Failed to update idea:', error)
    }
  }

  const handleArchiveIdea = async (ideaId: string) => {
    if (confirm('このアイデアをアーカイブしますか？\n（苫米地アルゴリズムにより完全削除ではなくアーカイブされます）')) {
      try {
        await ideaService.archiveIdea(ideaId)
        await loadIdeas()
        setOpenDropdownId(null)
      } catch (error) {
        console.error('Failed to archive idea:', error)
        alert('アーカイブに失敗しました')
      }
    }
  }

  const handleEditIdea = (idea: Idea) => {
    setEditingIdea(idea)
    setOpenDropdownId(null)
  }

  const getEnergyLevelColor = (level: number) => {
    const colors = {
      1: 'text-gray-500 bg-gray-100',
      2: 'text-blue-500 bg-blue-100',
      3: 'text-green-500 bg-green-100',
      4: 'text-yellow-500 bg-yellow-100',
      5: 'text-red-500 bg-red-100'
    }
    return colors[level as keyof typeof colors] || colors[3]
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
                アイデア一覧
              </h1>
              <p className="text-gray-600">
                {ideas.length}個のアイデアが登録されています
              </p>
              <p className="text-xs text-gray-400">
                ユーザーID: {session.user.id}
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              新しいアイデア
            </button>
          </div>
        </div>

        {/* ツールバー */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="アイデアを検索..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={viewState.searchQuery}
                  onChange={(e) => onViewStateChange({
                    ...viewState,
                    searchQuery: e.target.value
                  })}
                />
              </div>
              <button 
                onClick={() => setShowFilter(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                フィルター
                {(viewState.activeFilters.categories.length + 
                  viewState.activeFilters.tags.length + 
                  viewState.activeFilters.energyLevels.length + 
                  (Object.keys(viewState.activeFilters.dateRange).length > 0 ? 1 : 0)) > 0 && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {viewState.activeFilters.categories.length + 
                     viewState.activeFilters.tags.length + 
                     viewState.activeFilters.energyLevels.length + 
                     (Object.keys(viewState.activeFilters.dateRange).length > 0 ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Grid className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-600">
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* アイデア一覧 */}
        {ideas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center text-gray-500">
              <div className="mb-4">
                <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Lightbulb className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {viewState.searchQuery ? '検索結果がありません' : 'まだアイデアがありません'}
              </h3>
              <p className="mb-4">
                {viewState.searchQuery 
                  ? '別のキーワードで検索してみてください'
                  : '最初のアイデアを作成して、苫米地アルゴリズムの力を体験してみましょう！'
                }
              </p>
              {!viewState.searchQuery && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  最初のアイデアを作成
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {ideas.map((idea) => (
              <div key={idea.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {idea.title}
                      </h3>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEnergyLevelColor(idea.energy_level)}`}>
                        <Zap className="h-3 w-3 mr-1" />
                        {idea.energy_level}
                      </div>
                    </div>
                    
                    {idea.content && (
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {idea.content}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDistanceToNow(new Date(idea.created_at), { 
                          addSuffix: true, 
                          locale: ja 
                        })}
                      </div>
                      
                      {idea.tags.length > 0 && (
                        <div className="flex items-center">
                          <Tag className="h-4 w-4 mr-1" />
                          <div className="flex flex-wrap gap-1">
                            {idea.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {tag}
                              </span>
                            ))}
                            {idea.tags.length > 3 && (
                              <span className="text-xs text-gray-400">+{idea.tags.length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {idea.related_ideas.length > 0 && (
                        <div className="flex items-center">
                          <Link className="h-4 w-4 mr-1" />
                          {idea.related_ideas.length}個の関連
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenDropdownId(openDropdownId === idea.id ? null : idea.id)
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    
                    {/* ドロップダウンメニュー */}
                    {openDropdownId === idea.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                        <div className="py-1">
                          <button
                            onClick={() => handleEditIdea(idea)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            編集
                          </button>
                          <button
                            onClick={() => handleArchiveIdea(idea.id)}
                            className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            アーカイブ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* アイデア作成/編集フォーム */}
        <IdeaForm
          session={session}
          isOpen={showForm || !!editingIdea}
          onClose={() => {
            setShowForm(false)
            setEditingIdea(null)
          }}
          onSubmit={editingIdea ? handleUpdateIdea : handleCreateIdea}
          editingIdea={editingIdea ? {
            id: editingIdea.id,
            title: editingIdea.title,
            content: editingIdea.content,
            energy_level: editingIdea.energy_level,
            category_id: editingIdea.category_id,
            tags: editingIdea.tags
          } : undefined}
        />

        {/* フィルターパネル */}
        <FilterPanel
          isOpen={showFilter}
          onClose={() => setShowFilter(false)}
          viewState={viewState}
          onViewStateChange={onViewStateChange}
          userId={session.user.id}
        />
      </div>
    </div>
  )
}

export default IdeaList