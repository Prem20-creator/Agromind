import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import AdvisoryPage from './pages/AdvisoryPage'
import AuditPage from './pages/AuditPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"        element={<HomePage />} />
        <Route path="/advisor" element={<AdvisoryPage />} />
        <Route path="/audit"   element={<AuditPage />} />
      </Routes>
    </Layout>
  )
}
