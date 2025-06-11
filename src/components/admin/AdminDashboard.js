import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import '../../css/AdminDashboard.css'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuizzes: 0,
    totalAttempts: 0
  })
  const [recentAttempts, setRecentAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load stats
        const [usersResult, quizzesResult, attemptsResult] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }),
          supabase.from('quizzes').select('id', { count: 'exact' }),
          supabase.from('user_quiz_attempts').select('id', { count: 'exact' })
        ])

        setStats({
          totalUsers: usersResult.count || 0,
          totalQuizzes: quizzesResult.count || 0,
          totalAttempts: attemptsResult.count || 0
        })

        // Load recent attempts
        await loadRecentAttempts()

      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    const loadRecentAttempts = async () => {
      try {
        // For now, let's just get ALL attempts to see if data exists
        const { data, error } = await supabase
          .from('user_quiz_attempts')
          .select(`
            *,
            quizzes(title),
            profiles(email, username)
          `)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error

        console.log('Recent attempts found:', data) // Debug log
        setRecentAttempts(data || [])
      } catch (error) {
        console.error('Error loading recent attempts:', error)
      }
    }

    loadDashboardData()
  }, []) // Empty dependency array is fine here

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown'
    
    const now = new Date()
    const attemptTime = new Date(dateString)
    const diffInMinutes = Math.floor((now - attemptTime) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    return attemptTime.toLocaleDateString()
  }

  const getScoreColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 90) return '#10b981'
    if (percentage >= 80) return '#3b82f6'
    if (percentage >= 70) return '#8b5cf6'
    if (percentage >= 60) return '#f59e0b'
    return '#ef4444'
  }

  if (loading) return <div className="admin-loading">Loading dashboard...</div>

  return (
    <div className="admin-dashboard-container">
      <h1 className="admin-dashboard-title">Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <div className="stat-card-value users">{stats.totalUsers}</div>
        </div>
        <div className="stat-card">
          <h3>Total Quizzes</h3>
          <div className="stat-card-value quizzes">{stats.totalQuizzes}</div>
        </div>
        <div className="stat-card">
          <h3>Total Attempts</h3>
          <div className="stat-card-value attempts">{stats.totalAttempts}</div>
        </div>
      </div>

      {/* Recent Quiz Attempts */}
      <div className="recent-attempts-section">
        <div className="section-header">
          <h2>Recent Quiz Attempts</h2>
          <p className="section-description">
            Recent quiz attempts (showing all for debugging)
          </p>
        </div>
        
        {recentAttempts.length === 0 ? (
          <div className="attempts-empty-state">
            <p>
              No quiz attempts found. Take a quiz to see attempts appear here!
            </p>
          </div>
        ) : (
          <div className="attempts-table-container">
            <table className="attempts-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Quiz</th>
                  <th className="text-center">Score</th>
                  <th className="text-center">Percentage</th>
                  <th className="text-center">Time</th>
                  <th className="text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((attempt, index) => {
                  const percentage = Math.round((attempt.score / attempt.max_score) * 100)
                  const minutes = Math.floor(attempt.time_taken / 60)
                  const seconds = attempt.time_taken % 60
                  
                  return (
                    <tr key={attempt.id}>
                      <td>
                        {attempt.profiles?.email || attempt.profiles?.username || 'Unknown User'}
                      </td>
                      <td>
                        {attempt.quizzes?.title || 'Unknown Quiz'}
                      </td>
                      <td className="text-center">
                        <span className="score-display">
                          {attempt.score}/{attempt.max_score}
                        </span>
                      </td>
                      <td className="text-center">
                        <span 
                          className="score-percentage"
                          style={{ color: getScoreColor(attempt.score, attempt.max_score) }}
                        >
                          {percentage}%
                        </span>
                      </td>
                      <td className="text-center">
                        {minutes}:{seconds.toString().padStart(2, '0')}
                      </td>
                      <td className="text-right time-display">
                        {formatTimeAgo(attempt.completed_at || attempt.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          <button 
            onClick={() => window.location.href = '/admin/quizzes'}
            className="quick-action-btn quizzes"
          >
            Create New Quiz
          </button>
          <button 
            onClick={() => window.location.href = '/admin/quizzes'}
            className="quick-action-btn quizzes"
          >
            Manage Quizzes
          </button>
          <button 
            onClick={() => window.location.href = '/admin/users'}
            className="quick-action-btn users"
          >
            Manage Users
          </button>
          <button 
            onClick={() => window.location.href = '/admin/categories'}
            className="quick-action-btn categories"
          >
            Manage Categories
          </button>
          <button 
            className="quick-action-btn analytics"
          >
            View Analytics
          </button>
        </div>
      </div>
    </div>
  )
}