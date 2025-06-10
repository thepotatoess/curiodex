import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import QuizForm from './QuizForm'
import { useToast, ToastContainer } from '../Toast'
import { ConfirmModal } from '../ConfirmModal'

export default function QuizManager() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, quiz: null })
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    loadQuizzes()
  }, [])

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions(id),
          user_quiz_attempts(id)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const quizzesWithCounts = data.map(quiz => ({
        ...quiz,
        question_count: quiz.questions?.length || 0,
        play_count: quiz.user_quiz_attempts?.length || 0
      }))

      setQuizzes(quizzesWithCounts)
    } catch (error) {
      console.error('Error loading quizzes:', error)
      addToast('Failed to load quizzes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', deleteModal.quiz.id)

      if (error) throw error

      addToast('Quiz deleted successfully', 'success')
      loadQuizzes()
    } catch (error) {
      console.error('Error deleting quiz:', error)
      addToast('Failed to delete quiz', 'error')
    } finally {
      setDeleteModal({ isOpen: false, quiz: null })
    }
  }

  const handleEdit = async (quiz) => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions(*)
        `)
        .eq('id', quiz.id)
        .single()

      if (error) throw error

      const quizWithParsedQuestions = {
        ...data,
        questions: data.questions.map(q => ({
          ...q,
          options: JSON.parse(q.options || '[]')
        }))
      }

      setEditingQuiz(quizWithParsedQuestions)
      setShowForm(true)
    } catch (error) {
      console.error('Error loading quiz for editing:', error)
      addToast('Failed to load quiz for editing', 'error')
    }
  }

  const handleFormSuccess = (message) => {
    setShowForm(false)
    setEditingQuiz(null)
    loadQuizzes()
    addToast(message, 'success')
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingQuiz(null)
  }

  if (showForm) {
    return (
      <>
        <QuizForm 
          quiz={editingQuiz}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    )
  }

  if (loading) return <div style={{ padding: '20px' }}>Loading quizzes...</div>

  return (
    <>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Quiz Management</h1>
          <button 
            onClick={() => setShowForm(true)}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create New Quiz
          </button>
        </div>

        {quizzes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h3>No quizzes yet</h3>
            <p>Create your first quiz to get started!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {quizzes.map(quiz => (
              <div key={quiz.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>{quiz.title}</h3>
                    <p style={{ margin: '0 0 10px 0', color: '#666' }}>{quiz.description}</p>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#666' }}>
                      <span style={{ textTransform: 'capitalize' }}>Category: {quiz.category}</span>
                      <span style={{ textTransform: 'capitalize' }}>Difficulty: {quiz.difficulty}</span>
                      <span style={{ textTransform: 'capitalize' }}>Questions: {quiz.question_count}</span>
                      <span style={{ textTransform: 'capitalize' }}>Status: {quiz.is_published ? 'Published' : 'Draft'}</span>
                      <span style={{ textTransform: 'capitalize' }}>Times Played: {quiz.play_count}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                      Created: {new Date(quiz.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleEdit(quiz)}
                      style={{ 
                        padding: '8px 16px', 
                        backgroundColor: '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setDeleteModal({ isOpen: true, quiz })}
                      style={{ 
                        padding: '8px 16px', 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Quiz"
        message={`Are you sure you want to delete "${deleteModal.quiz?.title}"? This will permanently delete the quiz and all its questions. This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, quiz: null })}
        confirmText="Delete Quiz"
        danger={true}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  )
}