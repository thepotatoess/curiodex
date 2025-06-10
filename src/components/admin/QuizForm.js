import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

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

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_categories')
        .select('is_active', true)
        .order('name')
      
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const addQuestion = () => {
    setQuestions([...questions, {
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      points: 10
    }])
  }

  const updateQuestion = (index, field, value) => {
    const updated = [...questions]
    updated[index][field] = value
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

  const handleSubmit = async (e) => {
    e.preventDefault()
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
        const questionsPayload = questions.map((q, index) => ({
          quiz_id: quizId,
          question_text: q.question_text,
          question_type: q.question_type,
          options: JSON.stringify(q.options),
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          points: q.points,
          order_index: index
        }))

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

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h2>{quiz ? 'Edit Quiz' : 'Create New Quiz'}</h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows="3"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              required
              disabled={loadingCategories}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                backgroundColor: 'white',
                cursor: loadingCategories ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="">Select a category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            {loadingCategories && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Loading categories...
              </div>
            )}
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Difficulty</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={formData.is_published}
              onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
              style={{ marginRight: '8px' }}
            />
            Publish quiz (users can take it)
          </label>
        </div>

        <h3>Questions</h3>
        
        {questions.map((question, qIndex) => (
          <div key={qIndex} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4>Question {qIndex + 1}</h4>
              <button 
                type="button" 
                onClick={() => removeQuestion(qIndex)}
                style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px' }}
              >
                Remove
              </button>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Question Text *</label>
              <input
                type="text"
                value={question.question_text}
                onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Answer Options</label>
              {question.options.map((option, oIndex) => (
                <div key={oIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ marginRight: '10px', minWidth: '20px' }}>{String.fromCharCode(65 + oIndex)}:</span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                    style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Correct Answer *</label>
                <select
                  value={question.correct_answer}
                  onChange={(e) => updateQuestion(qIndex, 'correct_answer', e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="">Select correct answer</option>
                  {question.options.map((option, oIndex) => (
                    <option key={oIndex} value={option}>
                      {String.fromCharCode(65 + oIndex)}: {option}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Points</label>
                <input
                  type="number"
                  value={question.points}
                  onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value))}
                  min="1"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Explanation (optional)</label>
              <textarea
                value={question.explanation}
                onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                rows="2"
                placeholder="Explain why this answer is correct..."
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          </div>
        ))}

        <button 
          type="button" 
          onClick={addQuestion}
          style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '20px' }}
        >
          Add Question
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '12px 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            {loading ? 'Saving...' : (quiz ? 'Update Quiz' : 'Create Quiz')}
          </button>
          
          <button 
            type="button" 
            onClick={onCancel}
            style={{ padding: '12px 24px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}