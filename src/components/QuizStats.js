import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import '../QuizStats.css'

export default function QuizStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [quizzes, setQuizzes] = useState([])

  useEffect(() => {
    loadUserStats()
  }, [])

  const loadUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all user attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('user_quiz_attempts')
        .select(`
          *,
          quizzes(title, category, difficulty)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (attemptsError) throw attemptsError

      // Get unique quizzes
      const uniqueQuizzes = attempts.reduce((acc, attempt) => {
        if (!acc.find(q => q.id === attempt.quiz_id)) {
          acc.push({
            id: attempt.quiz_id,
            title: attempt.quizzes.title,
            category: attempt.quizzes.category,
            difficulty: attempt.quizzes.difficulty
          })
        }
        return acc
      }, [])

      setQuizzes(uniqueQuizzes)

      // Process stats
      const processedStats = processStats(attempts)
      setStats(processedStats)

      // Select first quiz by default
      if (uniqueQuizzes.length > 0) {
        setSelectedQuiz(uniqueQuizzes[0].id)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const processStats = (attempts) => {
    const overallStats = {
      totalAttempts: attempts.length,
      totalQuizzes: new Set(attempts.map(a => a.quiz_id)).size,
      totalPoints: attempts.reduce((sum, a) => sum + a.score, 0),
      totalMaxPoints: attempts.reduce((sum, a) => sum + a.max_score, 0),
      totalTime: attempts.reduce((sum, a) => sum + (a.time_taken || 0), 0),
      averageScore: 0,
      bestStreak: calculateBestStreak(attempts),
      recentActivity: getRecentActivity(attempts),
      quizBreakdown: {}
    }

    // Calculate average score
    if (overallStats.totalMaxPoints > 0) {
      overallStats.averageScore = Math.round((overallStats.totalPoints / overallStats.totalMaxPoints) * 100)
    }

    // Process per-quiz stats
    const quizGroups = attempts.reduce((acc, attempt) => {
      if (!acc[attempt.quiz_id]) {
        acc[attempt.quiz_id] = []
      }
      acc[attempt.quiz_id].push(attempt)
      return acc
    }, {})

    Object.keys(quizGroups).forEach(quizId => {
      const quizAttempts = quizGroups[quizId]
      const scores = quizAttempts.map(a => Math.round((a.score / a.max_score) * 100))
      
      overallStats.quizBreakdown[quizId] = {
        attempts: quizAttempts,
        totalAttempts: quizAttempts.length,
        bestScore: Math.max(...scores),
        worstScore: Math.min(...scores),
        averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        improvement: scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0,
        scoreHistory: scores,
        timeHistory: quizAttempts.map(a => a.time_taken || 0)
      }
    })

    return overallStats
  }

  const calculateBestStreak = (attempts) => {
    let currentStreak = 0
    let bestStreak = 0
    
    attempts.forEach(attempt => {
      const percentage = (attempt.score / attempt.max_score) * 100
      if (percentage >= 80) {
        currentStreak++
        bestStreak = Math.max(bestStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    })
    
    return bestStreak
  }

  const getRecentActivity = (attempts) => {
    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 7)
    
    const recentAttempts = attempts.filter(a => 
      new Date(a.completed_at) >= last7Days
    )
    
    return {
      count: recentAttempts.length,
      averageScore: recentAttempts.length > 0 
        ? Math.round(recentAttempts.reduce((sum, a) => sum + (a.score / a.max_score) * 100, 0) / recentAttempts.length)
        : 0
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPerformanceLevel = (score) => {
    if (score >= 90) return { label: 'Expert', color: '#10b981' }
    if (score >= 80) return { label: 'Advanced', color: '#3b82f6' }
    if (score >= 70) return { label: 'Proficient', color: '#8b5cf6' }
    if (score >= 60) return { label: 'Developing', color: '#f59e0b' }
    return { label: 'Beginner', color: '#ef4444' }
  }

  if (loading) return <div className="stats-loading">Loading your statistics...</div>

  if (!stats || stats.totalAttempts === 0) {
    return (
      <div className="stats-empty">
        <h2>No Statistics Yet</h2>
        <p>Complete some quizzes to see your performance statistics!</p>
      </div>
    )
  }

  const selectedQuizStats = selectedQuiz ? stats.quizBreakdown[selectedQuiz] : null
  const performanceLevel = getPerformanceLevel(stats.averageScore)

  return (
    <div className="stats-container">
      <h1 className="stats-title">Your Quiz Statistics</h1>
      
      {/* Overall Performance Card */}
      <div className="stats-overview-card">
        <div className="stats-overview-header">
          <h2>Overall Performance</h2>
          <div className="performance-badge" style={{ backgroundColor: performanceLevel.color }}>
            {performanceLevel.label}
          </div>
        </div>
        
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{stats.totalAttempts}</div>
            <div className="stat-label">Total Attempts</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.totalQuizzes}</div>
            <div className="stat-label">Unique Quizzes</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.averageScore}%</div>
            <div className="stat-label">Average Score</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{formatTime(Math.round(stats.totalTime / stats.totalAttempts))}</div>
            <div className="stat-label">Avg. Time</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="overall-progress">
          <div className="progress-label">
            <span>Overall Progress</span>
            <span>{stats.totalPoints} / {stats.totalMaxPoints} points</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${stats.averageScore}%`,
                backgroundColor: performanceLevel.color
              }}
            />
          </div>
        </div>
      </div>

      {/* Achievement Cards */}
      <div className="achievements-section">
        <h3>Achievements</h3>
        <div className="achievement-cards">
          <div className="achievement-card">
            <div className="achievement-icon">🔥</div>
            <div className="achievement-value">{stats.bestStreak}</div>
            <div className="achievement-label">Best Streak</div>
            <div className="achievement-desc">Consecutive 80%+ scores</div>
          </div>
          <div className="achievement-card">
            <div className="achievement-icon">📈</div>
            <div className="achievement-value">{stats.recentActivity.count}</div>
            <div className="achievement-label">Last 7 Days</div>
            <div className="achievement-desc">{stats.recentActivity.averageScore}% avg score</div>
          </div>
          <div className="achievement-card">
            <div className="achievement-icon">⏱️</div>
            <div className="achievement-value">{formatTime(stats.totalTime)}</div>
            <div className="achievement-label">Total Time</div>
            <div className="achievement-desc">Time invested</div>
          </div>
        </div>
      </div>

      {/* Quiz Selector */}
      <div className="quiz-selector">
        <h3>Quiz Performance Details</h3>
        <div className="quiz-tabs">
          {quizzes.map(quiz => (
            <button
              key={quiz.id}
              className={`quiz-tab ${selectedQuiz === quiz.id ? 'active' : ''}`}
              onClick={() => setSelectedQuiz(quiz.id)}
            >
              <span className="quiz-tab-title">{quiz.title}</span>
              <span className="quiz-tab-meta">{quiz.category} • {quiz.difficulty}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Quiz Stats */}
      {selectedQuizStats && (
        <div className="quiz-details-card">
          <div className="quiz-stats-header">
            <div className="quiz-stat">
              <span className="quiz-stat-label">Attempts</span>
              <span className="quiz-stat-value">{selectedQuizStats.totalAttempts}</span>
            </div>
            <div className="quiz-stat">
              <span className="quiz-stat-label">Best Score</span>
              <span className="quiz-stat-value" style={{ color: '#10b981' }}>
                {selectedQuizStats.bestScore}%
              </span>
            </div>
            <div className="quiz-stat">
              <span className="quiz-stat-label">Average</span>
              <span className="quiz-stat-value">{selectedQuizStats.averageScore}%</span>
            </div>
            <div className="quiz-stat">
              <span className="quiz-stat-label">Improvement</span>
              <span className="quiz-stat-value" style={{ 
                color: selectedQuizStats.improvement >= 0 ? '#10b981' : '#ef4444' 
              }}>
                {selectedQuizStats.improvement >= 0 ? '+' : ''}{selectedQuizStats.improvement}%
              </span>
            </div>
          </div>

          {/* Score History Chart */}
          <div className="score-history">
            <h4>Score History</h4>
            <div className="chart-container">
              <div className="chart">
                {selectedQuizStats.scoreHistory.map((score, index) => (
                  <div key={index} className="chart-bar-wrapper">
                    <div className="chart-value">{score}%</div>
                    <div 
                      className="chart-bar"
                      style={{ 
                        height: `${(score / 100) * 150}px`,
                        backgroundColor: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                    <div className="chart-label">#{index + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Attempts */}
          <div className="recent-attempts">
            <h4>Recent Attempts</h4>
            <div className="attempts-list">
              {selectedQuizStats.attempts.slice(0, 5).map((attempt, index) => (
                <div key={attempt.id} className="attempt-item">
                  <div className="attempt-rank">#{selectedQuizStats.attempts.length - index}</div>
                  <div className="attempt-details">
                    <div className="attempt-score">
                      {attempt.score}/{attempt.max_score} points ({Math.round((attempt.score / attempt.max_score) * 100)}%)
                    </div>
                    <div className="attempt-meta">
                      {new Date(attempt.completed_at).toLocaleDateString()} • {formatTime(attempt.time_taken)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}