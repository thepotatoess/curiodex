import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ConfirmModal } from './ConfirmModal'
import QuizResults from './QuizResults'
import '../css/QuizTaking.css'

export default function QuizTaking() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState(null)
  const [startTime] = useState(Date.now())
  const [previousBest, setPreviousBest] = useState(null)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  
  // Timer states
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const timerRef = useRef(null)
  
  const currentQ = questions[currentQuestion] || null
  const isAnswered = currentQ ? answers[currentQ.id] !== undefined : false

  useEffect(() => {
    if (quizId) {
      loadQuiz()
    }
  }, [quizId])

  // Timer effect
  useEffect(() => {
    if (currentQ && isTimerActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - auto advance to next question or submit
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
  }, [currentQuestion, isTimerActive, timeRemaining])

  // Start timer when question changes
  useEffect(() => {
    if (currentQ && !isAnswered) {
      setTimeRemaining(currentQ.time_limit_seconds || 30)
      setIsTimerActive(true)
    } else {
      setIsTimerActive(false)
    }
  }, [currentQuestion, currentQ])

  const loadQuiz = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .eq('is_published', true)
        .single()

      if (quizError) throw quizError

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index')

      if (questionsError) throw questionsError

      // Parse options JSON and ensure time_limit_seconds is set
      const parsedQuestions = questionsData.map(q => ({
        ...q,
        options: JSON.parse(q.options || '[]'),
        time_limit_seconds: q.time_limit_seconds || 30
      }))

      // Fetch user's previous attempts
      if (user) {
        const { data: previousAttempts, error: attemptsError } = await supabase
          .from('user_quiz_attempts')
          .select('score, max_score')
          .eq('user_id', user.id)
          .eq('quiz_id', quizId)
          .order('score', { ascending: false })
          .limit(1)

        if (!attemptsError && previousAttempts && previousAttempts.length > 0) {
          const bestAttempt = previousAttempts[0]
          setPreviousBest({
            score: bestAttempt.score,
            maxScore: bestAttempt.max_score,
            percentage: Math.round((bestAttempt.score / bestAttempt.max_score) * 100)
          })
        }
      }

      setQuiz(quizData)
      setQuestions(parsedQuestions)
    } catch (error) {
      console.error('Error loading quiz:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    })
    // Stop timer when answer is selected
    setIsTimerActive(false)
  }

  const handleTimeUp = () => {
    // Auto-advance to next question or submit quiz
    setIsTimerActive(false)
    
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        nextQuestion()
      }, 1000) // Brief delay to show time's up
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
      setIsTimerActive(false) // Don't restart timer on previous questions
    }
  }

  const handleCancelClick = () => {
    setIsTimerActive(false)
    setShowCancelConfirm(true)
  }

  const confirmCancel = () => {
    setShowCancelConfirm(false)
    navigate(`/quizzes`)
  }

  const submitQuiz = async () => {
    setIsTimerActive(false)
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Calculate score
      let score = 0
      let maxScore = 0

      questions.forEach(question => {
        maxScore += question.points
        if (answers[question.id] === question.correct_answer) {
          score += question.points
        }
      })

      // Calculate time taken (in seconds)
      const timeTaken = Math.floor((Date.now() - startTime) / 1000)

      // Save attempt with completed_at timestamp
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

      // Show results
      setResults({
        score,
        maxScore,
        timeTaken,
        quizTitle: quiz.title,
        questions,
        userAnswers: answers,
        isNewRecord,
        previousBest,
        quizId
      })
      setShowResults(true)

    } catch (error) {
      console.error('Error submitting quiz:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetakeQuiz = () => {
    // Reset quiz state
    setCurrentQuestion(0)
    setAnswers({})
    setShowResults(false)
    setResults(null)
    setIsNewRecord(false)
    setTimeRemaining(0)
    setIsTimerActive(false)
    // Update start time for new attempt
    window.location.reload() // Simple way to reset the start time
  }

  const handleBackToQuizDetail = () => {
    navigate(`/quiz/${quizId}`)
  }

  const handleBackToQuizzes = () => {
    navigate('/quizzes')
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerColor = () => {
    const total = currentQ?.time_limit_seconds || 30
    const percentage = (timeRemaining / total) * 100
    
    if (percentage > 50) return '#10b981' // Green
    if (percentage > 25) return '#f59e0b' // Yellow
    return '#ef4444' // Red
  }

  if (loading) return <div className="quiz-loading">Loading quiz...</div>

  if (!quiz || questions.length === 0) {
    return (
      <div className="quiz-not-found">
        <h2>Quiz not found or has no questions</h2>
        <button onClick={() => navigate('/quizzes')} className="quiz-not-found-btn">
          Back to Quizzes
        </button>
      </div>
    )
  }

  // Show results
  if (showResults && results) {
    return (
      <QuizResults
        {...results}
        onRetake={handleRetakeQuiz}
        onBackToQuizzes={handleBackToQuizzes}
        onBackToQuizDetail={handleBackToQuizDetail}
      />
    )
  }

  // Quiz Taking Screen
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="quiz-taking-container">
      {/* Timer Display */}
      {isTimerActive && (
        <div 
          className={`timer-display ${timeRemaining <= 10 ? 'urgent' : ''}`}
          style={{ borderColor: getTimerColor(), color: getTimerColor() }}
        >
          <span className="timer-icon">⏱️</span>
          <span>{formatTime(timeRemaining)}</span>
        </div>
      )}

      <div className="quiz-header">
        <h1>{quiz.title}</h1>
        <p>{quiz.description}</p>
        <div className="quiz-info-bar">
          <span className="quiz-progress-text">Question {currentQuestion + 1} of {questions.length}</span>
          <span className="quiz-metadata">Category: {quiz.category} | Difficulty: {quiz.difficulty}</span>
        </div>
        <div className="quiz-progress-bar">
          <div 
            className="quiz-progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

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
          <div className="time-up-message" style={{ 
            color: '#ef4444', 
            fontWeight: 'bold', 
            textAlign: 'center',
            margin: '1rem 0',
            padding: '0.5rem',
            background: '#fef2f2',
            borderRadius: '4px',
            border: '1px solid #fecaca'
          }}>
            ⏰ Time's up! Moving to next question...
          </div>
        )}
      </div>

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
          <button
            onClick={handleCancelClick}
            className="nav-btn nav-btn-cancel"
          >
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
          setIsTimerActive(true) // Resume timer when cancelling the cancel dialog
        }}
        confirmText="Cancel Quiz"
        cancelText="Continue Quiz"
        danger={true}
      />
    </div>
  )
}