import React, { useState } from 'react'
import { Session } from '@supabase/supabase-js'
import Sidebar from './Sidebar'
import IdeaList from '@/components/Ideas/IdeaList'
import IdeaGraph from '@/components/Visualization/IdeaGraph'
import AbstractionGraph from '@/components/Visualization/AbstractionGraph'
import Analytics from '@/components/Analytics/Analytics'
import Settings from '@/components/Settings/Settings'
import { ViewState } from '@/types'

// メインビューコンポーネント
const MainView: React.FC<{
  session: Session
  viewState: ViewState
  onViewStateChange: (viewState: ViewState) => void
}> = ({ session, viewState, onViewStateChange }) => {
  console.log('MainView rendering with currentView:', viewState.currentView)
  
  return (
    <div>
      {viewState.currentView === 'list' && (
        <IdeaList 
          session={session}
          viewState={viewState}
          onViewStateChange={onViewStateChange}
        />
      )}
      {viewState.currentView === 'graph' && (
        <IdeaGraph 
          session={session}
          viewState={viewState}
          onViewStateChange={onViewStateChange}
        />
      )}
      {(viewState.currentView as any) === 'abstraction' && (
        <AbstractionGraph 
          session={session}
          viewState={viewState}
          onViewStateChange={onViewStateChange}
        />
      )}
      {(viewState.currentView as any) === 'analytics' && (
        <Analytics session={session} />
      )}
      {(viewState.currentView as any) === 'settings' && (
        <Settings session={session} />
      )}
    </div>
  )
}

interface DashboardProps {
  session: Session
}

const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  const [viewState, setViewState] = useState<ViewState>({
    currentView: 'list', // デフォルトをlistに変更
    selectedIdeas: [],
    searchQuery: '',
    activeFilters: {
      categories: [],
      tags: [],
      energyLevels: [],
      dateRange: {}
    },
    sortBy: 'created_at',
    sortOrder: 'desc'
  })

  const [sidebarOpen, setSidebarOpen] = useState(true)

  // デバッグ用：viewState変更を監視
  React.useEffect(() => {
    console.log('Dashboard: ViewState changed:', viewState)
  }, [viewState])

  return (
    <div className="flex h-screen bg-gray-100">
      {/* サイドバー */}
      <div className={`flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <Sidebar 
          session={session}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          viewState={viewState}
          onViewStateChange={setViewState}
        />
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <MainView 
            key={viewState.currentView}
            session={session}
            viewState={viewState}
            onViewStateChange={setViewState}
          />
        </main>
      </div>
    </div>
  )
}

export default Dashboard