import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import QuizTaking from './QuizTaking'

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [takingQuiz, setTakingQuiz] = useState(null)
  const [userAttempts, setUserAttempts] = useState([])

  useEffect(() => {
    loadQuizzes()
    loadUserAttempts()
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
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      const quizzesWithCounts = data.map(quiz => ({
        ...quiz,
        question_count: quiz.questions?.length || 0,
        total_attempts: quiz.user_quiz_attempts?.length || 0
      }))

      setQuizzes(quizzesWithCounts)
    } catch (error) {
      console.error('Error loading quizzes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserAttempts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data, error } = await supabase
          .from('user_quiz_attempts')
          .select('quiz_id, score, max_score, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })

        if (error) throw error
        setUserAttempts(data || [])
      }
    } catch (error) {
      console.error('Error loading user attempts:', error)
    }
  }

  const startQuiz = (quizId) => {
    setTakingQuiz(quizId)
  }

  const finishQuiz = () => {
    setTakingQuiz(null)
    loadQuizzes() // Refresh to update attempt counts
    loadUserAttempts() // Refresh user attempts
  }

  const getUserBestScore = (quizId) => {
    const attempts = userAttempts.filter(attempt => attempt.quiz_id === quizId)
    if (attempts.length === 0) return null
    
    const bestAttempt = attempts.reduce((best, current) => 
      (current.score / current.max_score) > (best.score / best.max_score) ? current : best
    )
    
    return {
      score: bestAttempt.score,
      maxScore: bestAttempt.max_score,
      percentage: Math.round((bestAttempt.score / bestAttempt.max_score) * 100),
      attempts: attempts.length
    }
  }

  if (takingQuiz) {
    return (
      <QuizTaking
        quizId={takingQuiz}
        onComplete={finishQuiz}
        onCancel={finishQuiz}
      />
    )
  }

  if (loading) return <div style={{ padding: '20px' }}>Loading quizzes...</div>

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Available Quizzes</h1>
      
      {quizzes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No quizzes available yet</h3>
          <p>Check back later for new quizzes!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {quizzes.map(quiz => {
            const userBest = getUserBestScore(quiz.id)
            
            return (
              <div key={quiz.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: '#f8f9fa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{quiz.title}</h3>
                    <p style={{ margin: '0 0 15px 0', color: '#666' }}>{quiz.description}</p>
                    
                    <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                      <span style={{ textTransform: 'capitalize' }}><strong>Category:</strong> {quiz.category}</span>
                      <span style={{ textTransform: 'capitalize' }}><strong>Difficulty:</strong> {quiz.difficulty}</span>
                      <span style={{ textTransform: 'capitalize' }}><strong>Questions:</strong> {quiz.question_count}</span>
                      <span style={{ textTransform: 'capitalize' }}><strong>Times taken:</strong> {quiz.total_attempts}</span>
                    </div>

                    {userBest && (
                      <div style={{ 
                        backgroundColor: '#e3f2fd', 
                        padding: '10px', 
                        borderRadius: '4px', 
                        fontSize: '14px',
                        marginBottom: '10px'
                      }}>
                        <strong>Your Best Score:</strong> {userBest.score}/{userBest.maxScore} ({userBest.percentage}%) 
                        | <strong>Attempts:</strong> {userBest.attempts}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => startQuiz(quiz.id)}
                    style={{ 
                      padding: '12px 24px', 
                      backgroundColor: '#007bff', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    {userBest ? 'Retake Quiz' : 'Start Quiz'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}