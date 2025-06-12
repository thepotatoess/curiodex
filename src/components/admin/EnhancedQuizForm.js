import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { QUIZ_TYPES, QUIZ_TYPE_CONFIG } from '../quiz-types/QuizTypeRegistry'
import MultipleChoiceQuestionForm from './MultipleChoiceQuestionForm'
import MapClickQuestionForm from './MapClickQuestionForm'
import '../../css/EnhancedQuizForm.css'

export default function QuizForm({ onSuccess, onCancel, quiz = null }) {
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    title: quiz?.title || '',
    description: quiz?.description || '',
    category: quiz?.category || '',
    difficulty: quiz?.difficulty || 'easy',
    is_published: quiz?.is_published || false
  })
  const [questions, setQuestions] = useState(quiz?.questions || [])
  const [loading, setLoading] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    loadCategories()
  }, [])

  // Load existing quiz questions if editing
  useEffect(() => {
    if (quiz && quiz.id) {
      loadQuizQuestions(quiz.id)
    }
  }, [quiz])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_categories')
        .select('id, name, icon, is_active')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const loadQuizQuestions = async (quizId) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index')

      if (error) throw error

      // Process questions to handle different types
      const processedQuestions = data.map(question => {
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

      setQuestions(processedQuestions)
    } catch (error) {
      console.error('Error loading quiz questions:', error)
    }
  }

  const validateStep = (step) => {
    const errors = {}
    
    if (step === 1) {
      if (!formData.title.trim()) errors.title = 'Title is required'
      if (!formData.category) errors.category = 'Category is required'
      if (!formData.difficulty) errors.difficulty = 'Difficulty is required'
    }
    
    if (step === 2) {
      if (questions.length === 0) {
        errors.questions = 'At least one question is required'
      } else {
        questions.forEach((question, index) => {
          if (!question.question_text.trim()) {
            errors[`question_${index}_text`] = 'Question text is required'
          }
          
          if (question.question_type === 'multiple_choice') {
            if (!question.options || question.options.length < 2) {
              errors[`question_${index}_options`] = 'At least 2 options are required'
            }
            if (!question.correct_answer) {
              errors[`question_${index}_correct`] = 'Correct answer is required'
            }
          }
          
          if (question.question_type === 'map_click') {
            const mapData = question.map_data || {}
            if (!mapData.target_country) {
              errors[`question_${index}_target`] = 'Target country is required'
            }
            if (!mapData.map_type) {
              errors[`question_${index}_map`] = 'Map type is required'
            }
          }
        })
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    setCurrentStep(currentStep - 1)
    setValidationErrors({})
  }

  const addQuestion = (questionType = QUIZ_TYPES.MULTIPLE_CHOICE) => {
    const newQuestion = {
      question_text: '',
      question_type: questionType,
      points: 10,
      time_limit_seconds: 30,
      explanation: ''
    }

    // Add type-specific properties
    if (questionType === QUIZ_TYPES.MULTIPLE_CHOICE) {
      newQuestion.options = ['', '', '', '']
      newQuestion.correct_answer = ''
    } else if (questionType === QUIZ_TYPES.MAP_CLICK) {
      newQuestion.map_data = {
        target_country: '',
        target_region_id: '',
        map_type: 'world',
        acceptable_regions: []
      }
    }

    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (index, field, value) => {
    const updated = [...questions]
    if (field.includes('.')) {
      // Handle nested object updates (e.g., map_data.target_country)
      const [parent, child] = field.split('.')
      updated[index][parent] = {
        ...updated[index][parent],
        [child]: value
      }
    } else {
      updated[index][field] = value
    }
    setQuestions(updated)
  }

  const updateOption = (questionIndex, optionIndex, value) => {
    const updated = [...questions]
    updated[questionIndex].options[optionIndex] = value
    setQuestions(updated)
  }

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const moveQuestion = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return
    }

    const updated = [...questions]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setQuestions(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateStep(1) || !validateStep(2)) {
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Save quiz
      const quizPayload = {
        ...formData,
        created_by: user.id,
        updated_at: new Date().toISOString()
      }

      let quizResult
      if (quiz) {
        // Update existing quiz
        quizResult = await supabase
          .from('quizzes')
          .update(quizPayload)
          .eq('id', quiz.id)
          .select()
          .single()
      } else {
        // Create new quiz
        quizResult = await supabase
          .from('quizzes')
          .insert(quizPayload)
          .select()
          .single()
      }

      if (quizResult.error) throw quizResult.error

      const quizId = quizResult.data.id

      // Delete existing questions if updating
      if (quiz) {
        await supabase
          .from('questions')
          .delete()
          .eq('quiz_id', quizId)
      }

      // Save questions
      if (questions.length > 0) {
        const questionsPayload = questions.map((q, index) => {
          const baseQuestion = {
            quiz_id: quizId,
            question_text: q.question_text,
            question_type: q.question_type,
            explanation: q.explanation,
            points: q.points,
            time_limit_seconds: q.time_limit_seconds || 30,
            order_index: index
          }

          // Add type-specific data
          if (q.question_type === QUIZ_TYPES.MULTIPLE_CHOICE) {
            baseQuestion.options = JSON.stringify(q.options)
            baseQuestion.correct_answer = q.correct_answer
          } else if (q.question_type === QUIZ_TYPES.MAP_CLICK) {
            baseQuestion.map_data = JSON.stringify(q.map_data)
          }

          return baseQuestion
        })

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsPayload)

        if (questionsError) throw questionsError
      }

      onSuccess(quiz ? 'Quiz updated successfully!' : 'Quiz created successfully!')
    } catch (error) {
      console.error('Error saving quiz:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderQuestionForm = (question, index) => {
    const commonProps = {
      question,
      index,
      onUpdate: updateQuestion,
      onRemove: removeQuestion,
      onMove: moveQuestion,
      errors: validationErrors,
      totalQuestions: questions.length
    }

    switch (question.question_type) {
      case QUIZ_TYPES.MULTIPLE_CHOICE:
        return (
          <MultipleChoiceQuestionForm
            key={index}
            {...commonProps}
            onUpdateOption={updateOption}
          />
        )
      
      case QUIZ_TYPES.MAP_CLICK:
        return (
          <MapClickQuestionForm
            key={index}
            {...commonProps}
          />
        )
      
      default:
        return (
          <div key={index} className="question-form-error">
            <p>Unsupported question type: {question.question_type}</p>
          </div>
        )
    }
  }

  return (
    <div className="enhanced-quiz-form">
      <div className="form-header">
        <h2>{quiz ? 'Edit Quiz' : 'Create New Quiz'}</h2>
        <div className="step-indicator">
          <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Basic Info</span>
          </div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Questions</span>
          </div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Review</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="quiz-form">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="form-step">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label htmlFor="title">Quiz Title *</label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Enter an engaging quiz title"
                className={validationErrors.title ? 'error' : ''}
              />
              {validationErrors.title && (
                <span className="error-message">{validationErrors.title}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows="3"
                placeholder="Describe what this quiz is about"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  disabled={loadingCategories}
                  className={validationErrors.category ? 'error' : ''}
                >
                  <option value="">Select a category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                {validationErrors.category && (
                  <span className="error-message">{validationErrors.category}</span>
                )}
                {loadingCategories && (
                  <span className="loading-text">Loading categories...</span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="difficulty">Difficulty *</label>
                <select
                  id="difficulty"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                  className={validationErrors.difficulty ? 'error' : ''}
                >
                  <option value="easy">🟢 Easy</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="hard">🔴 Hard</option>
                </select>
                {validationErrors.difficulty && (
                  <span className="error-message">{validationErrors.difficulty}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
                />
                <span className="checkmark"></span>
                Publish quiz immediately (users can take it right away)
              </label>
            </div>

            <div className="form-actions">
              <button type="button" onClick={onCancel} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={nextStep} className="btn-primary">
                Next: Add Questions →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Questions */}
        {currentStep === 2 && (
          <div className="form-step">
            <div className="questions-header">
              <h3>Questions ({questions.length})</h3>
              <div className="add-question-buttons">
                {Object.entries(QUIZ_TYPE_CONFIG).map(([type, config]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addQuestion(type)}
                    className="btn-add-question"
                    title={config.description}
                  >
                    <span className="btn-icon">{config.icon}</span>
                    <span>Add {config.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {validationErrors.questions && (
              <div className="error-message global-error">
                {validationErrors.questions}
              </div>
            )}

            <div className="questions-list">
              {questions.map((question, index) => renderQuestionForm(question, index))}
            </div>

            {questions.length === 0 && (
              <div className="empty-questions">
                <div className="empty-icon">📝</div>
                <h4>No questions yet</h4>
                <p>Add your first question to get started!</p>
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={prevStep} className="btn-secondary">
                ← Back to Basics
              </button>
              <button 
                type="button" 
                onClick={nextStep} 
                className="btn-primary"
                disabled={questions.length === 0}
              >
                Next: Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="form-step">
            <h3>Review Your Quiz</h3>
            
            <div className="review-section">
              <div className="quiz-summary">
                <h4>{formData.title}</h4>
                <p>{formData.description}</p>
                <div className="quiz-meta">
                  <span className="meta-item">📂 {formData.category}</span>
                  <span className="meta-item">📊 {formData.difficulty}</span>
                  <span className="meta-item">❓ {questions.length} questions</span>
                  <span className="meta-item">🏆 {questions.reduce((sum, q) => sum + q.points, 0)} points</span>
                  <span className="meta-item">⏱️ ~{Math.ceil(questions.reduce((sum, q) => sum + q.time_limit_seconds, 0) / 60)} minutes</span>
                </div>
                <div className="publish-status">
                  <span className={`status-badge ${formData.is_published ? 'published' : 'draft'}`}>
                    {formData.is_published ? '✅ Will be published' : '📝 Save as draft'}
                  </span>
                </div>
              </div>

              <div className="questions-summary">
                <h5>Questions Overview</h5>
                {questions.map((question, index) => {
                  const config = QUIZ_TYPE_CONFIG[question.question_type]
                  return (
                    <div key={index} className="question-summary">
                      <div className="question-header">
                        <span className="question-number">Q{index + 1}</span>
                        <span className="question-type">{config?.icon} {config?.name}</span>
                        <span className="question-points">{question.points} pts</span>
                      </div>
                      <div className="question-text">{question.question_text}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={prevStep} className="btn-secondary">
                ← Back to Questions
              </button>
              <button type="button" onClick={onCancel} className="btn-secondary">
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {quiz ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {quiz ? '✅ Update Quiz' : '🚀 Create Quiz'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}