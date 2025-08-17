import React, { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { X, Lightbulb, Tag, Folder, Zap, Plus, Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { IdeaService } from '@/services/ideaService'
import LoadingSpinner from '@/components/UI/LoadingSpinner'

// バリデーションスキーマ
const ideaSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内で入力してください'),
  content: z.string().max(2000, 'コンテンツは2000文字以内で入力してください'),
  energy_level: z.number().min(1).max(5),
  category_id: z.string().optional(),
  tags: z.array(z.string()).optional()
})

type IdeaFormData = z.infer<typeof ideaSchema>

interface IdeaFormProps {
  session: Session
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: IdeaFormData) => Promise<void>
  editingIdea?: {
    id: string
    title: string
    content: string
    energy_level: number
    category_id?: string
    tags: string[]
  }
}

const IdeaForm: React.FC<IdeaFormProps> = ({
  session,
  isOpen,
  onClose,
  onSubmit,
  editingIdea
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [existingTags, setExistingTags] = useState<Array<{name: string, usage_count: number}>>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [ideaService] = useState(() => new IdeaService(session.user.id))

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<IdeaFormData>({
    resolver: zodResolver(ideaSchema),
    defaultValues: {
      title: '',
      content: '',
      energy_level: 3,
      category_id: undefined,
      tags: []
    }
  })

  const watchedTags = watch('tags') || []
  const watchedEnergyLevel = watch('energy_level')

  // 既存タグの読み込みとフォーム初期化
  useEffect(() => {
    const loadExistingTags = async () => {
      try {
        const tags = await ideaService.getTags()
        setExistingTags(tags.map(tag => ({ name: tag.name, usage_count: tag.usage_count })))
      } catch (error) {
        console.error('Failed to load tags:', error)
      }
    }

    if (isOpen) {
      loadExistingTags()
      // フォームが開かれるときに状態をクリア
      setTagInput('')
      setShowTagSuggestions(false)
    }
  }, [isOpen, ideaService])

  // 編集時の初期化
  useEffect(() => {
    if (editingIdea) {
      reset({
        title: editingIdea.title,
        content: editingIdea.content,
        energy_level: editingIdea.energy_level,
        category_id: editingIdea.category_id,
        tags: editingIdea.tags
      })
      setSelectedTags(editingIdea.tags)
    } else if (isOpen && !editingIdea) {
      // 新規作成時のみリセット
      reset({
        title: '',
        content: '',
        energy_level: 3,
        category_id: undefined,
        tags: []
      })
      setSelectedTags([])
    }
  }, [editingIdea, isOpen, reset])

  const handleFormSubmit = async (data: IdeaFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      reset()
      setSelectedTags([])
      setTagInput('')
      onClose()
    } catch (error) {
      console.error('Failed to submit idea:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      const newTags = [...watchedTags, tagInput.trim()]
      setValue('tags', newTags)
      setSelectedTags(newTags)
      setTagInput('')
      setShowTagSuggestions(false)
    }
  }

  const removeTag = (tagToRemove: string) => {
    const newTags = watchedTags.filter(tag => tag !== tagToRemove)
    setValue('tags', newTags)
    setSelectedTags(newTags)
  }

  const selectExistingTag = (tagName: string) => {
    if (!watchedTags.includes(tagName)) {
      const newTags = [...watchedTags, tagName]
      setValue('tags', newTags)
      setSelectedTags(newTags)
    }
    setTagInput('')
    setShowTagSuggestions(false)
  }

  const getFilteredSuggestions = () => {
    if (!tagInput.trim()) return existingTags.slice(0, 10)
    
    return existingTags
      .filter(tag => 
        tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
        !watchedTags.includes(tag.name)
      )
      .slice(0, 8)
  }

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTagInput(value)
    setShowTagSuggestions(value.length > 0 || existingTags.length > 0)
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false)
    }
  }

  // クリック外しでサジェスチョンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.tag-input-container')) {
        setShowTagSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const energyLevelLabels = {
    1: { label: '低', color: 'text-gray-500', bg: 'bg-gray-100' },
    2: { label: '弱', color: 'text-blue-500', bg: 'bg-blue-100' },
    3: { label: '中', color: 'text-green-500', bg: 'bg-green-100' },
    4: { label: '強', color: 'text-yellow-500', bg: 'bg-yellow-100' },
    5: { label: '超', color: 'text-red-500', bg: 'bg-red-100' }
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

        {/* モーダル */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit(handleFormSubmit)}>
            {/* ヘッダー */}
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-primary-600" />
                  </div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {editingIdea ? 'アイデアを編集' : '新しいアイデア'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* タイトル */}
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('title')}
                  type="text"
                  id="title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="アイデアのタイトルを入力..."
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              {/* コンテンツ */}
              <div className="mb-4">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  詳細
                </label>
                <textarea
                  {...register('content')}
                  id="content"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="アイデアの詳細を記述..."
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                )}
              </div>

              {/* エネルギーレベル */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Zap className="inline h-4 w-4 mr-1" />
                  エネルギー値
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <label key={level} className="flex flex-col items-center cursor-pointer">
                      <input
                        {...register('energy_level', { valueAsNumber: true })}
                        type="radio"
                        value={level}
                        className="sr-only"
                      />
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        watchedEnergyLevel === level 
                          ? `${energyLevelLabels[level as keyof typeof energyLevelLabels].bg} ${energyLevelLabels[level as keyof typeof energyLevelLabels].color} ring-2 ring-primary-500` 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}>
                        {level}
                      </div>
                      <span className="text-xs mt-1 text-gray-500">
                        {energyLevelLabels[level as keyof typeof energyLevelLabels].label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* タグ */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="inline h-4 w-4 mr-1" />
                  タグ ({watchedTags.length}/10)
                </label>
                
                {/* 選択済みタグ表示 */}
                {watchedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-md">
                    {watchedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {/* タグ入力フィールド */}
                <div className="relative tag-input-container">
                  <div className="flex">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={handleTagInputChange}
                      onKeyDown={handleTagInputKeyDown}
                      onFocus={() => setShowTagSuggestions(true)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="タグを入力または選択..."
                      maxLength={20}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      disabled={!tagInput.trim() || watchedTags.includes(tagInput.trim())}
                      className="px-4 py-2 bg-blue-600 border border-blue-600 rounded-r-md text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* タグ候補表示 */}
                  {showTagSuggestions && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {getFilteredSuggestions().length > 0 ? (
                        <>
                          <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                            既存のタグから選択
                          </div>
                          {getFilteredSuggestions().map((tag) => (
                            <button
                              key={tag.name}
                              type="button"
                              onClick={() => selectExistingTag(tag.name)}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between group"
                            >
                              <span className="text-sm text-gray-900">{tag.name}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">
                                  {tag.usage_count}回使用
                                </span>
                                <Check className="h-3 w-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          ))}
                        </>
                      ) : existingTags.length > 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          マッチするタグがありません
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          まだタグがありません
                        </div>
                      )}
                      
                      {/* 新規タグ作成オプション */}
                      {tagInput.trim() && !existingTags.some(tag => tag.name.toLowerCase() === tagInput.toLowerCase()) && (
                        <>
                          <div className="border-t border-gray-200"></div>
                          <button
                            type="button"
                            onClick={addTag}
                            className="w-full px-3 py-2 text-left hover:bg-green-50 flex items-center space-x-2"
                          >
                            <Plus className="h-3 w-3 text-green-600" />
                            <span className="text-sm text-green-700">
                              新しいタグ「{tagInput}」を作成
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {/* 人気タグクイック選択 */}
                {existingTags.length > 0 && watchedTags.length < 5 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-500 mb-2">人気のタグ</div>
                    <div className="flex flex-wrap gap-1">
                      {existingTags
                        .filter(tag => !watchedTags.includes(tag.name))
                        .sort((a, b) => b.usage_count - a.usage_count)
                        .slice(0, 6)
                        .map((tag) => (
                          <button
                            key={tag.name}
                            type="button"
                            onClick={() => selectExistingTag(tag.name)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border hover:bg-blue-100 hover:text-blue-700 transition-colors"
                          >
                            {tag.name} ({tag.usage_count})
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <LoadingSpinner size="sm" className="text-white" />
                ) : (
                  editingIdea ? '更新' : '作成'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default IdeaForm