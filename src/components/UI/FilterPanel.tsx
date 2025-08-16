import React, { useState, useEffect } from 'react'
import { X, Filter, Tag, Folder, Zap, Calendar } from 'lucide-react'
import { ViewState } from '@/types'
import { IdeaService } from '@/services/ideaService'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  viewState: ViewState
  onViewStateChange: (viewState: ViewState) => void
  userId: string
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  viewState,
  onViewStateChange,
  userId
}) => {
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [tags, setTags] = useState<Array<{ name: string; usage_count: number }>>([])
  const [ideaService] = useState(() => new IdeaService(userId))

  useEffect(() => {
    if (isOpen) {
      loadFilterData()
    }
  }, [isOpen])

  const loadFilterData = async () => {
    try {
      const [categoriesData, tagsData] = await Promise.all([
        ideaService.getCategories(),
        ideaService.getTags()
      ])
      setCategories(categoriesData)
      setTags(tagsData)
    } catch (error) {
      console.error('Failed to load filter data:', error)
    }
  }

  const handleCategoryFilter = (categoryId: string) => {
    const newFilters = { ...viewState.activeFilters }
    if (newFilters.categories.includes(categoryId)) {
      newFilters.categories = newFilters.categories.filter(id => id !== categoryId)
    } else {
      newFilters.categories = [...newFilters.categories, categoryId]
    }
    
    onViewStateChange({
      ...viewState,
      activeFilters: newFilters
    })
  }

  const handleTagFilter = (tagName: string) => {
    const newFilters = { ...viewState.activeFilters }
    if (newFilters.tags.includes(tagName)) {
      newFilters.tags = newFilters.tags.filter(tag => tag !== tagName)
    } else {
      newFilters.tags = [...newFilters.tags, tagName]
    }
    
    onViewStateChange({
      ...viewState,
      activeFilters: newFilters
    })
  }

  const handleEnergyLevelFilter = (level: number) => {
    const newFilters = { ...viewState.activeFilters }
    if (newFilters.energyLevels.includes(level)) {
      newFilters.energyLevels = newFilters.energyLevels.filter(l => l !== level)
    } else {
      newFilters.energyLevels = [...newFilters.energyLevels, level]
    }
    
    onViewStateChange({
      ...viewState,
      activeFilters: newFilters
    })
  }

  const handleDateRangeFilter = (range: 'today' | 'week' | 'month' | 'year' | 'all') => {
    const now = new Date()
    let dateRange = {}
    
    switch (range) {
      case 'today':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        dateRange = { start: startOfDay.toISOString() }
        break
      case 'week':
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateRange = { start: startOfWeek.toISOString() }
        break
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        dateRange = { start: startOfMonth.toISOString() }
        break
      case 'year':
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        dateRange = { start: startOfYear.toISOString() }
        break
      case 'all':
      default:
        dateRange = {}
    }
    
    onViewStateChange({
      ...viewState,
      activeFilters: {
        ...viewState.activeFilters,
        dateRange
      }
    })
  }

  const clearAllFilters = () => {
    onViewStateChange({
      ...viewState,
      activeFilters: {
        categories: [],
        tags: [],
        energyLevels: [],
        dateRange: {}
      }
    })
  }

  const getActiveFilterCount = () => {
    const filters = viewState.activeFilters
    return filters.categories.length + 
           filters.tags.length + 
           filters.energyLevels.length + 
           (Object.keys(filters.dateRange).length > 0 ? 1 : 0)
  }

  const energyLevelLabels = {
    1: { label: '低', color: 'bg-gray-100 text-gray-700' },
    2: { label: '弱', color: 'bg-blue-100 text-blue-700' },
    3: { label: '中', color: 'bg-green-100 text-green-700' },
    4: { label: '強', color: 'bg-yellow-100 text-yellow-700' },
    5: { label: '超', color: 'bg-red-100 text-red-700' }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* オーバーレイ */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* パネル */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* ヘッダー */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <Filter className="h-5 w-5 text-primary-600" />
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  フィルター
                </h3>
                {getActiveFilterCount() > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {getActiveFilterCount()}個適用中
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* カテゴリフィルター */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Folder className="inline h-4 w-4 mr-1" />
                カテゴリ
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={viewState.activeFilters.categories.includes(category.id)}
                      onChange={() => handleCategoryFilter(category.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{category.name}</span>
                  </label>
                ))}
                {categories.length === 0 && (
                  <p className="text-sm text-gray-500">カテゴリがありません</p>
                )}
              </div>
            </div>

            {/* タグフィルター */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="inline h-4 w-4 mr-1" />
                タグ
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {tags.slice(0, 10).map((tag) => (
                  <label key={tag.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={viewState.activeFilters.tags.includes(tag.name)}
                        onChange={() => handleTagFilter(tag.name)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{tag.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">({tag.usage_count})</span>
                  </label>
                ))}
                {tags.length === 0 && (
                  <p className="text-sm text-gray-500">タグがありません</p>
                )}
              </div>
            </div>

            {/* エネルギーレベルフィルター */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Zap className="inline h-4 w-4 mr-1" />
                エネルギー値
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <label key={level} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={viewState.activeFilters.energyLevels.includes(level)}
                      onChange={() => handleEnergyLevelFilter(level)}
                      className="sr-only"
                    />
                    <div className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      viewState.activeFilters.energyLevels.includes(level)
                        ? 'ring-2 ring-primary-500 ' + energyLevelLabels[level as keyof typeof energyLevelLabels].color
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                      {level} - {energyLevelLabels[level as keyof typeof energyLevelLabels].label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 日付範囲フィルター */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                作成日
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: '全て' },
                  { key: 'today', label: '今日' },
                  { key: 'week', label: '今週' },
                  { key: 'month', label: '今月' },
                  { key: 'year', label: '今年' }
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => handleDateRangeFilter(option.key as any)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      (option.key === 'all' && Object.keys(viewState.activeFilters.dateRange).length === 0) ||
                      (option.key !== 'all' && Object.keys(viewState.activeFilters.dateRange).length > 0)
                        ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              適用
            </button>
            <button
              onClick={clearAllFilters}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              リセット
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FilterPanel