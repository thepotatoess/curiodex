import { useState, useEffect } from 'react'
import '../css/QuizResults.css'

export default function QuizResults({ 
  score, 
  maxScore, 
  timeTaken, 
  quizTitle, 
  questions, 
  userAnswers, 
  onRetake, 
  onBackToQuizzes,
  isNewRecord = false,
  previousBest = null
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

  const performance = getPerformanceData()
  const minutes = Math.floor(timeTaken / 60)
  const seconds = timeTaken % 60

  const correctAnswers = questions.filter(q => userAnswers[q.id] === q.correct_answer).length
  const incorrectAnswers = questions.length - correctAnswers

  return (
    <div className="results-container">
      {/* Confetti Effect */}
      {showConfetti && percentage >= 70 && (
        <div className="confetti-overlay" />
      )}

      {/* Main Results Card */}
      <div className={`results-card ${performance.level}`}>
        {isNewRecord && (
          <div className="new-record-badge">
            🏆 NEW PERSONAL BEST! 🏆
          </div>
        )}

        <div className="results-emoji">
          {performance.emoji}
        </div>
        
        <h1 className="results-title">
          {performance.title}
        </h1>
        
        <p className="results-message">
          {isNewRecord ? 'You beat your previous best score!' : performance.message}
        </p>

        <div className="results-score">
          {percentage}%
        </div>
        
        <div className="results-points">
          {score} out of {maxScore} points
        </div>

        {previousBest && !isNewRecord && (
          <div className="previous-best">
            Previous best: {previousBest.percentage}%
          </div>
        )}
      </div>

      {/* Quiz Details */}
      <div className="quiz-details-card">
        <h2 className="quiz-details-title">
          Quiz: {quizTitle}
        </h2>

        <div className="results-stats-grid">
          <div className="stat-item">
            <div className="stat-value correct">
              {correctAnswers}
            </div>
            <div className="stat-label">
              Correct Answers
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-value incorrect">
              {incorrectAnswers}
            </div>
            <div className="stat-label">
              Incorrect Answers
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-value time">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <div className="stat-label">
              Time Taken
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-value total">
              {questions.length}
            </div>
            <div className="stat-label">
              Total Questions
            </div>
          </div>
        </div>
      </div>

      {/* Question Review */}
      <div className="question-review-section">
        <h3 className="question-review-title">
          Question Review
        </h3>
        
        <div className="question-review-grid">
          {questions.map((question, index) => {
            const userAnswer = userAnswers[question.id]
            const isCorrect = userAnswer === question.correct_answer
            
            return (
              <div key={question.id} className={`review-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="review-header">
                  <span className="review-icon">
                    {isCorrect ? '✅' : '❌'}
                  </span>
                  <span className="review-question-number">
                    Question {index + 1}
                  </span>
                </div>
                
                <p className="review-question-text">
                  {question.question_text}
                </p>
                
                <div className="review-answers">
                  <div className="review-answer-row">
                    <strong>Your answer:</strong> {userAnswer || 'No answer'}
                  </div>
                  <div className="review-answer-row">
                    <strong>Correct answer:</strong> {question.correct_answer}
                  </div>
                  {question.explanation && (
                    <div className="review-explanation">
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
      <div className="results-actions">
        <button
          onClick={onRetake}
          className="results-btn results-btn-primary"
        >
          Retake Quiz
        </button>
        
        <button
          onClick={onBackToQuizzes}
          className="results-btn results-btn-secondary"
        >
          Back to Quizzes
        </button>
      </div>
    </div>
  )
}