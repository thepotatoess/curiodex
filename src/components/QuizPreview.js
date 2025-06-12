import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ConfirmModal } from './ConfirmModal'
import '../css/QuizPreview.css'
import QuizComments from './QuizComments'

export default function QuizPreview() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quizStats, setQuizStats] = useState(null)
  const [userStats, setUserStats] = useState(null)
  
  // Preview states
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0)
  const [showQuizPreview, setShowQuizPreview] = useState(false)
  
  // Quiz taking states
  const [gameMode, setGameMode] = useState('preview') // 'preview', 'taking', 'completed'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [results, setResults] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [previousBest, setPreviousBest] = useState(null)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  
  const timerRef = useRef(null)

  useEffect(() => {
    if (quizId) {
      loadQuizData()
    }
  }, [quizId])

  // Timer effect for quiz taking
  useEffect(() => {
    if (gameMode === 'taking' && isTimerActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }

    return () => clearInterval(timerRef.current)
  }, [gameMode, isTimerActive, timeRemaining, currentQuestionIndex])

  // Start timer when question changes during quiz
  useEffect(() => {
    if (gameMode === 'taking' && questions[currentQuestionIndex] && !answers[questions[currentQuestionIndex]?.id]) {
      const currentQuestion = questions[currentQuestionIndex]
      setTimeRemaining(currentQuestion.time_limit_seconds || 30)
      setIsTimerActive(true)
    }
  }, [currentQuestionIndex, gameMode])

  const loadQuizData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Load quiz details
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .eq('is_published', true)
        .single()

      if (quizError) {
        setError('Quiz not found or not available')
        setLoading(false)
        return
      }

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index')

      if (questionsError) throw questionsError

      // Parse questions
      const parsedQuestions = questionsData.map(q => ({
        ...q,
        options: JSON.parse(q.options || '[]'),
        time_limit_seconds: q.time_limit_seconds || 30
      }))

      // Get category info
      const { data: categoryData } = await supabase
        .from('quiz_categories')
        .select('icon, color')
        .eq('name', quizData.category)
        .single()

      // Load quiz statistics
      await loadQuizStats(quizId)
      
      // Load user statistics if logged in
      if (user) {
        await loadUserStats(user.id, quizId)
      }

      setQuiz({
        ...quizData,
        category_icon: categoryData?.icon || '📚',
        category_color: categoryData?.color || '#6b7280',
        question_count: parsedQuestions.length,
        total_points: parsedQuestions.reduce((sum, q) => sum + q.points, 0),
        estimated_time: Math.ceil(parsedQuestions.reduce((sum, q) => sum + (q.time_limit_seconds || 30), 0) / 60)
      })
      
      setQuestions(parsedQuestions)

    } catch (error) {
      console.error('Error loading quiz data:', error)
      setError('Failed to load quiz data')
    } finally {
      setLoading(false)
    }
  }

  const loadQuizStats = async (quizId) => {
    try {
      const { data: attempts, error } = await supabase
        .from('user_quiz_attempts')
        .select('score, max_score, time_taken, user_id')
        .eq('quiz_id', quizId)

      if (error) throw error

      if (attempts && attempts.length > 0) {
        const percentages = attempts.map(a => Math.round((a.score / a.max_score) * 100))
        const uniqueUsers = new Set(attempts.map(a => a.user_id)).size
        
        setQuizStats({
          totalAttempts: attempts.length,
          uniquePlayers: uniqueUsers,
          averageScore: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
          highestScore: Math.max(...percentages),
          averageTime: Math.round(attempts.reduce((sum, a) => sum + a.time_taken, 0) / attempts.length),
          completionRate: Math.round((uniqueUsers / attempts.length) * 100)
        })
      } else {
        setQuizStats({
          totalAttempts: 0,
          uniquePlayers: 0,
          averageScore: 0,
          highestScore: 0,
          averageTime: 0,
          completionRate: 0
        })
      }
    } catch (error) {
      console.error('Error loading quiz stats:', error)
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

        const improvement = scores.length > 1 ? scores[0] - scores[scores.length - 1] : 0

        setUserStats({
          totalAttempts: attempts.length,
          bestScore: bestAttempt.score,
          bestMaxScore: bestAttempt.max_score,
          bestPercentage: Math.round((bestAttempt.score / bestAttempt.max_score) * 100),
          averagePercentage: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          bestTime: Math.min(...attempts.map(a => a.time_taken)),
          lastPlayed: attempts[0].completed_at,
          improvement,
          streak: calculateStreak(scores)
        })

        setPreviousBest({
          score: bestAttempt.score,
          maxScore: bestAttempt.max_score,
          percentage: Math.round((bestAttempt.score / bestAttempt.max_score) * 100)
        })
      }
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  const calculateStreak = (scores) => {
    let currentStreak = 0
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] >= 80) {
        currentStreak++
      } else {
        break
      }
    }
    return currentStreak
  }

  // Quiz taking functions
  const handleStartQuiz = () => {
    setGameMode('taking')
    setCurrentQuestionIndex(0)
    setAnswers({})
    setStartTime(Date.now())
    const firstQuestion = questions[0]
    setTimeRemaining(firstQuestion?.time_limit_seconds || 30)
    setIsTimerActive(true)
  }

  const handleShowPreview = () => {
    setShowQuizPreview(true)
  }

  const handleHidePreview = () => {
    setShowQuizPreview(false)
  }

  const handleAnswer = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    })
    setIsTimerActive(false)
  }

  const handleTimeUp = () => {
    setIsTimerActive(false)
    
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        nextQuestion()
      }, 1000)
    } else {
      setTimeout(() => {
        submitQuiz()
      }, 1000)
    }
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setIsTimerActive(true)
    }
  }

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setIsTimerActive(false)
    }
  }

  const submitQuiz = async () => {
    setIsTimerActive(false)
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      let score = 0
      let maxScore = 0

      questions.forEach(question => {
        maxScore += question.points
        if (answers[question.id] === question.correct_answer) {
          score += question.points
        }
      })

      const timeTaken = Math.floor((Date.now() - startTime) / 1000)

      const { error } = await supabase
        .from('user_quiz_attempts')
        .insert({
          user_id: user.id,
          quiz_id: quizId,
          score,
          max_score: maxScore,
          time_taken: timeTaken,
          completed_at: new Date().toISOString()
        })

      if (error) throw error

      const currentPercentage = Math.round((score / maxScore) * 100)
      if (!previousBest || currentPercentage > previousBest.percentage) {
        setIsNewRecord(true)
      }

      setResults({
        score,
        maxScore,
        timeTaken,
        percentage: currentPercentage,
        questions,
        userAnswers: answers,
        isNewRecord,
        previousBest
      })
      
      setGameMode('completed')

      // Reload stats
      loadQuizStats(quizId)
      if (user) {
        loadUserStats(user.id, quizId)
      }

    } catch (error) {
      console.error('Error submitting quiz:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetakeQuiz = () => {
    setGameMode('preview')
    setCurrentQuestionIndex(0)
    setAnswers({})
    setResults(null)
    setIsNewRecord(false)
    setTimeRemaining(0)
    setIsTimerActive(false)
    setShowQuizPreview(false)
  }

  const handleCancelQuiz = () => {
    setShowCancelConfirm(true)
    setIsTimerActive(false)
  }

  const confirmCancelQuiz = () => {
    setShowCancelConfirm(false)
    handleRetakeQuiz()
  }

  const cancelCancelQuiz = () => {
    setShowCancelConfirm(false)
    setIsTimerActive(true) // Resume timer
  }

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getDifficultyIcon = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '🟢'
      case 'medium': return '🟡'
      case 'hard': return '🔴'
      default: return '⚪'
    }
  }

  const getPerformanceLevel = (percentage) => {
    if (percentage >= 90) return { level: 'Expert', color: '#10b981', icon: '🏆' }
    if (percentage >= 80) return { level: 'Advanced', color: '#3b82f6', icon: '⭐' }
    if (percentage >= 70) return { level: 'Proficient', color: '#8b5cf6', icon: '👍' }
    if (percentage >= 60) return { level: 'Developing', color: '#f59e0b', icon: '📈' }
    return { level: 'Beginner', color: '#ef4444', icon: '📚' }
  }

  const getTimerColor = () => {
    const total = questions[currentQuestionIndex]?.time_limit_seconds || 30
    const percentage = (timeRemaining / total) * 100
    
    if (percentage > 50) return '#10b981'
    if (percentage > 25) return '#f59e0b'
    return '#ef4444'
  }

  if (loading) {
    return (
      <div className="quiz-preview-modern">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading quiz preview...</p>
        </div>
      </div>
    )
  }

  if (error || !quiz || questions.length === 0) {
    return (
      <div className="quiz-preview-modern">
        <div className="error-state">
          <div className="error-icon">❌</div>
          <h2>Quiz Not Available</h2>
          <p>{error || 'The quiz you\'re looking for doesn\'t exist or has no questions.'}</p>
          <button onClick={() => navigate('/quizzes')} className="btn-primary">
            Browse Other Quizzes
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[gameMode === 'taking' ? currentQuestionIndex : previewQuestionIndex]
  const userPerformance = userStats ? getPerformanceLevel(userStats.bestPercentage) : null

  // Quiz Taking Mode
  if (gameMode === 'taking') {
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100
    const isAnswered = answers[currentQuestion?.id] !== undefined

    return (
      <div className="quiz-preview-modern quiz-taking-mode">
        <div className="quiz-taking-container">
          {/* Quiz Header */}
          <div className="quiz-header">
            <h1>{quiz.title}</h1>
            <div className="quiz-info-bar">
              <span className="quiz-progress-text">Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span className="quiz-metadata">Category: {quiz.category} | Difficulty: {quiz.difficulty}</span>
            </div>
            <div className="quiz-progress-bar">
              <div className="quiz-progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          {/* Question Card */}
          <div className="question-card">
            {/* Timer in top-right corner of question card */}
            {isTimerActive && (
              <div 
                className={`timer-display-inline ${timeRemaining <= 10 ? 'urgent' : ''}`}
                style={{ color: getTimerColor() }}
              >
                <span className="timer-icon">⏱️</span>
                <span>{formatTime(timeRemaining)}</span>
              </div>
            )}

            <h3 className="question-text">{currentQuestion.question_text}</h3>
            
            <div className="answer-options">
              {currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === option
                const isCorrect = option === currentQuestion.correct_answer
                const showFeedback = answers[currentQuestion.id] !== undefined
                
                let optionClass = 'answer-option'
                if (showFeedback) {
                  if (isCorrect) {
                    optionClass += ' correct'
                  } else if (isSelected) {
                    optionClass += ' incorrect'
                  } else {
                    optionClass += ' disabled'
                  }
                } else if (isSelected) {
                  optionClass += ' selected'
                }
                
                return (
                  <label key={index} className={optionClass}>
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={isSelected}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                      disabled={showFeedback || timeRemaining === 0}
                      className="answer-radio"
                    />
                    <span className="answer-text">
                      {String.fromCharCode(65 + index)}: {option}
                    </span>
                    {showFeedback && isCorrect && (
                      <span className="answer-feedback correct">✓</span>
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <span className="answer-feedback incorrect">✗</span>
                    )}
                  </label>
                )
              })}
            </div>

            {isAnswered && currentQuestion.explanation && (
              <div className="question-explanation">
                <h4>Explanation:</h4>
                <p>{currentQuestion.explanation}</p>
              </div>
            )}

            <div className="question-points">
              Points: {currentQuestion.points} | Time Limit: {currentQuestion.time_limit_seconds}s
            </div>

            {timeRemaining === 0 && !isAnswered && (
              <div className="time-up-message">
                ⏰ Time's up! Moving to next question...
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="quiz-navigation">
            <div className="nav-buttons-left">
              <button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className="nav-btn nav-btn-prev"
              >
                Previous
              </button>
            </div>

            <div className="nav-buttons-right">
              <button
                onClick={handleCancelQuiz}
                className="nav-btn nav-btn-cancel"
              >
                Cancel Quiz
              </button>

              {currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={submitQuiz}
                  disabled={submitting}
                  className="nav-btn nav-btn-submit"
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  disabled={!answers[currentQuestion.id] && timeRemaining > 0}
                  className="nav-btn nav-btn-next"
                >
                  Next
                </button>
              )}
            </div>
          </div>

          <div className="quiz-progress-indicator">
            Answered: {Object.keys(answers).length} / {questions.length} questions
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        <ConfirmModal
          isOpen={showCancelConfirm}
          title="Cancel Quiz?"
          message={
            <div>
              <p>Are you sure you want to cancel this quiz?</p>
              <p style={{ color: '#dc3545', fontWeight: 'bold', margin: '8px 0 0 0' }}>
                ⚠️ Your progress will be lost and won't be saved.
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                You've answered {Object.keys(answers).length} of {questions.length} questions.
              </p>
            </div>
          }
          onConfirm={confirmCancelQuiz}
          onCancel={cancelCancelQuiz}
          confirmText="Cancel Quiz"
          cancelText="Continue Quiz"
          danger={true}
        />
      </div>
    )
  }

  // Results Mode
  if (gameMode === 'completed' && results) {
    const performance = getPerformanceLevel(results.percentage)
    
    return (
      <div className="quiz-preview-modern">
        <div className="results-container">
          <div className={`results-card ${performance.level.toLowerCase()}`}>
            {isNewRecord && (
              <div className="new-record-badge">
                🏆 NEW PERSONAL BEST! 🏆
              </div>
            )}

            <div className="results-emoji">{performance.icon}</div>
            <h1 className="results-title">{performance.level} Performance!</h1>
            <div className="results-score">{results.percentage}%</div>
            <div className="results-points">
              {results.score} out of {results.maxScore} points
            </div>
            
            {previousBest && !isNewRecord && (
              <div className="previous-best">
                Previous best: {previousBest.percentage}%
              </div>
            )}
          </div>

          <div className="results-actions">
            <button onClick={handleRetakeQuiz} className="btn-start-quiz-green">
              <span>🔄</span>
              <span>Play Again</span>
            </button>
            <button onClick={() => navigate('/quizzes')} className="btn-secondary">
              <span>📋</span>
              <span>Back to Quizzes</span>
            </button>
            <button onClick={() => navigate(`/quiz/${quizId}`)} className="btn-secondary">
              <span>📋</span>
              <span>View Statistics</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Preview Mode (Default)
  return (
    <div className="quiz-preview-modern">
      {/* Navigation */}
      <div className="preview-nav">
        <button 
          onClick={() => navigate(`/quiz/${quizId}`)} 
          className="nav-back"
        >
          ← Quiz Details
        </button>
        <div className="nav-breadcrumb">
          <span className="breadcrumb-item">Quizzes</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item">{quiz.category}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Preview</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="preview-grid">
        {/* Left Column - Quiz Info & Preview */}
        <div className="preview-main">
          {/* Quiz Header */}
          <div className="quiz-header-card">
            <div className="quiz-header-top">
              <div className="quiz-category" style={{ backgroundColor: quiz.category_color }}>
                <span className="category-icon">{quiz.category_icon}</span>
                <span className="category-name">{quiz.category}</span>
              </div>
              <div className="quiz-difficulty">
                <span className="difficulty-icon">{getDifficultyIcon(quiz.difficulty)}</span>
                <span className="difficulty-text">{quiz.difficulty}</span>
              </div>
            </div>
            
            <h1 className="quiz-title">{quiz.title}</h1>
            <p className="quiz-description">{quiz.description}</p>
            
            <div className="quiz-meta-row">
              <div className="meta-item">
                <span className="meta-icon">❓</span>
                <span>{quiz.question_count} Questions</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon">⏱️</span>
                <span>~{quiz.estimated_time} min</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon">🎯</span>
                <span>{quiz.total_points} Points</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon">👥</span>
                <span>{quizStats?.uniquePlayers || 0} Players</span>
              </div>
            </div>
          </div>

          {/* Question Preview */}
          <div className="question-preview-section">
            <div className="section-header">
              <h2>Question Preview</h2>
              {showQuizPreview && (
                <div className="question-nav">
                  <button 
                    onClick={() => setPreviewQuestionIndex(Math.max(0, previewQuestionIndex - 1))}
                    disabled={previewQuestionIndex === 0}
                    className="question-nav-btn"
                  >
                    ←
                  </button>
                  <span className="question-counter">
                    {previewQuestionIndex + 1} of {questions.length}
                  </span>
                  <button 
                    onClick={() => setPreviewQuestionIndex(Math.min(questions.length - 1, previewQuestionIndex + 1))}
                    disabled={previewQuestionIndex === questions.length - 1}
                    className="question-nav-btn"
                  >
                    →
                  </button>
                </div>
              )}
            </div>

            <div className={`question-card-preview ${!showQuizPreview ? 'blurred' : ''}`}>
              <div className="question-header">
                <div className="question-number">Q{previewQuestionIndex + 1}</div>
                <div className="question-timer">
                  <span>⏱️</span>
                  <span>{formatTime(currentQuestion.time_limit_seconds)}</span>
                </div>
              </div>

              <h3 className="question-text">{currentQuestion.question_text}</h3>

              <div className="answer-options">
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="answer-option-preview">
                    <div className="option-letter">{String.fromCharCode(65 + index)}</div>
                    <div className="option-text">{option}</div>
                  </div>
                ))}
              </div>

              <div className="question-meta">
                <span className="points-indicator">
                  <span>🏆</span>
                  <span>{currentQuestion.points} points</span>
                </span>
              </div>

              {/* Blur Overlay */}
              {!showQuizPreview && (
                <div className="preview-overlay">
                  <div className="preview-overlay-content">
                    <h3 className="preview-overlay-title">Ready to Test Your Knowledge?</h3>
                    <p className="preview-overlay-text">
                      {userStats 
                        ? `Your best score is ${userStats.bestPercentage}%. Ready to improve it?`
                        : `${quiz.question_count} questions • ${quiz.estimated_time} minutes • ${quiz.total_points} points`
                      }
                    </p>
                    
                    <div className="overlay-buttons">
                      <button onClick={handleStartQuiz} className="btn-start-quiz-green">
                        <span className="btn-icon">🎯</span>
                        <span>{userStats ? 'Start Quiz Again' : 'Start Quiz Now'}</span>
                      </button>
                      
                      <button onClick={handleShowPreview} className="btn-preview-questions">
                        <span className="btn-icon">👀</span>
                        <span>Preview Questions First</span>
                      </button>
                    </div>

                    {userStats && (
                      <div className="quick-stats">
                        <div className="quick-stat">
                          <span className="stat-value">{userStats.totalAttempts}</span>
                          <span className="stat-label">attempts</span>
                        </div>
                        <div className="quick-stat">
                          <span className="stat-value">{userStats.bestPercentage}%</span>
                          <span className="stat-label">best score</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Show action bar when in preview mode */}
            {showQuizPreview && (
              <div className="preview-action-bar">
                <button onClick={handleHidePreview} className="btn-hide-preview">
                  Hide Preview
                </button>
                <button onClick={handleStartQuiz} className="btn-start-quiz-green">
                  <span>🚀</span>
                  <span>Start Real Quiz</span>
                </button>
              </div>
            )}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <QuizComments 
              quizId={quizId} 
              quizTitle={quiz.title}
            />
          </div>
        </div>

        {/* Right Column - Stats & Actions */}
        <div className="preview-sidebar">
          {/* Your Performance */}
          {userStats && (
            <div className="stats-card user-stats">
              <div className="stats-header">
                <h3>Your Performance</h3>
                <div className="performance-badge" style={{ backgroundColor: userPerformance.color }}>
                  <span>{userPerformance.icon}</span>
                  <span>{userPerformance.level}</span>
                </div>
              </div>
              
              <div className="stats-grid">
                <div className="stat-item highlight">
                  <div className="stat-value">{userStats.bestPercentage}%</div>
                  <div className="stat-label">Best Score</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userStats.totalAttempts}</div>
                  <div className="stat-label">Attempts</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userStats.averagePercentage}%</div>
                  <div className="stat-label">Average</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{userStats.streak}</div>
                  <div className="stat-label">Current Streak</div>
                </div>
              </div>

              {userStats.improvement !== 0 && (
                <div className="improvement-indicator">
                  <span className={`improvement-icon ${userStats.improvement > 0 ? 'positive' : 'negative'}`}>
                    {userStats.improvement > 0 ? '📈' : '📉'}
                  </span>
                  <span className="improvement-text">
                    {userStats.improvement > 0 ? '+' : ''}{userStats.improvement}% from first attempt
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quiz Statistics */}
          <div className="stats-card global-stats">
            <div className="stats-header">
              <h3>Quiz Statistics</h3>
            </div>
            
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{quizStats?.uniquePlayers || 0}</div>
                <div className="stat-label">Total Players</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{quizStats?.averageScore || 0}%</div>
                <div className="stat-label">Average Score</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{quizStats?.highestScore || 0}%</div>
                <div className="stat-label">Highest Score</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{quizStats?.completionRate || 0}%</div>
                <div className="stat-label">Completion Rate</div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="tips-card">
            <h3>💡 Quick Tips</h3>
            <ul className="tips-list">
              <li>Read each question carefully</li>
              <li>Watch the timer for each question</li>
              <li>You can't go back once you proceed</li>
              <li>Complete all questions for your final score</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="action-section">
            <button onClick={handleStartQuiz} className="btn-start-quiz">
              <span className="btn-icon">🚀</span>
              <span>{userStats ? 'Try Again' : 'Start Quiz'}</span>
            </button>
            
            <button 
              onClick={() => navigate(`/quiz/${quizId}`)} 
              className="btn-secondary"
            >
              View Full Details
            </button>
          </div>

          {/* Future Features Placeholder */}
          <div className="future-features">
            <div className="feature-coming-soon">
              <span className="feature-icon">📚</span>
              <div className="feature-text">
                <div className="feature-title">Study Materials</div>
                <div className="feature-subtitle">Coming Soon</div>
              </div>
            </div>
            
            <div className="feature-coming-soon">
              <span className="feature-icon">🎓</span>
              <div className="feature-text">
                <div className="feature-title">Learning Path</div>
                <div className="feature-subtitle">Coming Soon</div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
}