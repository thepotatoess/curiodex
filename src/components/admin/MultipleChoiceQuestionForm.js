import React from 'react'
import '../../css/QuestionForms.css'

export default function MultipleChoiceQuestionForm({ 
  question, 
  index, 
  onUpdate, 
  onUpdateOption, 
  onRemove, 
  onMove, 
  errors, 
  totalQuestions 
}) {
  const addOption = () => {
    const newOptions = [...question.options, '']
    onUpdate(index, 'options', newOptions)
  }

  const removeOption = (optionIndex) => {
    if (question.options.length <= 2) return // Minimum 2 options
    
    const newOptions = question.options.filter((_, i) => i !== optionIndex)
    onUpdate(index, 'options', newOptions)
    
    // If the removed option was the correct answer, clear it
    if (question.correct_answer === question.options[optionIndex]) {
      onUpdate(index, 'correct_answer', '')
    }
  }

  const questionTextError = errors[`question_${index}_text`]
  const optionsError = errors[`question_${index}_options`]
  const correctAnswerError = errors[`question_${index}_correct`]

  return (
    <div className="question-form-card">
      <div className="question-header">
        <div className="question-info">
          <div className="question-type-badge multiple-choice">
            <span className="type-icon">📝</span>
            <span>Multiple Choice</span>
          </div>
          <span className="question-number">Question {index + 1}</span>
        </div>
        
        <div className="question-actions">
          <button
            type="button"
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            className="btn-icon"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 'down')}
            disabled={index === totalQuestions - 1}
            className="btn-icon"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="btn-icon danger"
            title="Remove question"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="question-content">
        <div className="form-group">
          <label htmlFor={`question-text-${index}`}>Question Text *</label>
          <textarea
            id={`question-text-${index}`}
            value={question.question_text}
            onChange={(e) => onUpdate(index, 'question_text', e.target.value)}
            placeholder="Enter your question here..."
            rows="2"
            className={questionTextError ? 'error' : ''}
          />
          {questionTextError && (
            <span className="error-message">{questionTextError}</span>
          )}
        </div>

        <div className="form-group">
          <div className="options-header">
            <label>Answer Options *</label>
            <button
              type="button"
              onClick={addOption}
              className="btn-add-option"
              disabled={question.options.length >= 6}
            >
              + Add Option
            </button>
          </div>
          
          <div className="options-list">
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex} className="option-row">
                <div className="option-letter">
                  {String.fromCharCode(65 + optionIndex)}
                </div>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => onUpdateOption(index, optionIndex, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                  className="option-input"
                />
                {question.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(optionIndex)}
                    className="btn-remove-option"
                    title="Remove option"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {optionsError && (
            <span className="error-message">{optionsError}</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor={`correct-answer-${index}`}>Correct Answer *</label>
            <select
              id={`correct-answer-${index}`}
              value={question.correct_answer}
              onChange={(e) => onUpdate(index, 'correct_answer', e.target.value)}
              className={correctAnswerError ? 'error' : ''}
            >
              <option value="">Select correct answer</option>
              {question.options.map((option, optionIndex) => (
                <option key={optionIndex} value={option} disabled={!option.trim()}>
                  {String.fromCharCode(65 + optionIndex)}: {option || '(empty)'}
                </option>
              ))}
            </select>
            {correctAnswerError && (
              <span className="error-message">{correctAnswerError}</span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor={`points-${index}`}>Points</label>
            <input
              id={`points-${index}`}
              type="number"
              value={question.points}
              onChange={(e) => onUpdate(index, 'points', parseInt(e.target.value) || 10)}
              min="1"
              max="100"
              className="points-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor={`time-limit-${index}`}>Time Limit (seconds)</label>
            <input
              id={`time-limit-${index}`}
              type="number"
              value={question.time_limit_seconds}
              onChange={(e) => onUpdate(index, 'time_limit_seconds', parseInt(e.target.value) || 30)}
              min="10"
              max="300"
              className="time-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor={`explanation-${index}`}>Explanation (Optional)</label>
          <textarea
            id={`explanation-${index}`}
            value={question.explanation}
            onChange={(e) => onUpdate(index, 'explanation', e.target.value)}
            placeholder="Explain why this is the correct answer..."
            rows="2"
            className="explanation-input"
          />
        </div>
      </div>
    </div>
  )
}