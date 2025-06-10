import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
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

    } catch (error) {
      console.error('Error submitting quiz:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetake = () => {
    setShowResults(false)
    setCurrentQuestion(0)
    setAnswers({})
    setResults(null)
    setIsNewRecord(false)
  }

  const getPerformanceData = (percentage) => {
    if (percentage >= 90) return {
      emoji: '🎉',
      title: 'Outstanding!',
      message: 'You absolutely nailed it!',
      color: '#10b981',
      bgColor: '#ecfdf5'
    }
    if (percentage >= 80) return {
      emoji: '🌟',
      title: 'Excellent!',
      message: 'Great job on this quiz!',
      color: '#3b82f6',
      bgColor: '#eff6ff'
    }
    if (percentage >= 70) return {
      emoji: '👏',
      title: 'Well Done!',
      message: 'You did really well!',
      color: '#8b5cf6',
      bgColor: '#f3e8ff'
    }
    if (percentage >= 60) return {
      emoji: '👍',
      title: 'Good Job!',
      message: 'Solid performance!',
      color: '#f59e0b',
      bgColor: '#fffbeb'
    }
    return {
      emoji: '📚',
      title: 'Keep Learning!',
      message: 'Practice makes perfect!',
      color: '#ef4444',
      bgColor: '#fef2f2'
    }
  }

  if (loading) return <div style={{ padding: '20px' }}>Loading quiz...</div>

  if (!quiz || questions.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Quiz not found or has no questions</h2>
        <button onClick={onCancel} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Back to Quizzes
        </button>
      </div>
    )
  }

  // Results Screen
  if (showResults) {
    const performance = getPerformanceData(results.percentage)
    const minutes = Math.floor(results.timeTaken / 60)
    const seconds = results.timeTaken % 60
    const correctAnswers = questions.filter(q => results.userAnswers[q.id] === q.correct_answer).length
    const incorrectAnswers = questions.length - correctAnswers

    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {/* Main Results Card */}
        <div style={{
          backgroundColor: performance.bgColor,
          border: `2px solid ${performance.color}`,
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          {isNewRecord && (
            <div style={{
              backgroundColor: '#fbbf24',
              color: '#78350f',
              padding: '12px 24px',
              borderRadius: '50px',
              display: 'inline-block',
              marginBottom: '20px',
              fontWeight: 'bold',
              fontSize: '14px',
              animation: 'pulse 2s infinite'
            }}>

              🏆 NEW PERSONAL BEST! 🏆
            </div>
          )}

          <div style={{ fontSize: '64px', marginBottom: '16px' }}>
            {performance.emoji}
          </div>
          
          <h1 style={{ 
            fontSize: '32px', 
            margin: '0 0 8px 0', 
            color: performance.color,
            fontWeight: 'bold'
          }}>
            {performance.title}
          </h1>
          
          <p style={{ 
            fontSize: '18px', 
            margin: '0 0 24px 0', 
            color: '#6b7280' 
          }}>
            {isNewRecord ? 'You beat your previous best score!' : performance.message}
          </p>

          <div style={{ 
            fontSize: '48px', 
            fontWeight: 'bold', 
            color: performance.color,
            marginBottom: '8px'
          }}>
            {results.percentage}%
          </div>
          
          <div style={{ 
            fontSize: '18px', 
            color: '#6b7280' 
          }}>
            {results.score} out of {results.maxScore} points
          </div>

          {previousBest && !isNewRecord && (
            <div style={{
            marginTop: '16px',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Previous best: {previousBest.percentage}%
          </div>
          )}

        </div>

        {/* Quiz Details */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '30px'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            margin: '0 0 20px 0', 
            color: '#111827' 
          }}>
            Quiz: {quiz.title}
          </h2>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px' 
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                {correctAnswers}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Correct Answers
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                {incorrectAnswers}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Incorrect Answers
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Time Taken
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                {questions.length}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Total Questions
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleRetake}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              minWidth: '140px'
            }}
          >
            Retake Quiz
          </button>
          
          <button
            onClick={onComplete}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              minWidth: '140px'
            }}
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    )
  }

  // Quiz Taking Screen
  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1>{quiz.title}</h1>
        <p>{quiz.description}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>Category: {quiz.category} | Difficulty: {quiz.difficulty}</span>
        </div>
        <div style={{ width: '100%', backgroundColor: '#e9ecef', borderRadius: '4px', height: '8px' }}>
          <div style={{ width: `${progress}%`, backgroundColor: '#007bff', height: '100%', borderRadius: '4px', transition: 'width 0.3s' }}></div>
        </div>
      </div>

      <div style={{ backgroundColor: '#f8f9fa', padding: '30px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '20px' }}>{currentQ.question_text}</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {currentQ.options.map((option, index) => {
            const isSelected = answers[currentQ.id] === option
            const isCorrect = option === currentQ.correct_answer
            const showFeedback = answers[currentQ.id] !== undefined
            
            let backgroundColor = 'white'
            let borderColor = '#dee2e6'
            
            if (showFeedback) {
              if (isCorrect) {
                backgroundColor = '#d4edda'
                borderColor = '#28a745'
              } else if (isSelected) {
                backgroundColor = '#f8d7da'
                borderColor = '#dc3545'
              } else {
                backgroundColor = '#f8d7da'
                borderColor = '#dc3545'
              }
            } else if (isSelected) {
              backgroundColor = '#e3f2fd'
              borderColor = '#2196f3'
            }
            
            return (
              <label 
                key={index} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px', 
                  border: `2px solid ${borderColor}`, 
                  borderRadius: '6px', 
                  cursor: showFeedback ? 'default' : 'pointer',
                  backgroundColor: backgroundColor,
                  transition: 'all 0.3s ease',
                  pointerEvents: showFeedback ? 'none' : 'auto'
                }}
              >
                <input
                  type="radio"
                  name={`question-${currentQ.id}`}
                  value={option}
                  checked={isSelected}
                  onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                  disabled={showFeedback}
                  style={{ marginRight: '12px' }}
                />
                <span style={{ fontWeight: showFeedback && isCorrect ? 'bold' : 'normal' }}>
                  {String.fromCharCode(65 + index)}: {option}
                </span>
                {showFeedback && isCorrect && (
                  <span style={{ marginLeft: 'auto', color: '#28a745' }}>✓</span>
                )}
                {showFeedback && isSelected && !isCorrect && (
                  <span style={{ marginLeft: 'auto', color: '#dc3545' }}>✗</span>
                )}
              </label>
            )
          })}
        </div>

        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          Points: {currentQ.points}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={prevQuestion}
          disabled={currentQuestion === 0}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: currentQuestion === 0 ? '#6c757d' : '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer' 
          }}
        >
          Previous
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancel Quiz
          </button>

          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={submitQuiz}
              disabled={submitting || !answers[currentQ.id]}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: (!answers[currentQ.id] || submitting) ? '#6c757d' : '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: (!answers[currentQ.id] || submitting) ? 'not-allowed' : 'pointer' 
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              disabled={!answers[currentQ.id]}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: !answers[currentQ.id] ? '#6c757d' : '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: !answers[currentQ.id] ? 'not-allowed' : 'pointer' 
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        Answered: {Object.keys(answers).length} / {questions.length} questions
      </div>
    </div>
  )
}