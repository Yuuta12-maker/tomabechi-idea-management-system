import React, { useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { X, Lightbulb, Tag, Folder, Zap } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
      title: editingIdea?.title || '',
      content: editingIdea?.content || '',
      energy_level: editingIdea?.energy_level || 3,
      category_id: editingIdea?.category_id || undefined,
      tags: editingIdea?.tags || []
    }
  })

  const watchedTags = watch('tags') || []
  const watchedEnergyLevel = watch('energy_level')

  const handleFormSubmit = async (data: IdeaFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      reset()
      onClose()
    } catch (error) {
      console.error('Failed to submit idea:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      setValue('tags', [...watchedTags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove))
  }

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
                  タグ
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {watchedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-primary-600 hover:text-primary-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="タグを入力してEnter"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-600 hover:bg-gray-200"
                  >
                    追加
                  </button>
                </div>
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