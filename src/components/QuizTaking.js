import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import '../css/QuizTaking.css'

export default function QuizTaking({ quizId, onComplete, onCancel }) {
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
  //const [answerLocked, setAnswerLocked] = useState(false)
  const currentQ = questions[currentQuestion] || null
  const isAnswered = currentQ ? answers[currentQ.id] !== undefined : false

  useEffect(() => {
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

        // Parse options JSON
        const parsedQuestions = questionsData.map(q => ({
          ...q,
          options: JSON.parse(q.options || '[]')
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

    loadQuiz()
  }, [quizId])

  const handleAnswer = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    })
    //setAnswerLocked(true)
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
    //setAnswerLocked(false)
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const submitQuiz = async () => {
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
        userAnswers: answers,
        percentage: Math.round((score / maxScore) * 100)
      })
      setShowResults(true)

      // Call onComplete to show results in parent component
      onComplete({
        score,
        maxScore,
        timeTaken,
        quizTitle: quiz.title,
        questions,
        userAnswers: answers,
        isNewRecord,
        previousBest,
        quizId // Add this for retake functionality
      })

    } catch (error) {
      console.error('Error submitting quiz:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="quiz-loading">Loading quiz...</div>

  if (!quiz || questions.length === 0) {
    return (
      <div className="quiz-not-found">
        <h2>Quiz not found or has no questions</h2>
        <button onClick={onCancel} className="quiz-not-found-btn">
          Back to Quizzes
        </button>
      </div>
    )
  }

  // Don't show results here - let parent component handle it
  if (showResults) {
    return null
  }

  // Quiz Taking Screen
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="quiz-taking-container">
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
                optionClass += ' incorrect'
              }
              optionClass += ' disabled'
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
                  disabled={showFeedback}
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

      
        

        {isAnswered && currentQ.explanation &&  (
          <div className="question-description">
            <p>{currentQ.explanation}</p>
          </div>
        )}
        

        <div className="question-points">
          Points: {currentQ.points}
        </div>
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
            onClick={onCancel}
            className="nav-btn nav-btn-cancel"
          >
            Cancel Quiz
          </button>

          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={submitQuiz}
              disabled={submitting || !answers[currentQ.id]}
              className="nav-btn nav-btn-submit"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              disabled={!answers[currentQ.id]}
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
  )
}