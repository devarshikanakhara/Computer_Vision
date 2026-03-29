import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Results from './pages/Results'
import History from './pages/History'
import { useSession } from './hooks/useSession'

export default function App() {
  const session = useSession()

  return (
    <Layout>
      <Routes>
        <Route path="/"          element={<Landing  session={session} />} />
        <Route path="/dashboard" element={<Dashboard session={session} />} />
        <Route path="/results"   element={
          session.stage === 'completed'
            ? <Results session={session} />
            : <Navigate to="/dashboard" replace />
        } />
        <Route path="/history"   element={<History />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
