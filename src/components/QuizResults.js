import { useState, useEffect } from 'react'

export default function QuizResults({ 
  score, 
  maxScore, 
  timeTaken, 
  quizTitle, 
  questions, 
  userAnswers, 
  onRetake, 
  onBackToQuizzes 
}) {
  const [showConfetti, setShowConfetti] = useState(true)
  const percentage = Math.round((score / maxScore) * 100)
  
  useEffect(() => {
    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const getPerformanceData = () => {
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

  const performance = getPerformanceData()
  const minutes = Math.floor(timeTaken / 60)
  const seconds = timeTaken % 60

  const correctAnswers = questions.filter(q => userAnswers[q.id] === q.correct_answer).length
  const incorrectAnswers = questions.length - correctAnswers

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      position: 'relative'
    }}>
      {/* Confetti Effect */}
      {showConfetti && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '200px',
          background: `
            radial-gradient(circle at 20% 80%, #fbbf24 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, #10b981 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, #3b82f6 0%, transparent 50%)
          `,
          animation: 'confetti 3s ease-out',
          pointerEvents: 'none',
          zIndex: 1
        }} />
      )}

      {/* Main Results Card */}
      <div style={{
        backgroundColor: performance.bgColor,
        border: `2px solid ${performance.color}`,
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center',
        marginBottom: '30px',
        position: 'relative',
        zIndex: 2
      }}>
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
          {performance.message}
        </p>

        <div style={{ 
          fontSize: '48px', 
          fontWeight: 'bold', 
          color: performance.color,
          marginBottom: '8px'
        }}>
          {percentage}%
        </div>
        
        <div style={{ 
          fontSize: '18px', 
          color: '#6b7280' 
        }}>
          {score} out of {maxScore} points
        </div>
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
          Quiz: {quizTitle}
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

      {/* Question Review */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '30px'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          margin: '0 0 20px 0', 
          color: '#111827' 
        }}>
          Question Review
        </h3>
        
        <div style={{ display: 'grid', gap: '16px' }}>
          {questions.map((question, index) => {
            const userAnswer = userAnswers[question.id]
            const isCorrect = userAnswer === question.correct_answer
            
            return (
              <div key={question.id} style={{
                padding: '16px',
                border: `2px solid ${isCorrect ? '#10b981' : '#ef4444'}`,
                borderRadius: '8px',
                backgroundColor: isCorrect ? '#f0fdf4' : '#fef2f2'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ 
                    fontSize: '20px', 
                    marginRight: '8px' 
                  }}>
                    {isCorrect ? '✅' : '❌'}
                  </span>
                  <span style={{ fontWeight: 'bold', color: '#111827' }}>
                    Question {index + 1}
                  </span>
                </div>
                
                <p style={{ 
                  margin: '0 0 12px 0', 
                  color: '#374151',
                  fontSize: '14px'
                }}>
                  {question.question_text}
                </p>
                
                <div style={{ fontSize: '13px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Your answer:</strong> {userAnswer || 'No answer'}
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Correct answer:</strong> {question.correct_answer}
                  </div>
                  {question.explanation && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '8px', 
                      backgroundColor: '#f9fafb', 
                      borderRadius: '4px',
                      color: '#6b7280'
                    }}>
                      <strong>Explanation:</strong> {question.explanation}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
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
          onClick={onRetake}
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
          onClick={onBackToQuizzes}
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