// src/components/quiz-types/components/MultipleChoiceQuestionComponent.js
import React from 'react'

export default function MultipleChoiceQuestionComponent({ 
  question, 
  onAnswer, 
  userAnswer, 
  showFeedback, 
  timeRemaining 
}) {
  const handleAnswerSelect = (answer) => {
    if (showFeedback) return // Don't allow changes after feedback
    onAnswer(answer)
  }

  return (
    <div style={{ 
      padding: '1.5rem', 
      backgroundColor: 'white', 
      borderRadius: '16px', 
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{ 
        fontSize: '1.25rem', 
        fontWeight: '600', 
        color: '#0f172a', 
        marginBottom: '1.5rem', 
        lineHeight: '1.5' 
      }}>
        {question.question_text}
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '1rem', 
        marginBottom: '1.5rem' 
      }}>
        {question.options.map((option, index) => {
          const isSelected = userAnswer === option
          const isCorrect = option === question.correct_answer
          
          let optionStyle = {
            display: 'flex',
            alignItems: 'center',
            padding: '1rem',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            cursor: showFeedback ? 'default' : 'pointer',
            backgroundColor: 'white',
            transition: 'all 0.3s ease'
          }
          
          if (showFeedback) {
            if (isCorrect) {
              optionStyle.backgroundColor = '#d4edda'
              optionStyle.borderColor = '#28a745'
            } else if (isSelected) {
              optionStyle.backgroundColor = '#f8d7da'
              optionStyle.borderColor = '#dc3545'
            } else {
              optionStyle.opacity = '0.7'
            }
          } else if (isSelected) {
            optionStyle.backgroundColor = '#e3f2fd'
            optionStyle.borderColor = '#2196f3'
          }
          
          return (
            <label key={index} style={optionStyle}>
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option}
                checked={isSelected}
                onChange={(e) => handleAnswerSelect(e.target.value)}
                disabled={showFeedback}
                style={{ marginRight: '1rem', cursor: 'pointer' }}
              />
              <span style={{ flex: 1, fontSize: '1rem', fontWeight: '500' }}>
                {String.fromCharCode(65 + index)}: {option}
              </span>
              {showFeedback && isCorrect && (
                <span style={{ color: '#28a745', fontSize: '18px', fontWeight: 'bold' }}>✓</span>
              )}
              {showFeedback && isSelected && !isCorrect && (
                <span style={{ color: '#dc3545', fontSize: '18px', fontWeight: 'bold' }}>✗</span>
              )}
            </label>
          )
        })}
      </div>

      {showFeedback && question.explanation && (
        <div style={{ 
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f0f9ff',
          borderLeft: '4px solid #3b82f6',
          borderRadius: '8px'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af', fontSize: '1rem' }}>
            Explanation:
          </h4>
          <p style={{ margin: '0', color: '#1e3a8a', lineHeight: '1.5' }}>
            {question.explanation}
          </p>
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        paddingTop: '1rem', 
        borderTop: '1px solid #e2e8f0',
        fontSize: '0.9rem',
        color: '#64748b'
      }}>
        Points: {question.points} | Time Limit: {question.time_limit_seconds}s
      </div>
    </div>
  )
}