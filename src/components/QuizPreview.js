import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ConfirmModal } from './ConfirmModal'
import '../css/QuizPreview.css'

export default function QuizPreview() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [quizStats, setQuizStats] = useState(null)
  const [userStats, setUserStats] = useState(null)
  
  // Quiz state
  const [gameState, setGameState] = useState('preview') // 'preview', 'playing', 'results'
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [previousBest, setPreviousBest] = useState(null)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showResultsPopup, setShowResultsPopup] = useState(false)
  
  // Timer states
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const timerRef = useRef(null)
  
  const currentQ = questions[currentQuestion] || null
  const isAnswered = currentQ ? answers[currentQ.id] !== undefined : false

  useEffect(() => {
    if (quizId) {
      loadQuizData()
    }
  }, [quizId])

  // Timer effect
  useEffect(() => {
    if (currentQ && isTimerActive && timeRemaining > 0 && gameState === 'playing') {
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
  }, [currentQuestion, isTimerActive, timeRemaining, gameState])

  // Start timer when question changes during play
  useEffect(() => {
    if (currentQ && !isAnswered && gameState === 'playing') {
      setTimeRemaining(currentQ.time_limit_seconds || 30)
      setIsTimerActive(true)
    } else {
      setIsTimerActive(false)
    }
  }, [currentQuestion, currentQ, gameState])

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

      // Load all questions
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
      
      // Load user statistics
      if (user) {
        await loadUserStats(user.id, quizId)
      }

      setQuiz({
        ...quizData,
        category_icon: categoryData?.icon || '📚',
        category_color: categoryData?.color || '#6b7280',
        question_count: parsedQuestions.length
      })
      
      setQuestions(parsedQuestions)

    } catch (error) {
      console.error('Error loading quiz data:', error)
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
          averageTime: Math.round(attempts.reduce((sum, a) => sum + a.time_taken, 0) / attempts.length)
        })
      } else {
        setQuizStats({
          totalAttempts: 0,
          uniquePlayers: 0,
          averageScore: 0,
          highestScore: 0,
          averageTime: 0
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

        const userStatsData = {
          totalAttempts: attempts.length,
          bestScore: bestAttempt.score,
          bestMaxScore: bestAttempt.max_score,
          bestPercentage: Math.round((bestAttempt.score / bestAttempt.max_score) * 100),
          averagePercentage: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          bestTime: Math.min(...attempts.map(a => a.time_taken)),
          lastPlayed: attempts[0].completed_at
        }

        setUserStats(userStatsData)
        setPreviousBest({
          score: bestAttempt.score,
          maxScore: bestAttempt.max_score,
          percentage: userStatsData.bestPercentage
        })
      }
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  const handleStartQuiz = () => {
    setGameState('playing')
    setStartTime(Date.now())
    setCurrentQuestion(0)
    setAnswers({})
    setTimeRemaining(questions[0]?.time_limit_seconds || 30)
    setIsTimerActive(true)
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
    
    if (currentQuestion < questions.length - 1) {
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
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setIsTimerActive(true)
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      setIsTimerActive(false)
    }
  }

  const handleCancelClick = () => {
    setIsTimerActive(false)
    setShowCancelConfirm(true)
  }

  const confirmCancel = () => {
    setShowCancelConfirm(false)
    setGameState('preview')
    setCurrentQuestion(0)
    setAnswers({})
    setTimeRemaining(0)
    setIsTimerActive(false)
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
        quizTitle: quiz.title,
        questions,
        userAnswers: answers,
        isNewRecord,
        previousBest,
        quizId,
        percentage: currentPercentage
      })
      
      setGameState('results')
      setShowResultsPopup(true)

      // Reload stats after completion
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
    setShowResultsPopup(false)
    setGameState('preview')
    setCurrentQuestion(0)
    setAnswers({})
    setResults(null)
    setIsNewRecord(false)
    setTimeRemaining(0)
    setIsTimerActive(false)
  }

  const closeResultsPopup = () => {
    setShowResultsPopup(false)
  }

  const handleBackClick = () => {
    if (gameState === 'playing') {
      handleCancelClick()
    } else {
      navigate(`/quiz/${quizId}`)
    }
  }

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const formatTimeDetailed = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#10b981'
      case 'medium': return '#f59e0b'
      case 'hard': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getTimerColor = () => {
    const total = currentQ?.time_limit_seconds || 30
    const percentage = (timeRemaining / total) * 100
    
    if (percentage > 50) return '#10b981'
    if (percentage > 25) return '#f59e0b'
    return '#ef4444'
  }

  const getPerformanceData = (percentage) => {
    if (percentage >= 90) return {
      emoji: '🎉',
      title: 'Outstanding!',
      message: 'You absolutely nailed it!',
      level: 'excellent'
    }
    if (percentage >= 80) return {
      emoji: '🌟',
      title: 'Excellent!',
      message: 'Great job on this quiz!',
      level: 'good'
    }
    if (percentage >= 70) return {
      emoji: '👏',
      title: 'Well Done!',
      message: 'You did really well!',
      level: 'medium'
    }
    if (percentage >= 60) return {
      emoji: '👍',
      title: 'Good Job!',
      message: 'Solid performance!',
      level: 'fair'
    }
    return {
      emoji: '📚',
      title: 'Keep Learning!',
      message: 'Practice makes perfect!',
      level: 'poor'
    }
  }

  if (loading) {
    return (
      <div className="quiz-preview-container">
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
          Loading quiz...
        </div>
      </div>
    )
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="quiz-preview-container">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>Quiz not found</h2>
          <p>The quiz you're looking for doesn't exist or has no questions.</p>
          <button onClick={() => navigate('/quizzes')} className="btn btn-primary">
            Back to Quizzes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz-preview-container">
      {/* Timer Display - only during playing */}
      {gameState === 'playing' && isTimerActive && (
        <div 
          className={`timer-display ${timeRemaining <= 10 ? 'urgent' : ''}`}
          style={{ borderColor: getTimerColor(), color: getTimerColor() }}
        >
          <span className="timer-icon">⏱️</span>
          <span>{formatTimeDetailed(timeRemaining)}</span>
        </div>
      )}

      {/* Back Button */}
      <button onClick={handleBackClick} className="preview-back-btn">
        ← Back to Quiz Details
      </button>

      {/* Header - always visible */}
      <div className="preview-header">
        <h1 className="preview-title">{quiz.title}</h1>
        <p className="preview-description">{quiz.description}</p>
        
        <div className="preview-meta">
          <div className="meta-item">
            <span className="meta-icon" style={{ color: quiz.category_color }}>
              {quiz.category_icon}
            </span>
            <span>{quiz.category}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon" style={{ color: getDifficultyColor(quiz.difficulty) }}>
              📊
            </span>
            <span style={{ textTransform: 'capitalize' }}>{quiz.difficulty}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">❓</span>
            <span>{quiz.question_count} Questions</span>
          </div>
        </div>
      </div>

      {/* Compact Statistics - always visible */}
      <div className="stats-compact-container">
        {/* Quiz Statistics */}
        {quizStats && (
          <div className="quiz-stats-section">
            <h3 className="stats-title">Quiz Stats</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-value">{quizStats.uniquePlayers}</div>
                <div className="stat-label">Players</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-value">{quizStats.totalAttempts}</div>
                <div className="stat-label">Attempts</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-value">{quizStats.averageScore}%</div>
                <div className="stat-label">Avg Score</div>
              </div>
              {quizStats.highestScore > 0 && (
                <div className="stat-card highlight">
                  <div className="stat-icon">🏆</div>
                  <div className="stat-value">{quizStats.highestScore}%</div>
                  <div className="stat-label">Best</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Personal Stats */}
        {userStats && (
          <div className="user-stats-section">
            <h3 className="stats-title">Your Stats</h3>
            <div className="user-stats-grid">
              <div className="user-stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-value">{userStats.totalAttempts}</div>
                <div className="stat-label">Attempts</div>
              </div>
              <div className="user-stat-card highlight">
                <div className="stat-icon">⭐</div>
                <div className="stat-value">{userStats.bestPercentage}%</div>
                <div className="stat-label">Best</div>
              </div>
              <div className="user-stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-value">{userStats.averagePercentage}%</div>
                <div className="stat-label">Average</div>
              </div>
              <div className="user-stat-card">
                <div className="stat-icon">⚡</div>
                <div className="stat-value">{formatTimeDetailed(userStats.bestTime)}</div>
                <div className="stat-label">Best Time</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quiz Playing Interface */}
      {gameState === 'playing' && (
        <>
          {/* Progress Bar */}
          <div className="quiz-info-bar">
            <span className="quiz-progress-text">Question {currentQuestion + 1} of {questions.length}</span>
            <span className="quiz-metadata">Progress: {Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}></div>
          </div>

          {/* Question Card */}
          <div className="question-card">
            <h3 className="question-text">{currentQ.question_text}</h3>
            
            <div className="answer-options">
              {currentQ.options.map((option, index) => {
                const isSelected = answers[currentQ.id] === option
                const isCorrect = option === currentQ.correct_answer
                const showFeedback = answers[currentQ.id] !== undefined
                
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
                      name={`question-${currentQ.id}`}
                      value={option}
                      checked={isSelected}
                      onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
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

            {isAnswered && currentQ.explanation && (
              <div className="question-explanation">
                <h4>Explanation:</h4>
                <p>{currentQ.explanation}</p>
              </div>
            )}

            <div className="question-points">
              Points: {currentQ.points} | Time Limit: {currentQ.time_limit_seconds}s
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
                disabled={currentQuestion === 0}
                className="nav-btn nav-btn-prev"
              >
                Previous
              </button>
            </div>

            <div className="nav-buttons-right">
              <button onClick={handleCancelClick} className="nav-btn nav-btn-cancel">
                Cancel Quiz
              </button>

              {currentQuestion === questions.length - 1 ? (
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
                  disabled={!answers[currentQ.id] && timeRemaining > 0}
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
        </>
      )}

      {/* Preview Interface */}
      {gameState === 'preview' && (
        <>
          {/* Instructions */}
          <div className="quiz-instructions">
            <h3 className="instructions-title">
              <span>📋</span>
              Quiz Instructions
            </h3>
            <ul className="instructions-list">
              <li>Answer each question within the time limit</li>
              <li>You can review your answer before moving to the next question</li>
              <li>Once you move to the next question, you cannot go back</li>
              <li>Complete all questions to see your final score</li>
              <li>You can retake the quiz as many times as you want</li>
            </ul>
          </div>

          {/* Preview Question */}
          <div className="preview-question-card blurred">
            <div className="preview-question-content">
              <div className="preview-question-number">
                Question 1 of {quiz.question_count}
              </div>
              
              <h3 className="preview-question-text">
                {questions[0].question_text}
              </h3>
              
              <div className="preview-answer-options">
                {questions[0].options.map((option, index) => (
                  <div key={index} className="preview-answer-option">
                    <span className="answer-letter">
                      {String.fromCharCode(65 + index)}:
                    </span>
                    <span>{option}</span>
                  </div>
                ))}
              </div>

              <div className="preview-question-info">
                <div className="question-points">
                  <span>🏆</span>
                  <span>{questions[0].points} points</span>
                </div>
                <div className="question-time-limit">
                  <span>⏱️</span>
                  <span>{formatTime(questions[0].time_limit_seconds || 30)} to answer</span>
                </div>
              </div>
            </div>

            <div className="blur-overlay">
              <div className="preview-overlay-content">
                <h3 className="preview-overlay-title">Ready to Start?</h3>
                <p className="preview-overlay-text">
                  {userStats 
                    ? `Your best score: ${userStats.bestPercentage}%. Think you can do better?`
                    : "Click the button below to begin your quiz journey!"
                  }
                </p>
                <button onClick={handleStartQuiz} className="start-quiz-btn">
                  <span>🚀</span>
                  {userStats ? 'Try Again' : 'Start Quiz'}
                </button>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div style={{ 
            textAlign: 'center', 
            color: '#6b7280', 
            fontSize: '14px',
            marginTop: '2rem' 
          }}>
            <p>Good luck! Take your time and think carefully about each answer.</p>
          </div>
        </>
      )}

      {/* Question Review After Results */}
      {gameState === 'results' && results && (
        <div className="question-review-after-results">
          <h3>Question Review</h3>
          <div className="question-review-grid-compact">
            {questions.map((question, index) => {
              const userAnswer = answers[question.id]
              const isCorrect = userAnswer === question.correct_answer
              
              return (
                <div key={question.id} className={`review-item-compact ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="review-header-compact">
                    <span className="review-icon-compact">
                      {isCorrect ? '✅' : '❌'}
                    </span>
                    <span className="review-question-number-compact">
                      Question {index + 1}
                    </span>
                  </div>
                  
                  <p className="review-question-text-compact">
                    {question.question_text}
                  </p>
                  
                  <div className="review-answers-compact">
                    <div className="review-answer-row-compact">
                      <strong>Your answer:</strong> {userAnswer || 'No answer'}
                    </div>
                    <div className="review-answer-row-compact">
                      <strong>Correct answer:</strong> {question.correct_answer}
                    </div>
                    {question.explanation && (
                      <div className="review-explanation-compact">
                        <strong>Explanation:</strong> {question.explanation}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Results Popup */}
      {showResultsPopup && results && (
        <div className="results-popup-overlay" onClick={closeResultsPopup}>
          <div className="results-popup" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close-btn" onClick={closeResultsPopup}>×</button>
            
            <div className="results-popup-header">
              {isNewRecord && (
                <div className="new-record-popup-badge">
                  🏆 NEW PERSONAL BEST! 🏆
                </div>
              )}

              <div className="results-popup-emoji">
                {getPerformanceData(results.percentage).emoji}
              </div>
              
              <h2 className="results-popup-title">
                {getPerformanceData(results.percentage).title}
              </h2>
              
              <div className="results-popup-score">
                {results.percentage}%
              </div>
              
              <p className="results-popup-details">
                {results.score} out of {results.maxScore} points in {formatTimeDetailed(results.timeTaken)}
              </p>
            </div>

            <div className="results-popup-actions">
              <button
                onClick={handleRetakeQuiz}
                className="results-popup-btn results-popup-btn-primary"
              >
                Try Again
              </button>
              
              <button
                onClick={closeResultsPopup}
                className="results-popup-btn results-popup-btn-secondary"
              >
                Review Answers
              </button>
            </div>
          </div>
        </div>
      )}

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
        onConfirm={confirmCancel}
        onCancel={() => {
          setShowCancelConfirm(false)
          setIsTimerActive(true)
        }}
        confirmText="Cancel Quiz"
        cancelText="Continue Quiz"
        danger={true}
      />
    </div>
  )
}