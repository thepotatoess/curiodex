import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { CategoryProvider } from './contexts/CategoryContext'
import Auth from './components/Auth'
import HomePage from './components/HomePage'
import ModernNavbar from './components/ModernNavbar'
import AdminRoute from './components/admin/AdminRoute'
import AdminDashboard from './components/admin/AdminDashboard'
import QuizManager from './components/admin/QuizManager'
import QuizList from './components/QuizList'
import QuizDetailPage from './components/QuizDetailPage'
import QuizPreview from './components/QuizPreview'
import ManageUsers from './components/admin/ManageUsers'
import CategoryManager from './components/admin/CategoryManager'
import QuizStats from './components/QuizStats'
import { ConfirmModal } from './components/ConfirmModal'

// Protected Route Component - redirects to home if not authenticated
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
          <div>Loading Curiodex...</div>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/" replace />
  }
  
  return children
}

function AppContent() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const [showNavConfirm, setShowNavConfirm] = useState(false)

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
          <div>Loading Curiodex...</div>
        </div>
      </div>
    )
  }

  const handleQuizzesNavClick = (e) => {
    if (location.pathname === '/quizzes') {
      // Check if user might be taking a quiz by looking for quiz-taking elements
      const quizTakingContainer = document.querySelector('.quiz-taking-container') || 
                                 document.querySelector('.quiz-preview-container')
      
      if (quizTakingContainer) {
        // User is taking a quiz - show confirmation
        e.preventDefault()
        setShowNavConfirm(true)
      } else {
        // User is on quiz list - refresh to reset state
        e.preventDefault()
        window.location.reload()
      }
    }
    // If not on quizzes page, let normal navigation happen
  }

  const confirmNavigation = () => {
    setShowNavConfirm(false)
    window.location.reload()
  }

  const isHomePage = location.pathname === '/'

  return (
    <CategoryProvider>
      <div style={{ minHeight: '100vh', background: '#ffffff' }}>
        {/* Show navbar only when user is logged in OR on homepage */}
        {(user || isHomePage) && (
          <ModernNavbar 
            onQuizzesNavClick={handleQuizzesNavClick}
            showNavConfirm={showNavConfirm}
          />
        )}
        
        {/* Main content */}
        <main style={{ 
          paddingTop: (user || isHomePage) ? '70px' : '0',
          minHeight: '100vh',
          background: isHomePage ? 'transparent' : '#ffffff'
        }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Auth />} />
            
            {/* Protected Routes - require authentication */}
            <Route path="/quizzes" element={
              <ProtectedRoute>
                <QuizList />
              </ProtectedRoute>
            } />
            
            <Route path="/quiz/:quizId" element={
              <ProtectedRoute>
                <QuizDetailPage />
              </ProtectedRoute>
            } />
            
            <Route path="/quiz/:quizId/preview" element={
              <ProtectedRoute>
                <QuizPreview />
              </ProtectedRoute>
            } />
            
            {/* Legacy route for direct play - redirects to preview */}
            <Route path="/quiz/:quizId/play" element={
              <ProtectedRoute>
                <QuizPreview />
              </ProtectedRoute>
            } />
            
            <Route path="/stats" element={
              <ProtectedRoute>
                <QuizStats />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/users" element={
              <ProtectedRoute>
                <ManageUsers />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/*" element={
              <ProtectedRoute>
                <AdminRoute>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="/categories" element={<CategoryManager />} />
                    <Route path="/quizzes" element={<QuizManager />} />
                  </Routes>
                </AdminRoute>
              </ProtectedRoute>
            } />
            
            {/* Catch all route - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Navigation Confirmation Modal */}
        <ConfirmModal
          isOpen={showNavConfirm}
          title="Leave Quiz?"
          message={
            <div>
              <p>Are you sure you want to leave this quiz?</p>
              <p style={{ color: '#dc3545', fontWeight: 'bold', margin: '8px 0 0 0' }}>
                ⚠️ Your progress will be lost and won't be saved.
              </p>
            </div>
          }
          onConfirm={confirmNavigation}
          onCancel={() => setShowNavConfirm(false)}
          confirmText="Leave Quiz"
          cancelText="Continue Quiz"
          danger={true}
        />
      </div>
    </CategoryProvider>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App