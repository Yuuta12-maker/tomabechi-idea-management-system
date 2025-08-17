import React from 'react'
import { Session } from '@supabase/supabase-js'
import { 
  Brain, 
  List, 
  Network, 
  Search, 
  BarChart3, 
  Settings, 
  Plus,
  Menu,
  LogOut,
  Layers
} from 'lucide-react'
import { supabase } from '@/services/supabase'
import { ViewState } from '@/types'

interface SidebarProps {
  session: Session
  isOpen: boolean
  onToggle: () => void
  viewState: ViewState
  onViewStateChange: (viewState: ViewState) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  session,
  isOpen,
  onToggle,
  viewState,
  onViewStateChange
}) => {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleViewChange = (view: 'list' | 'graph' | 'analytics' | 'settings') => {
    console.log('Sidebar: Changing view to:', view)
    console.log('Current viewState:', viewState)
    onViewStateChange({
      ...viewState,
      currentView: view as any
    })
  }

  const navigationItems = [
    {
      name: 'アイデア一覧',
      icon: List,
      viewType: 'list',
      active: viewState.currentView === 'list'
    },
    {
      name: 'ゲシュタルト可視化',
      icon: Network,
      viewType: 'graph',
      active: viewState.currentView === 'graph'
    },
    {
      name: '抽象度可視化',
      icon: Layers,
      viewType: 'abstraction',
      active: viewState.currentView === 'abstraction'
    },
    {
      name: '分析レポート',
      icon: BarChart3,
      viewType: 'analytics',
      active: viewState.currentView === 'analytics'
    },
    {
      name: '設定',
      icon: Settings,
      viewType: 'settings',
      active: viewState.currentView === 'settings'
    }
  ]

  return (
    <>
      {/* サイドバー */}
      <div className="h-full bg-white shadow-lg border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className={`flex items-center ${isOpen ? 'space-x-3' : 'justify-center w-full'}`}>
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              {isOpen && (
                <div className="flex-1">
                  <h1 className="text-lg font-semibold text-gray-900">TIMS</h1>
                  <p className="text-xs text-gray-500">苫米地アイデア管理</p>
                </div>
              )}
            </div>
            {isOpen && (
              <button
                onClick={onToggle}
                className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 flex-shrink-0"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
            )}
          </div>

          {/* 閉じた状態でのトグルボタン */}
          {!isOpen && (
            <div className="p-2 border-b">
              <button
                onClick={onToggle}
                className="w-full p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center justify-center"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          )}

          {/* クイック追加ボタン */}
          <div className="p-4">
            <button 
              onClick={() => {
                // アイデア一覧画面に切り替えてフォームを開く
                onViewStateChange({
                  ...viewState,
                  currentView: 'list'
                })
                // カスタムイベントを発火してアイデアフォームを開く
                window.dispatchEvent(new CustomEvent('openIdeaForm'))
              }}
              className={`w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                isOpen ? 'px-4 py-2' : 'p-2'
              }`}
            >
              <div className={`flex items-center ${isOpen ? 'space-x-2' : 'justify-center'}`}>
                <Plus className="h-5 w-5" />
                {isOpen && <span className="text-sm font-medium">新しいアイデア</span>}
              </div>
            </button>
          </div>

          {/* 検索バー */}
          {isOpen && (
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="アイデアを検索..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={viewState.searchQuery}
                  onChange={(e) => onViewStateChange({
                    ...viewState,
                    searchQuery: e.target.value
                  })}
                />
              </div>
            </div>
          )}

          {/* ナビゲーション */}
          <nav className="flex-1 px-4 space-y-1">
            {navigationItems.map((item) => (
              <div key={item.name}>
                <button
                  onClick={() => {
                    console.log('Button clicked:', item.name, item.viewType)
                    handleViewChange(item.viewType as 'list' | 'graph' | 'analytics' | 'settings')
                  }}
                  className={`w-full group flex items-center rounded-md text-sm font-medium transition-colors ${
                    isOpen ? 'px-2 py-2' : 'p-2 justify-center'
                  } ${
                    item.active
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`flex-shrink-0 h-5 w-5 ${isOpen ? 'mr-3' : ''}`} />
                  {isOpen && item.name}
                </button>
              </div>
            ))}
          </nav>

          {/* ユーザー情報とサインアウト */}
          <div className="p-4 border-t">
            {isOpen && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 truncate">
                  {session.user.email}
                </p>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className={`w-full group flex items-center rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${
                isOpen ? 'px-2 py-2' : 'p-2 justify-center'
              }`}
            >
              <LogOut className={`flex-shrink-0 h-5 w-5 ${isOpen ? 'mr-3' : ''}`} />
              {isOpen && 'サインアウト'}
            </button>
          </div>
        </div>
      </div>

    </>
  )
}

export default Sidebar