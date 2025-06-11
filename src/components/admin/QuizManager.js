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

  // Deletes quiz and all attempts on that quiz.
  const handleDelete = async () => {
    try {
      const quizId = deleteModal.quiz.id

      // Delete all user quiz attempts before deleting the quiz.
      const { error: attemptsError } = await supabase
        .from('user_quiz_attempts')
        .delete()
        .eq('quiz_id', quizId)
      
      if (attemptsError) throw attemptsError

      // Delete all questions for this quiz
      const { error: questionError } = await supabase
        .from('questions')
        .delete()
        .eq('quiz_id', quizId)
      
      if (questionError) throw questionError

      // Delete the quiz itself
      const { error: quizError } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', deleteModal.quiz.id)

      if (quizError) throw quizError

      addToast('Quiz and all related data deleted successfully', 'success')
      loadQuizzes()
    } catch (error) {
      console.error('Error deleting quiz:', error)
      addToast('Failed to delete quiz: ' + error.message, 'error')
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
        message={
          <div>
            <p>Are you sure you want to delete <strong>"{deleteModal.quiz?.title}"</strong>?</p>
            
            <div style={{ 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '6px', 
              padding: '12px', 
              margin: '12px 0',
              color: '#991b1b'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>⚠️ WARNING:</p>
              <p style={{ margin: '0 0 4px 0' }}>This will permanently delete:</p>
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                <li>The quiz and all its questions</li>
                <li>ALL user attempts and scores for this quiz</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
            
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              This quiz have been played <strong>{deleteModal.quiz?.play_count || 0}</strong> times.
            </p>
          </div>
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, quiz: null })}
        confirmText="Delete Everything"
        danger={true}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  )
}