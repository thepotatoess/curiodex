import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import QuizTaking from './QuizTaking'
import QuizResults from './QuizResults'
import '../css/QuizList.css'

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [takingQuiz, setTakingQuiz] = useState(null)
  const [userAttempts, setUserAttempts] = useState([])
  const [quizResults, setQuizResults] = useState(null)

  useEffect(() => {
    loadQuizzes()
    loadUserAttempts()
  }, [])

  const loadQuizzes = async () => {
    try {
      const [quizzesRes, categoriesRes] = await Promise.all([
        supabase
          .from('quizzes')
          .select('*, questions(id), user_quiz_attempts(id)')
          .eq('is_published', true)
          .order('created_at', { ascending: false }),

        supabase
          .from('quiz_categories')
          .select('name, icon, color')
      ])

      if (quizzesRes.error) throw quizzesRes.error
      if (categoriesRes.error) throw categoriesRes.error

      const quizzesData = quizzesRes.data
      const categories = categoriesRes.data

      const quizzesWithCategoryMeta = quizzesData.map(quiz => {
        const cat = categories.find(c => c.name === quiz.category)

        return {
          ...quiz,
          question_count: quiz.questions?.length || 0,
          total_attempts: quiz.user_quiz_attempts?.length || 0,
          category_name: cat?.name || quiz.category,
          category_icon: cat?.icon || '❓',
          category_color: cat?.color || '#6b7280'
        }
      })

      setQuizzes(quizzesWithCategoryMeta)
    } catch (error) {
      console.error('Error loading quizzes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserAttempts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('user_quiz_attempts')
          .select('quiz_id, score, max_score, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })

        if (error) throw error
        setUserAttempts(data || [])
      }
    } catch (error) {
      console.error('Error loading user attempts:', error)
    }
  }

  const startQuiz = (quizId) => {
    setTakingQuiz(quizId)
    setQuizResults(null)
  }

  const finishQuiz = (results = null) => {
    if (results) {
      setQuizResults(results)
    }
    setTakingQuiz(null)
    loadQuizzes()
    loadUserAttempts()
  }

  const handleRetakeQuiz = () => {
    if (quizResults && quizResults.quizId) {
      setQuizResults(null)
      setTakingQuiz(quizResults.quizId)
    }
  }

  const handleBackToQuizzes = () => {
    setQuizResults(null)
  }

  const getUserBestScore = (quizId) => {
    const attempts = userAttempts.filter(attempt => attempt.quiz_id === quizId)
    if (attempts.length === 0) return null

    const bestAttempt = attempts.reduce((best, current) =>
      (current.score / current.max_score) > (best.score / best.max_score) ? current : best
    )

    return {
      score: bestAttempt.score,
      maxScore: bestAttempt.max_score,
      percentage: Math.round((bestAttempt.score / bestAttempt.max_score) * 100),
      attempts: attempts.length
    }
  }

  const groupQuizzesByCategory = () => {
    return quizzes.reduce((acc, quiz) => {
      const category = quiz.category_name
      if (!acc[category]) {
        acc[category] = {
          icon: quiz.category_icon,
          color: quiz.category_color,
          quizzes: []
        }
      }
      acc[category].quizzes.push(quiz)
      return acc
    }, {})
  }

  if (takingQuiz) {
    return (
      <QuizTaking
        quizId={takingQuiz}
        onComplete={finishQuiz}
        onCancel={() => finishQuiz()}
      />
    )
  }

  if (quizResults) {
    return (
      <QuizResults
        {...quizResults}
        onRetake={handleRetakeQuiz}
        onBackToQuizzes={handleBackToQuizzes}
      />
    )
  }

  if (loading) return <div className="quiz-loading">Loading quizzes...</div>

  const grouped = groupQuizzesByCategory()

  return (
    <div className="quiz-list-container">
      <h1 className="quiz-list-title">Available Quizzes</h1>

      {quizzes.length === 0 ? (
        <div className="quiz-empty-state">
          <h3>No quizzes available yet</h3>
          <p>Check back later for new quizzes!</p>
        </div>
      ) : (
        <div className="quiz-grouped-list">
          {Object.entries(grouped).map(([categoryName, { icon, color, quizzes }]) => (
            <div key={categoryName} className="quiz-category-section">
              <h2 className="quiz-category-title" style={{ color }}>
                <span className="category-icon">{icon}</span> {categoryName}
              </h2>
              <div className="quiz-grid">
                {quizzes.map(quiz => {
                  const userBest = getUserBestScore(quiz.id)
                  return (
                    <div key={quiz.id} className="quiz-card">
                      <div className="quiz-card-content">
                        <div className="quiz-info">
                          <h3 className="quiz-title">{quiz.title}</h3>
                          <p className="quiz-description">{quiz.description}</p>

                          <div className="quiz-meta">
                            <span className="quiz-meta-item">
                              <strong>Difficulty:</strong>
                              <span className="quiz-meta-value">{quiz.difficulty}</span>
                            </span>
                            <span className="quiz-meta-item">
                              <strong>Questions:</strong>
                              <span className="quiz-meta-value">{quiz.question_count}</span>
                            </span>
                            <span className="quiz-meta-item">
                              <strong>Times taken:</strong>
                              <span className="quiz-meta-value">{quiz.total_attempts}</span>
                            </span>
                          </div>

                          {userBest && (
                            <div className="user-score-box">
                              <strong>Your Best Score:</strong> {userBest.score}/{userBest.maxScore} ({userBest.percentage}%)
                              | <strong>Attempts:</strong> {userBest.attempts}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => startQuiz(quiz.id)}
                          className="btn btn-primary quiz-action-btn"
                        >
                          {userBest ? 'Play again' : 'Start Quiz'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
