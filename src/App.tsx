import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import AuthPage from '@/components/Auth/AuthPage'
import Dashboard from '@/components/Dashboard/Dashboard'
import LoadingSpinner from '@/components/UI/LoadingSpinner'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // セッション変更の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route
            path="/auth"
            element={session ? <Navigate to="/" replace /> : <AuthPage />}
          />
          <Route
            path="/*"
            element={session ? <Dashboard session={session} /> : <Navigate to="/auth" replace />}
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App