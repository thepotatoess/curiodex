import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

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

  if (loading) return <div style={{ padding: '20px' }}>Loading dashboard...</div>

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
          <h3>Total Users</h3>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#007bff' }}>{stats.totalUsers}</div>
        </div>
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
          <h3>Total Quizzes</h3>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#28a745' }}>{stats.totalQuizzes}</div>
        </div>
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
          <h3>Total Attempts</h3>
          <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#17a2b8' }}>{stats.totalAttempts}</div>
        </div>
      </div>

      {/* Recent Quiz Attempts */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Recent Quiz Attempts</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Recent quiz attempts (showing all for debugging)
        </p>
        
        {recentAttempts.length === 0 ? (
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '40px', 
            textAlign: 'center',
            backgroundColor: '#f8f9fa'
          }}>
            <p style={{ margin: 0, color: '#666' }}>
              No quiz attempts found. Take a quiz to see attempts appear here!
            </p>
          </div>
        ) : (
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>User</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Quiz</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Score</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Percentage</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Time</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>When</th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((attempt, index) => {
                  const percentage = Math.round((attempt.score / attempt.max_score) * 100)
                  const minutes = Math.floor(attempt.time_taken / 60)
                  const seconds = attempt.time_taken % 60
                  
                  return (
                    <tr key={attempt.id} style={{ 
                      backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                      borderBottom: '1px solid #eee'
                    }}>
                      <td style={{ padding: '12px' }}>
                        {attempt.profiles?.email || attempt.profiles?.username || 'Unknown User'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {attempt.quizzes?.title || 'Unknown Quiz'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {attempt.score}/{attempt.max_score}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ 
                          color: getScoreColor(attempt.score, attempt.max_score),
                          fontWeight: 'bold'
                        }}>
                          {percentage}%
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {minutes}:{seconds.toString().padStart(2, '0')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#666', fontSize: '14px' }}>
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
      <div>
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => window.location.href = '/admin/quizzes'}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Manage Quizzes
          </button>
          <button 
            onClick={() => window.location.href = '/admin/users'}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Manage Users
          </button>
          <button 
            onClick={() => window.location.href = '/admin/categories'}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#f59e0b', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Manage Categories
          </button>
          <button 
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            View Analytics
          </button>
        </div>
      </div>
    </div>
  )
}