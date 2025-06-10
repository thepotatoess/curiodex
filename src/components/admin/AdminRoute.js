import { useAdmin } from '../../hooks/useAdmin'

export default function AdminRoute({ children }) {
  const { isAdmin, loading } = useAdmin()

  if (loading) return <div>Loading...</div>

  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You need admin privileges to access this area.</p>
      </div>
    )
  }

  return children
}