import React, { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { 
  TrendingUp, 
  Brain, 
  Network, 
  Zap,
  Download,
  RefreshCw
} from 'lucide-react'
import { IdeaService } from '@/services/ideaService'
import { AnalyticsData, Idea } from '@/types'
import LoadingSpinner from '@/components/UI/LoadingSpinner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { format as formatDate, subDays, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

interface AnalyticsProps {
  session: Session
}

const Analytics: React.FC<AnalyticsProps> = ({ session }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [ideaService] = useState(() => new IdeaService(session.user.id))

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      // アイデア一覧を取得
      const allIdeas = await ideaService.getIdeas()
      setIdeas(allIdeas)
      
      // 分析データを計算
      const analyticsData = calculateAnalytics(allIdeas)
      setAnalytics(analyticsData)
      
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = (ideas: Idea[]): AnalyticsData => {
    const now = new Date()
    const oneWeekAgo = subDays(now, 7)
    const oneMonthAgo = subDays(now, 30)
    
    // 基本統計
    const totalIdeas = ideas.length
    const ideasThisWeek = ideas.filter(idea => 
      parseISO(idea.created_at) >= oneWeekAgo
    ).length
    const ideasThisMonth = ideas.filter(idea => 
      parseISO(idea.created_at) >= oneMonthAgo
    ).length
    
    // 平均エネルギー値
    const averageEnergyLevel = ideas.length > 0 
      ? ideas.reduce((sum, idea) => sum + idea.energy_level, 0) / ideas.length
      : 0
    
    // タグ統計
    const tagCounts: Record<string, number> = {}
    ideas.forEach(idea => {
      idea.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })
    
    const topTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({
        tag: { id: name, name, color: '', usage_count: count, user_id: session.user.id, created_at: '' },
        ideaCount: count,
        trend: 'stable' as const
      }))
    
    // 関係性密度計算
    const totalPossibleConnections = totalIdeas * (totalIdeas - 1) / 2
    const actualConnections = ideas.reduce((sum, idea) => sum + idea.related_ideas.length, 0) / 2
    const relationshipDensity = totalPossibleConnections > 0 
      ? (actualConnections / totalPossibleConnections) * 100
      : 0
    
    // 時系列データ（過去30日）
    const timeSeriesData = []
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i)
      const dayIdeas = ideas.filter(idea => {
        const ideaDate = parseISO(idea.created_at)
        return ideaDate.toDateString() === date.toDateString()
      })
      
      timeSeriesData.push({
        date: formatDate(date, 'M/d', { locale: ja }),
        count: dayIdeas.length,
        energy: dayIdeas.length > 0 
          ? dayIdeas.reduce((sum, idea) => sum + idea.energy_level, 0) / dayIdeas.length
          : 0
      })
    }
    
    return {
      totalIdeas,
      ideasThisWeek,
      ideasThisMonth,
      averageEnergyLevel,
      topCategories: [], // カテゴリ機能は後で実装
      topTags,
      ideaCreationPattern: timeSeriesData,
      relationshipDensity
    }
  }

  const exportData = async (format: 'json' | 'csv') => {
    try {
      if (format === 'json') {
        const dataStr = JSON.stringify({ analytics, ideas }, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `tomabechi-analytics-${formatDate(new Date(), 'yyyy-MM-dd')}.json`
        link.click()
        URL.revokeObjectURL(url)
      } else if (format === 'csv') {
        const csvHeader = 'タイトル,内容,エネルギー値,タグ,作成日,関連アイデア数\n'
        const csvData = ideas.map(idea => [
          `"${idea.title.replace(/"/g, '""')}"`,
          `"${idea.content.replace(/"/g, '""')}"`,
          idea.energy_level,
          `"${idea.tags.join(', ')}"`,
          formatDate(parseISO(idea.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: ja }),
          idea.related_ideas.length
        ].join(',')).join('\n')
        
        const dataBlob = new Blob([csvHeader + csvData], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `tomabechi-ideas-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('エクスポートに失敗しました')
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          分析データの読み込みに失敗しました
        </div>
      </div>
    )
  }

  const energyDistribution = [
    { name: 'エネルギー1', value: ideas.filter(i => i.energy_level === 1).length, color: '#6B7280' },
    { name: 'エネルギー2', value: ideas.filter(i => i.energy_level === 2).length, color: '#9CA3AF' },
    { name: 'エネルギー3', value: ideas.filter(i => i.energy_level === 3).length, color: '#FCD34D' },
    { name: 'エネルギー4', value: ideas.filter(i => i.energy_level === 4).length, color: '#F59E0B' },
    { name: 'エネルギー5', value: ideas.filter(i => i.energy_level === 5).length, color: '#DC2626' }
  ].filter(item => item.value > 0)

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              分析ダッシュボード
            </h1>
            <p className="text-gray-600">
              苫米地アルゴリズムによるアイデア創造性分析
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => exportData('json')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </button>
            <button
              onClick={() => exportData('csv')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </button>
            <button
              onClick={loadAnalytics}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  総アイデア数
                </h3>
                <div className="text-3xl font-bold text-blue-600">{analytics.totalIdeas}</div>
                <p className="text-sm text-gray-500 mt-1">
                  今週: +{analytics.ideasThisWeek}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  平均エネルギー値
                </h3>
                <div className="text-3xl font-bold text-yellow-600">
                  {analytics.averageEnergyLevel.toFixed(1)}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  5段階評価
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Network className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  関係性密度
                </h3>
                <div className="text-3xl font-bold text-purple-600">
                  {analytics.relationshipDensity.toFixed(1)}%
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  アイデア間のつながり
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  今月の作成数
                </h3>
                <div className="text-3xl font-bold text-green-600">{analytics.ideasThisMonth}</div>
                <p className="text-sm text-gray-500 mt-1">
                  過去30日間
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* チャート */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* アイデア作成トレンド */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              アイデア作成トレンド（過去30日）
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.ideaCreationPattern}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => `日付: ${label}`}
                    formatter={(value, name) => [value, name === 'count' ? 'アイデア数' : '平均エネルギー']}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="energy" stroke="#F59E0B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* エネルギーレベル分布 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              エネルギーレベル分布
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={energyDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {energyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 人気タグ */}
        {analytics.topTags.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              人気タグ TOP 10
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topTags}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tag.name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [value, 'アイデア数']}
                    labelFormatter={(label) => `タグ: ${label}`}
                  />
                  <Bar dataKey="ideaCount" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Analytics