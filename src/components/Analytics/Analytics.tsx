import React from 'react'
import { Session } from '@supabase/supabase-js'

interface AnalyticsProps {
  session: Session
}

const Analytics: React.FC<AnalyticsProps> = ({ session }) => {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            分析レポート
          </h1>
          <p className="text-gray-600">
            あなたのアイデア創造性を数値で分析
          </p>
        </div>

        {/* プレースホルダー */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              総アイデア数
            </h3>
            <div className="text-3xl font-bold text-primary-600">0</div>
            <p className="text-sm text-gray-500 mt-2">
              今週: +0
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              平均エネルギー値
            </h3>
            <div className="text-3xl font-bold text-green-600">0.0</div>
            <p className="text-sm text-gray-500 mt-2">
              5段階評価
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              関係性密度
            </h3>
            <div className="text-3xl font-bold text-purple-600">0%</div>
            <p className="text-sm text-gray-500 mt-2">
              アイデア間のつながり
            </p>
          </div>
        </div>

        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              創造性トレンド
            </h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              グラフを表示するにはデータが必要です
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics