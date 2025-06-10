import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../css/QuizDetailPage.css'

export default function QuizDetailPage() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState(null)
  const [globalStats, setGlobalStats] = useState(null)
  const [similarQuizzes, setSimilarQuizzes] = useState([])
  const [userRanking, setUserRanking] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (quizId) {
      console.log('Loading quiz details for ID:', quizId) // Debug log
      loadQuizDetails()
    }
  }, [quizId])

  const loadQuizDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('Fetching quiz with ID:', quizId) // Debug log
      
      // Load quiz details - first try without is_published filter to debug
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions(id, points)
        `)
        .eq('id', quizId)
        .single()

      console.log('Quiz query result:', { quizData, quizError }) // Debug log

      if (quizError) {
        console.error('Quiz query error:', quizError)
        setError(`Database error: ${quizError.message}`)
        setLoading(false)
        return
      }

      if (!quizData) {
        console.error('No quiz data returned')
        setError('Quiz not found in database')
        setLoading(false)
        return
      }

      // Check if quiz is published
      if (!quizData.is_published) {
        console.error('Quiz is not published:', quizData.is_published)
        setError('This quiz is not currently available')
        setLoading(false)
        return
      }

      // Get the creator's profile separately if needed
      let creatorProfile = null
      if (quizData.created_by) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, email')
          .eq('id', quizData.created_by)
          .single()
        
        creatorProfile = profileData
      }
      
      // Get category metadata
      const { data: categoryData } = await supabase
        .from('quiz_categories')
        .select('icon, color')
        .eq('name', quizData.category)
        .single()

      const quizWithCategory = {
        ...quizData,
        question_count: quizData.questions?.length || 0,
        total_points: quizData.questions?.reduce((sum, q) => sum + q.points, 0) || 0,
        category_icon: categoryData?.icon || '📚',
        category_color: categoryData?.color || '#6b7280',
        creator_profile: creatorProfile
      }

      console.log('Processed quiz data:', quizWithCategory) // Debug log
      setQuiz(quizWithCategory)

      // Load user's attempts for this quiz
      if (user) {
        await loadUserStats(user.id, quizId)
        await loadUserRanking(user.id, quizId)
      }

      // Load global statistics
      await loadGlobalStats(quizId)
      
      // Load similar quizzes
      await loadSimilarQuizzes(quizData.category, quizData.title, quizId)

    } catch (error) {
      console.error('Error loading quiz details:', error)
      setError(`Unexpected error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadUserStats = async (userId, quizId) => {
    try {
      const { data: attempts, error } = await supabase
        .from('user_quiz_attempts')
        .select('score, max_score, time_taken, completed_at')
        .eq('user_id', userId)
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false })

      if (error) throw error

      if (attempts && attempts.length > 0) {
        const scores = attempts.map(a => Math.round((a.score / a.max_score) * 100))
        const bestAttempt = attempts.reduce((best, current) =>
          (current.score / current.max_score) > (best.score / best.max_score) ? current : best
        )

        setUserStats({
          totalAttempts: attempts.length,
          bestScore: bestAttempt.score,
          bestMaxScore: bestAttempt.max_score,
          bestPercentage: Math.round((bestAttempt.score / bestAttempt.max_score) * 100),
          averagePercentage: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          bestTime: Math.min(...attempts.map(a => a.time_taken)),
          averageTime: Math.round(attempts.reduce((sum, a) => sum + a.time_taken, 0) / attempts.length),
          lastPlayed: attempts[0].completed_at,
          improvement: scores.length > 1 ? scores[0] - scores[scores.length - 1] : 0,
          recentScores: scores.slice(0, 5)
        })
      }
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  const loadGlobalStats = async (quizId) => {
    try {
      const { data: allAttempts, error } = await supabase
        .from('user_quiz_attempts')
        .select('score, max_score, time_taken, user_id')
        .eq('quiz_id', quizId)

      if (error) throw error

      if (allAttempts && allAttempts.length > 0) {
        const percentages = allAttempts.map(a => Math.round((a.score / a.max_score) * 100))
        const uniqueUsers = new Set(allAttempts.map(a => a.user_id)).size
        
        // Calculate statistics
        const totalAttempts = allAttempts.length
        const averageScore = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
        const highestScore = Math.max(...percentages)
        const lowestScore = Math.min(...percentages)
        
        // Score distribution
        const distribution = {
          excellent: percentages.filter(s => s >= 90).length,
          good: percentages.filter(s => s >= 80 && s < 90).length,
          fair: percentages.filter(s => s >= 70 && s < 80).length,
          poor: percentages.filter(s => s < 70).length
        }

        // Average completion time
        const avgTime = Math.round(allAttempts.reduce((sum, a) => sum + a.time_taken, 0) / allAttempts.length)

        setGlobalStats({
          totalAttempts,
          uniqueUsers,
          averageScore,
          highestScore,
          lowestScore,
          averageTime: avgTime,
          distribution,
          completionRate: Math.round((uniqueUsers / totalAttempts) * 100)
        })
      }
    } catch (error) {
      console.error('Error loading global stats:', error)
    }
  }

  const loadUserRanking = async (userId, quizId) => {
    try {
      // Get all users' best scores for this quiz
      const { data: allBestScores, error } = await supabase
        .from('user_quiz_attempts')
        .select('user_id, score, max_score')
        .eq('quiz_id', quizId)

      if (error) throw error

      if (allBestScores && allBestScores.length > 0) {
        // Group by user and get best score for each
        const userBestScores = {}
        allBestScores.forEach(attempt => {
          const percentage = (attempt.score / attempt.max_score) * 100
          if (!userBestScores[attempt.user_id] || percentage > userBestScores[attempt.user_id]) {
            userBestScores[attempt.user_id] = percentage
          }
        })

        const sortedScores = Object.values(userBestScores).sort((a, b) => b - a)
        const userScore = userBestScores[userId]
        
        if (userScore !== undefined) {
          const userRank = sortedScores.indexOf(userScore) + 1
          const totalUsers = Object.keys(userBestScores).length
          const percentile = Math.round(((totalUsers - userRank + 1) / totalUsers) * 100)

          setUserRanking({
            rank: userRank,
            totalUsers,
            percentile,
            score: userScore
          })
        }
      }
    } catch (error) {
      console.error('Error loading user ranking:', error)
    }
  }

  const loadSimilarQuizzes = async (category, title, currentQuizId) => {
    try {
      // Find quizzes in the same category
      const { data: categoryQuizzes, error: categoryError } = await supabase
        .from('quizzes')
        .select(`
          id, title, description, difficulty,
          questions(id),
          user_quiz_attempts(id)
        `)
        .eq('category', category)
        .eq('is_published', true)
        .neq('id', currentQuizId)
        .limit(5)

      if (categoryError) throw categoryError

      // Find quizzes with similar titles (containing common words)
      const titleWords = title.toLowerCase().split(' ').filter(word => 
        word.length > 3 && !['quiz', 'test', 'the', 'and', 'for', 'with'].includes(word)
      )

      let similarTitleQuizzes = []
      if (titleWords.length > 0) {
        // This is a simplified search - in production you'd want better text search
        const { data: titleQuizzes, error: titleError } = await supabase
          .from('quizzes')
          .select(`
            id, title, description, category, difficulty,
            questions(id),
            user_quiz_attempts(id)
          `)
          .neq('id', currentQuizId)
          .eq('is_published', true)
          .limit(10)

        if (!titleError && titleQuizzes) {
          similarTitleQuizzes = titleQuizzes.filter(quiz => {
            const quizTitle = quiz.title.toLowerCase()
            return titleWords.some(word => quizTitle.includes(word))
          }).slice(0, 3)
        }
      }

      // Combine and deduplicate
      const allSimilar = [...(categoryQuizzes || []), ...similarTitleQuizzes]
      const uniqueSimilar = allSimilar.filter((quiz, index, self) => 
        index === self.findIndex(q => q.id === quiz.id)
      ).slice(0, 6)

      // Add metadata
      const similarWithMeta = uniqueSimilar.map(quiz => ({
        ...quiz,
        question_count: quiz.questions?.length || 0,
        play_count: quiz.user_quiz_attempts?.length || 0,
        similarity_reason: categoryQuizzes?.some(cq => cq.id === quiz.id) ? 'Same Category' : 'Similar Topic'
      }))

      setSimilarQuizzes(similarWithMeta)

    } catch (error) {
      console.error('Error loading similar quizzes:', error)
    }
  }

  const startQuiz = () => {
    navigate(`/quiz/${quizId}/play`)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPerformanceLevel = (percentage) => {
    if (percentage >= 90) return { label: 'Expert', color: '#10b981', icon: '🏆' }
    if (percentage >= 80) return { label: 'Advanced', color: '#3b82f6', icon: '⭐' }
    if (percentage >= 70) return { label: 'Proficient', color: '#8b5cf6', icon: '👍' }
    if (percentage >= 60) return { label: 'Developing', color: '#f59e0b', icon: '📈' }
    return { label: 'Beginner', color: '#ef4444', icon: '📚' }
  }

  if (loading) return <div className="quiz-detail-loading">Loading quiz details...</div>

  if (error) {
    return (
      <div className="quiz-detail-not-found">
        <h2>Error Loading Quiz</h2>
        <p>{error}</p>
        <p>Quiz ID: {quizId}</p>
        <button onClick={() => navigate('/quizzes')} className="btn btn-primary">
          Back to Quizzes
        </button>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="quiz-detail-not-found">
        <h2>Quiz not found</h2>
        <p>The quiz you're looking for doesn't exist or has been removed.</p>
        <p>Quiz ID: {quizId}</p>
        <button onClick={() => navigate('/quizzes')} className="btn btn-primary">
          Back to Quizzes
        </button>
      </div>
    )
  }

  const userPerformance = userStats ? getPerformanceLevel(userStats.bestPercentage) : null

  return (
    <div className="quiz-detail-container">
      {/* Header Section */}
      <div className="quiz-detail-header">
        <button 
          onClick={() => navigate('/quizzes')} 
          className="back-button"
        >
          ← Back to Quizzes
        </button>
        
        <div className="quiz-header-content">
          <div className="quiz-title-section">
            <div className="category-badge" style={{ backgroundColor: quiz.category_color }}>
              <span className="category-icon">{quiz.category_icon}</span>
              {quiz.category}
            </div>
            <h1 className="quiz-title">{quiz.title}</h1>
            <p className="quiz-description">{quiz.description}</p>
          </div>

          <div className="quiz-meta-grid">
            <div className="meta-item">
              <span className="meta-label">Difficulty</span>
              <span className={`meta-value difficulty-${quiz.difficulty}`}>
                {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Questions</span>
              <span className="meta-value">{quiz.question_count}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Total Points</span>
              <span className="meta-value">{quiz.total_points}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Created by</span>
              <span className="meta-value">{quiz.creator_profile?.username || 'Admin'}</span>
            </div>
          </div>

          <button onClick={startQuiz} className="btn btn-primary btn-large start-quiz-btn">
            {userStats ? 'Take Quiz Again' : 'Start Quiz'}
          </button>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="quiz-stats-section">
        <div className="stats-grid">
          {/* User Statistics */}
          {userStats && (
            <div className="stats-card user-stats">
              <h3>Your Performance</h3>
              <div className="performance-header">
                <div className="performance-badge" style={{ backgroundColor: userPerformance.color }}>
                  {userPerformance.icon} {userPerformance.label}
                </div>
                <div className="best-score">
                  {userStats.bestPercentage}%
                </div>
              </div>
              
              <div className="user-stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{userStats.totalAttempts}</span>
                  <span className="stat-label">Attempts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{userStats.averagePercentage}%</span>
                  <span className="stat-label">Average</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{formatTime(userStats.bestTime)}</span>
                  <span className="stat-label">Best Time</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value" style={{ 
                    color: userStats.improvement >= 0 ? '#10b981' : '#ef4444' 
                  }}>
                    {userStats.improvement >= 0 ? '+' : ''}{userStats.improvement}%
                  </span>
                  <span className="stat-label">Improvement</span>
                </div>
              </div>

              {userRanking && (
                <div className="ranking-info">
                  <div className="ranking-badge">
                    <strong>#{userRanking.rank}</strong> of {userRanking.totalUsers} players
                  </div>
                  <div className="percentile-info">
                    Top {100 - userRanking.percentile}% of all players
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Global Statistics */}
          {globalStats && (
            <div className="stats-card global-stats">
              <h3>Global Statistics</h3>
              
              <div className="global-stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{globalStats.totalAttempts}</span>
                  <span className="stat-label">Total Attempts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{globalStats.uniqueUsers}</span>
                  <span className="stat-label">Players</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{globalStats.averageScore}%</span>
                  <span className="stat-label">Average Score</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{formatTime(globalStats.averageTime)}</span>
                  <span className="stat-label">Avg. Time</span>
                </div>
              </div>

              <div className="score-distribution">
                <h4>Score Distribution</h4>
                <div className="distribution-bars">
                  <div className="distribution-bar">
                    <span className="bar-label">90-100%</span>
                    <div className="bar-container">
                      <div 
                        className="bar-fill excellent" 
                        style={{ width: `${(globalStats.distribution.excellent / globalStats.totalAttempts) * 100}%` }}
                      />
                    </div>
                    <span className="bar-count">{globalStats.distribution.excellent}</span>
                  </div>
                  <div className="distribution-bar">
                    <span className="bar-label">80-89%</span>
                    <div className="bar-container">
                      <div 
                        className="bar-fill good" 
                        style={{ width: `${(globalStats.distribution.good / globalStats.totalAttempts) * 100}%` }}
                      />
                    </div>
                    <span className="bar-count">{globalStats.distribution.good}</span>
                  </div>
                  <div className="distribution-bar">
                    <span className="bar-label">70-79%</span>
                    <div className="bar-container">
                      <div 
                        className="bar-fill fair" 
                        style={{ width: `${(globalStats.distribution.fair / globalStats.totalAttempts) * 100}%` }}
                      />
                    </div>
                    <span className="bar-count">{globalStats.distribution.fair}</span>
                  </div>
                  <div className="distribution-bar">
                    <span className="bar-label">0-69%</span>
                    <div className="bar-container">
                      <div 
                        className="bar-fill poor" 
                        style={{ width: `${(globalStats.distribution.poor / globalStats.totalAttempts) * 100}%` }}
                      />
                    </div>
                    <span className="bar-count">{globalStats.distribution.poor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Similar Quizzes Section */}
      {similarQuizzes.length > 0 && (
        <div className="similar-quizzes-section">
          <h3>You Might Also Like</h3>
          <div className="similar-quizzes-grid">
            {similarQuizzes.map(similarQuiz => (
              <div 
                key={similarQuiz.id} 
                className="similar-quiz-card"
                onClick={() => navigate(`/quiz/${similarQuiz.id}`)}
              >
                <div className="similar-quiz-header">
                  <h4 className="similar-quiz-title">{similarQuiz.title}</h4>
                  <span className="similarity-reason">{similarQuiz.similarity_reason}</span>
                </div>
                <p className="similar-quiz-description">{similarQuiz.description}</p>
                <div className="similar-quiz-meta">
                  <span className="quiz-difficulty">{similarQuiz.difficulty}</span>
                  <span className="quiz-questions">{similarQuiz.question_count} questions</span>
                  <span className="quiz-plays">{similarQuiz.play_count} plays</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="quiz-cta-section">
        <div className="cta-content">
          <h3>Ready to Test Your Knowledge?</h3>
          <p>
            {userStats 
              ? `Your best score is ${userStats.bestPercentage}%. Think you can do better?`
              : `Join ${globalStats?.uniqueUsers || 0} other players who have taken this quiz!`
            }
          </p>
          <button onClick={startQuiz} className="btn btn-primary btn-large">
            {userStats ? 'Improve Your Score' : 'Take the Quiz'}
          </button>
        </div>
      </div>
    </div>
  )
}