import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import QuizRenderer from './quiz-types/QuizRenderer'
import '../css/QuizPreview.css'

export default function QuizPreview() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const timerRef = useRef(null)

  // Basic state
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Quiz modes
  const [gameMode, setGameMode] = useState('preview') // 'preview', 'taking', 'completed'
  const [showQuizPreview, setShowQuizPreview] = useState(false)

  // Quiz taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [questionStates, setQuestionStates] = useState({})
  const [canProceed, setCanProceed] = useState(false)

  // Results and stats
  const [results, setResults] = useState(null)
  const [userStats, setUserStats] = useState(null)
  const [quizStats, setQuizStats] = useState(null)
  const [previousBest, setPreviousBest] = useState(null)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // UI state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Load quiz data on mount
  useEffect(() => {
    if (quizId) {
      loadQuizData()
    }
  }, [quizId])

  // Timer effect for quiz taking
  useEffect(() => {
    if (gameMode === 'taking' && isTimerActive && timeRemaining > 0) {
      const currentQuestion = questions[currentQuestionIndex]
      const currentState = questionStates[currentQuestion?.id]
      
      // Only run timer if question is in 'active' state
      if (currentState === 'active') {
        timerRef.current = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              handleTimeUp()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } else {
      clearInterval(timerRef.current)
    }

    return () => clearInterval(timerRef.current)
  }, [gameMode, isTimerActive, timeRemaining, currentQuestionIndex, questionStates])

  // Start timer when question changes during quiz
  useEffect(() => {
    if (gameMode === 'taking' && questions[currentQuestionIndex]) {
      const currentQuestion = questions[currentQuestionIndex]
      const currentState = questionStates[currentQuestion.id]
      
      // Only start timer for 'active' questions that haven't been answered
      if (currentState === 'active' && !answers[currentQuestion.id]) {
        setTimeRemaining(currentQuestion.time_limit_seconds || 30)
        setIsTimerActive(true)
        setCanProceed(false)
      } else {
        setIsTimerActive(false)
        // Set canProceed based on question state
        setCanProceed(currentState === 'answered' || currentState === 'expired')
      }
    }
  }, [currentQuestionIndex, gameMode, questionStates, answers])

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

      if (quizError) throw quizError
      if (!quizData) throw new Error('Quiz not found')

      // Load questions with proper handling for different question types
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index')

      if (questionsError) throw questionsError

      // Process questions to handle different types
      const processedQuestions = questionsData.map(question => {
        const processed = { ...question }

        // Parse options for multiple choice questions
        if (question.question_type === 'multiple_choice') {
          processed.options = JSON.parse(question.options || '[]')
        }

        // Parse map_data for map click questions
        if (question.question_type === 'map_click') {
          processed.map_data = JSON.parse(question.map_data || '{}')
        }

        return processed
      })

      setQuiz(quizData)
      setQuestions(processedQuestions)
      
      // Load stats
      loadQuizStats(quizId)
      if (user) {
        loadUserStats(user.id, quizId)
      }

    } catch (error) {
      console.error('Error loading quiz:', error)
      setError(error.message)
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
    
    // Initialize question states
    const initialStates = {}
    questions.forEach((q, index) => {
      initialStates[q.id] = index === 0 ? 'active' : 'pending'
    })
    setQuestionStates(initialStates)
    setCanProceed(false)
    
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

  // Answer handling with state management
  const handleAnswer = (questionId, answer) => {
    // Only allow answering if question is in 'active' state
    if (questionStates[questionId] !== 'active') return
    
    setAnswers({
      ...answers,
      [questionId]: answer
    })
    
    // Mark question as answered and stop timer
    setQuestionStates(prev => ({
      ...prev,
      [questionId]: 'answered'
    }))
    setIsTimerActive(false)
    setCanProceed(true)
  }

  // Handle timer expiry
  const handleTimeUp = () => {
    const currentQuestion = questions[currentQuestionIndex]
    if (!currentQuestion) return
    
    // Mark current question as expired
    setQuestionStates(prev => ({
      ...prev,
      [currentQuestion.id]: 'expired'
    }))
    setIsTimerActive(false)
    setCanProceed(true)
  }

  // Navigation with state management
  const nextQuestion = () => {
    if (!canProceed) return
    
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      const nextQuestionId = questions[nextIndex].id
      
      setCurrentQuestionIndex(nextIndex)
      
      // Set next question as active
      setQuestionStates(prev => ({
        ...prev,
        [nextQuestionId]: 'active'
      }))
      setCanProceed(false)
    } else {
      // Quiz completed
      submitQuiz()
    }
  }

  const submitQuiz = async () => {
    if (submitting) return
    
    setSubmitting(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const timeTaken = Math.round((Date.now() - startTime) / 1000)
      
      // Calculate score based on different question types
      let score = 0
      let maxScore = 0
      
      questions.forEach(question => {
        maxScore += question.points || 10
        const userAnswer = answers[question.id]
        
        if (userAnswer !== undefined && userAnswer !== null) {
          let isCorrect = false
          
          if (question.question_type === 'multiple_choice') {
            isCorrect = userAnswer === question.correct_answer
          } else if (question.question_type === 'map_click') {
            // For map questions, check if clicked region is acceptable
            const mapData = question.map_data || {}
            const acceptableRegions = mapData.acceptable_regions || [mapData.target_region_id]
            isCorrect = acceptableRegions.includes(userAnswer) || userAnswer === mapData.target_region_id
          }
          
          if (isCorrect) {
            score += question.points || 10
          }
        }
      })

      const currentPercentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

      // Save attempt
      const { error: attemptError } = await supabase
        .from('user_quiz_attempts')
        .insert({
          user_id: user?.id,
          quiz_id: quizId,
          score,
          max_score: maxScore,
          time_taken: timeTaken,
          answers: JSON.stringify(answers),
          completed_at: new Date().toISOString()
        })

      if (attemptError) throw attemptError
      
      // Check if it's a new record
      if (previousBest && currentPercentage > previousBest.percentage) {
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
    
    // Reset question states
    setQuestionStates({})
    setCanProceed(false)
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
    // Only resume timer if current question is still active and not answered
    const currentQuestion = questions[currentQuestionIndex]
    if (currentQuestion && questionStates[currentQuestion.id] === 'active' && !answers[currentQuestion.id]) {
      setIsTimerActive(true)
    }
  }

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerColor = () => {
    if (timeRemaining <= 5) return '#dc2626'
    if (timeRemaining <= 10) return '#f59e0b'
    return '#10b981'
  }

  const getPerformanceLevel = (percentage) => {
    if (percentage >= 90) return { level: 'Excellent', icon: '🏆', color: '#10b981' }
    if (percentage >= 80) return { level: 'Great', icon: '🎯', color: '#059669' }
    if (percentage >= 70) return { level: 'Good', icon: '👍', color: '#0891b2' }
    if (percentage >= 60) return { level: 'Fair', icon: '📚', color: '#7c3aed' }
    return { level: 'Needs Practice', icon: '💪', color: '#dc2626' }
  }

  // Loading state
  if (loading) {
    return (
      <div className="quiz-preview-modern loading-state">
        <div className="loading-spinner"></div>
        <p>Loading quiz...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="quiz-preview-modern error-state">
        <div className="error-message">
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/quizzes')} className="btn-primary">
            Browse Other Quizzes
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[gameMode === 'taking' ? currentQuestionIndex : previewQuestionIndex]
  const userPerformance = userStats ? getPerformanceLevel(userStats.bestPercentage) : null

  // Cancel confirmation modal
  if (showCancelConfirm) {
    return (
      <div className="quiz-preview-modern">
        <div className="cancel-confirm-overlay">
          <div className="cancel-confirm-modal">
            <h3>Cancel Quiz?</h3>
            <p>Your progress will be lost. Are you sure you want to cancel?</p>
            <div className="cancel-confirm-actions">
              <button onClick={confirmCancelQuiz} className="btn-danger">
                Yes, Cancel Quiz
              </button>
              <button onClick={cancelCancelQuiz} className="btn-secondary">
                Continue Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Quiz Completed Mode - Results Screen
  if (gameMode === 'completed' && results) {
    const performance = getPerformanceLevel(results.percentage)

    return (
      <div className="quiz-preview-modern results-mode">
        <div className="results-container">
          <div className="results-header">
            {results.isNewRecord && (
              <div className="new-record-badge">
                🏆 New Personal Best! 🏆
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

  // Quiz Taking Mode - with proper state management
  if (gameMode === 'taking') {
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100
    const currentQuestionState = questionStates[currentQuestion?.id] || 'active'

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
            {/* Timer Display - Always visible when timer is active */}
            {isTimerActive && currentQuestionState === 'active' && (
              <div 
                className={`timer-display-inline ${timeRemaining <= 10 ? 'urgent' : ''}`}
                style={{ borderColor: getTimerColor(), color: getTimerColor() }}
              >
                <span className="timer-icon">⏱️</span>
                <span>{formatTime(timeRemaining)}</span>
              </div>
            )}

            {/* Use QuizRenderer for rendering different question types */}
            <QuizRenderer
              questionData={currentQuestion}
              onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
              userAnswer={answers[currentQuestion.id]}
              showFeedback={currentQuestionState === 'answered' || currentQuestionState === 'expired'}
              timeRemaining={timeRemaining}
            />

            {/* Navigation */}
            <div className="question-navigation">
              <button 
                onClick={handleCancelQuiz}
                className="btn-cancel"
              >
                Cancel Quiz
              </button>
              
              <button 
                onClick={nextQuestion}
                disabled={!canProceed || submitting}
                className={`btn-next ${canProceed ? 'enabled' : 'disabled'}`}
              >
                {submitting 
                  ? 'Submitting...'
                  : currentQuestionIndex === questions.length - 1 
                    ? 'Finish Quiz' 
                    : 'Next Question'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Preview Mode (Default) - Keep existing preview mode code unchanged
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
          <span>{quiz.category}</span>
          <span>›</span>
          <span>{quiz.title}</span>
        </div>
      </div>

      {/* Quiz Header */}
      <div className="quiz-header-preview">
        <div className="quiz-title-section">
          <h1 className="quiz-title">{quiz.title}</h1>
          <p className="quiz-description">{quiz.description}</p>
        </div>

        <div className="quiz-meta-cards">
          <div className="meta-card">
            <span className="meta-icon">❓</span>
            <div className="meta-content">
              <span className="meta-value">{questions.length}</span>
              <span className="meta-label">Questions</span>
            </div>
          </div>

          <div className="meta-card">
            <span className="meta-icon">⏱️</span>
            <div className="meta-content">
              <span className="meta-value">{Math.ceil(questions.reduce((sum, q) => sum + (q.time_limit_seconds || 30), 0) / 60)}</span>
              <span className="meta-label">Minutes</span>
            </div>
          </div>

          <div className="meta-card">
            <span className="meta-icon">🏆</span>
            <div className="meta-content">
              <span className="meta-value">{questions.reduce((sum, q) => sum + (q.points || 10), 0)}</span>
              <span className="meta-label">Points</span>
            </div>
          </div>

          <div className="meta-card difficulty">
            <span className="meta-icon">📊</span>
            <div className="meta-content">
              <span className="meta-value difficulty-badge">{quiz.difficulty}</span>
              <span className="meta-label">Difficulty</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {(userStats || quizStats) && (
        <div className="stats-section">
          {userStats && (
            <div className="user-stats-card">
              <h3>Your Performance</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value" style={{ color: userPerformance?.color }}>
                    {userStats.bestPercentage}%
                  </span>
                  <span className="stat-label">Best Score</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{userStats.totalAttempts}</span>
                  <span className="stat-label">Attempts</span>
                </div>
                {userStats.streak > 0 && (
                  <div className="stat-item">
                    <span className="stat-value">{userStats.streak}</span>
                    <span className="stat-label">Streak</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {quizStats && (
            <div className="global-stats-card">
              <h3>Global Stats</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{quizStats.totalAttempts}</span>
                  <span className="stat-label">Total Plays</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{quizStats.averageScore}%</span>
                  <span className="stat-label">Average</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{quizStats.uniquePlayers}</span>
                  <span className="stat-label">Players</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Question Preview */}
      <div className="question-preview-section">
        <div className="section-header">
          <h2>Question Preview</h2>
          <div className="preview-controls">
            <button 
              onClick={() => setPreviewQuestionIndex(Math.max(0, previewQuestionIndex - 1))}
              disabled={previewQuestionIndex === 0}
              className="preview-nav-btn"
            >
              ‹ Previous
            </button>
            <span className="preview-counter">
              {previewQuestionIndex + 1} of {questions.length}
            </span>
            <button 
              onClick={() => setPreviewQuestionIndex(Math.min(questions.length - 1, previewQuestionIndex + 1))}
              disabled={previewQuestionIndex === questions.length - 1}
              className="preview-nav-btn"
            >
              Next ›
            </button>
          </div>
        </div>

        <div className={`question-preview-card ${!showQuizPreview ? 'blurred' : ''}`}>
          <div className="question-header">
            <div className="question-number">Q{previewQuestionIndex + 1}</div>
            <div className="question-timer">
              <span>⏱️</span>
              <span>{formatTime(currentQuestion.time_limit_seconds)}</span>
            </div>
          </div>

          <h3 className="question-text">{currentQuestion.question_text}</h3>

          {/* Use QuizRenderer for preview as well */}
          <div className="question-preview-content">
            <QuizRenderer
              questionData={currentQuestion}
              onAnswer={() => {}} // No-op for preview
              userAnswer={null}
              showFeedback={false}
              timeRemaining={currentQuestion.time_limit_seconds}
            />
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
                    : `${questions.length} questions • ${Math.ceil(questions.reduce((sum, q) => sum + (q.time_limit_seconds || 30), 0) / 60)} minutes • ${questions.reduce((sum, q) => sum + (q.points || 10), 0)} points`
                  }
                </p>
                
                <div className="overlay-buttons">
                  <button onClick={handleStartQuiz} className="btn-start-quiz-green">
                    <span className="btn-icon">🎯</span>
                    <span>{userStats ? 'Beat Your Score!' : 'Start Quiz'}</span>
                  </button>
                  <button onClick={handleShowPreview} className="btn-preview">
                    <span className="btn-icon">👁️</span>
                    <span>Preview Questions</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {showQuizPreview && (
          <div className="preview-actions">
            <button onClick={handleHidePreview} className="btn-secondary">
              Hide Preview
            </button>
            <button onClick={handleStartQuiz} className="btn-start-quiz-green">
              <span>🎯</span>
              <span>Start Quiz</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}