import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/account" replace />
  return children
}

export default RequireAuth
