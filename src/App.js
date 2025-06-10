import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useAdmin } from './hooks/useAdmin'
import Auth from './components/Auth'
import AdminRoute from './components/admin/AdminRoute'
import AdminDashboard from './components/admin/AdminDashboard'
import QuizManager from './components/admin/QuizManager'
import QuizList from './components/QuizList'
import ManageUsers from './components/admin/ManageUsers'
import CategoryManager from './components/admin/CategoryManager'
import QuizStats from './components/QuizStats'

function App() {
  const { user, profile, loading, signOut } = useAuth()
  const { isAdmin } = useAdmin()

  if (loading) return <div>Loading...</div>

  if (!user) return <Auth />

  return (
    <Router>
      <div>
        <nav style={{ padding: '20px', borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
          <Link to="/" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff' }}>Home</Link>
          <Link to="/quizzes" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff' }}>Take Quizzes</Link>
          <Link to="/stats" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff' }}>My Statistics</Link>
          {isAdmin && <Link to="/admin" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff' }}>Admin</Link>}
          <button onClick={signOut} style={{ float: 'right', padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Sign Out</button>
          <span style={{ float: 'right', marginRight: '20px' }}>Hello, {profile?.username}</span>
        </nav>

        <Routes>
          <Route path="/" element={
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h1>Welcome to Curiodex!</h1>
              <p style={{ fontSize: '18px', marginBottom: '30px' }}>Test your knowledge with our interactive quizzes!</p>
              <Link to="/quizzes">
                <button style={{ 
                  padding: '15px 30px', 
                  backgroundColor: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontSize: '18px',
                  cursor: 'pointer'
                }}>
                  Browse Quizzes
                </button>
              </Link>
            </div>
          } />
          
          <Route path="/quizzes" element={<QuizList />} />
          <Route path="/stats" element={<QuizStats />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          
          <Route path="/admin/*" element={
            <AdminRoute>
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/" element={<CategoryManager />} />
                <Route path="/quizzes" element={<QuizManager />} />
              </Routes>
            </AdminRoute>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App