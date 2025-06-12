import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useCategories } from '../../contexts/CategoryContext'
import QuizForm from './QuizForm'
import QuizTableRow from './QuizTableRow'
import Pagination from './Pagination'
import QuizFilters from './QuizFilters'
import { useToast, ToastContainer } from '../Toast'
import { ConfirmModal } from '../ConfirmModal'
import '../../css/EnhancedQuizManager.css'

export default function EnhancedQuizManager() {
  // State management
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState(null)
  
  // Selection and bulk operations
  const [selectedQuizzes, setSelectedQuizzes] = useState(new Set())
  const [selectAll, setSelectAll] = useState(false)
  
  // Filtering and search
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  
  // Modals and UI
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, quizzes: [] })
  const [bulkDeleteModal, setBulkDeleteModal] = useState({ isOpen: false })
  const [publishModal, setPublishModal] = useState({ isOpen: false, quizzes: [], action: 'publish' })
  
  const { toasts, addToast, removeToast } = useToast()
  const { refreshCategories, availableCategories } = useCategories()

  // Load data on mount
  useEffect(() => {
    loadQuizzes()
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, difficultyFilter, statusFilter])

  const loadQuizzes = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions(id, points),
          user_quiz_attempts(id, user_id),
          profiles!quizzes_created_by_fkey(username, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process quiz data with enhanced metadata
      const processedQuizzes = data.map(quiz => {
        const uniqueUsers = new Set(quiz.user_quiz_attempts?.map(a => a.user_id) || [])
        
        return {
          ...quiz,
          question_count: quiz.questions?.length || 0,
          total_points: quiz.questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0,
          total_attempts: quiz.user_quiz_attempts?.length || 0,
          unique_players: uniqueUsers.size,
          creator_name: quiz.profiles?.username || quiz.profiles?.email || 'Unknown',
          // Calculate average score if there are attempts
          average_score: quiz.user_quiz_attempts?.length > 0 
            ? Math.round(quiz.user_quiz_attempts.reduce((sum, attempt) => {
                return sum + (attempt.score / attempt.max_score) * 100
              }, 0) / quiz.user_quiz_attempts.length)
            : 0
        }
      })

      setQuizzes(processedQuizzes)
    } catch (error) {
      console.error('Error loading quizzes:', error)
      addToast('Failed to load quizzes', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filtered and sorted quizzes
  const filteredQuizzes = useMemo(() => {
    let filtered = quizzes.filter(quiz => {
      const matchesSearch = searchTerm === '' || 
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.creator_name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = categoryFilter === 'all' || quiz.category === categoryFilter
      const matchesDifficulty = difficultyFilter === 'all' || quiz.difficulty === difficultyFilter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'published' && quiz.is_published) ||
        (statusFilter === 'draft' && !quiz.is_published)
      
      return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus
    })

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      
      // Handle different data types
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [quizzes, searchTerm, categoryFilter, difficultyFilter, statusFilter, sortField, sortDirection])

  // Paginated quizzes
  const paginatedQuizzes = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredQuizzes.slice(start, end)
  }, [filteredQuizzes, currentPage, pageSize])

  // Statistics
  const stats = useMemo(() => {
    return {
      total: quizzes.length,
      published: quizzes.filter(q => q.is_published).length,
      drafts: quizzes.filter(q => !q.is_published).length,
      totalAttempts: quizzes.reduce((sum, q) => sum + q.total_attempts, 0)
    }
  }, [quizzes])

  // Pagination info
  const totalPages = Math.ceil(filteredQuizzes.length / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, filteredQuizzes.length)

  // Event handlers
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField, sortDirection])

  const handleSelectQuiz = useCallback((quizId, checked) => {
    setSelectedQuizzes(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(quizId)
      } else {
        newSet.delete(quizId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedQuizzes(new Set(paginatedQuizzes.map(q => q.id)))
      setSelectAll(true)
    } else {
      setSelectedQuizzes(new Set())
      setSelectAll(false)
    }
  }, [paginatedQuizzes])

  const clearFilters = () => {
    setSearchTerm('')
    setCategoryFilter('all')
    setDifficultyFilter('all')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  const clearSelection = () => {
    setSelectedQuizzes(new Set())
    setSelectAll(false)
  }

  // CRUD Operations
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

  const handleDelete = async (quizzes) => {
    const quizIds = Array.isArray(quizzes) ? quizzes.map(q => q.id) : [quizzes.id]
    const isMultiple = quizIds.length > 1
    
    try {
      // Delete in the correct order: attempts -> questions -> quiz
      for (const quizId of quizIds) {
        const { error: attemptsError } = await supabase
          .from('user_quiz_attempts')
          .delete()
          .eq('quiz_id', quizId)
        
        if (attemptsError) throw attemptsError

        const { error: questionsError } = await supabase
          .from('questions')
          .delete()
          .eq('quiz_id', quizId)
        
        if (questionsError) throw questionsError

        const { error: quizError } = await supabase
          .from('quizzes')
          .delete()
          .eq('id', quizId)

        if (quizError) throw quizError
      }

      addToast(
        isMultiple 
          ? `${quizIds.length} quizzes deleted successfully` 
          : 'Quiz deleted successfully', 
        'success'
      )
      
      loadQuizzes()
      clearSelection()
      refreshCategories()
    } catch (error) {
      console.error('Error deleting quiz(es):', error)
      addToast('Failed to delete quiz(es): ' + error.message, 'error')
    }
  }

  const handleBulkPublish = async (action) => {
    const selectedQuizList = quizzes.filter(q => selectedQuizzes.has(q.id))
    const isPublish = action === 'publish'
    
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_published: isPublish })
        .in('id', Array.from(selectedQuizzes))

      if (error) throw error

      addToast(
        `${selectedQuizList.length} quizzes ${isPublish ? 'published' : 'unpublished'} successfully`,
        'success'
      )
      
      loadQuizzes()
      clearSelection()
      refreshCategories()
    } catch (error) {
      console.error('Error updating quiz status:', error)
      addToast('Failed to update quiz status: ' + error.message, 'error')
    }
  }

  const handleFormSuccess = (message) => {
    setShowForm(false)
    setEditingQuiz(null)
    loadQuizzes()
    addToast(message, 'success')
    refreshCategories()
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingQuiz(null)
  }

  // Get active filters for display
  const activeFilters = []
  if (searchTerm) activeFilters.push({ type: 'search', value: searchTerm })
  if (categoryFilter !== 'all') activeFilters.push({ type: 'category', value: categoryFilter })
  if (difficultyFilter !== 'all') activeFilters.push({ type: 'difficulty', value: difficultyFilter })
  if (statusFilter !== 'all') activeFilters.push({ type: 'status', value: statusFilter })

  const removeFilter = (filterType) => {
    switch (filterType) {
      case 'search': setSearchTerm(''); break
      case 'category': setCategoryFilter('all'); break
      case 'difficulty': setDifficultyFilter('all'); break
      case 'status': setStatusFilter('all'); break
    }
  }

  // Show form if editing or creating
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

  if (loading) {
    return (
      <div className="quiz-manager-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading quizzes...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="quiz-manager-container">
        {/* Header Section */}
        <div className="quiz-manager-header">
          <div className="header-top">
            <div>
              <h1 className="header-title">Quiz Management</h1>
              <div className="quiz-manager-stats">
                <div className="stat-item">
                  <span className="stat-value">{stats.total}</span>
                  <span className="stat-label">Total Quizzes</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{stats.published}</span>
                  <span className="stat-label">Published</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{stats.drafts}</span>
                  <span className="stat-label">Drafts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{stats.totalAttempts}</span>
                  <span className="stat-label">Total Attempts</span>
                </div>
              </div>
            </div>
            
            <div className="header-actions">
              <button 
                onClick={() => setShowForm(true)}
                className="btn btn-primary"
              >
                <span>➕</span>
                <span>Create Quiz</span>
              </button>
              
              <button 
                onClick={loadQuizzes}
                className="btn btn-secondary"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <QuizFilters
          searchTerm={searchTerm}
          categoryFilter={categoryFilter}
          difficultyFilter={difficultyFilter}
          statusFilter={statusFilter}
          availableCategories={availableCategories}
          onSearchChange={setSearchTerm}
          onCategoryChange={setCategoryFilter}
          onDifficultyChange={setDifficultyFilter}
          onStatusChange={setStatusFilter}
          onClearFilters={clearFilters}
          activeFilters={activeFilters}
          onRemoveFilter={removeFilter}
        />

        {/* Bulk Actions Bar */}
        {selectedQuizzes.size > 0 && (
          <div className="bulk-actions-bar">
            <div className="bulk-info">
              {selectedQuizzes.size} quiz{selectedQuizzes.size !== 1 ? 'es' : ''} selected
            </div>
            
            <div className="bulk-actions">
              <button 
                onClick={() => setPublishModal({ isOpen: true, action: 'publish' })}
                className="bulk-btn"
              >
                📢 Publish Selected
              </button>
              
              <button 
                onClick={() => setPublishModal({ isOpen: true, action: 'unpublish' })}
                className="bulk-btn"
              >
                📝 Unpublish Selected
              </button>
              
              <button 
                onClick={() => setBulkDeleteModal({ isOpen: true })}
                className="bulk-btn danger"
              >
                🗑️ Delete Selected
              </button>
              
              <button 
                onClick={clearSelection}
                className="bulk-btn"
              >
                ✕ Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Quiz Table */}
        {filteredQuizzes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h3>
              {quizzes.length === 0 
                ? 'No quizzes yet'
                : 'No quizzes match your filters'
              }
            </h3>
            <p>
              {quizzes.length === 0 
                ? 'Create your first quiz to get started!'
                : 'Try adjusting your search terms or filters.'
              }
            </p>
            {quizzes.length === 0 ? (
              <button 
                onClick={() => setShowForm(true)}
                className="btn btn-primary"
              >
                Create Your First Quiz
              </button>
            ) : (
              <button 
                onClick={clearFilters}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="quiz-table-container">
              <table className="quiz-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectAll && paginatedQuizzes.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="quiz-checkbox"
                      />
                    </th>
                    <th 
                      className="sortable"
                      onClick={() => handleSort('title')}
                    >
                      Quiz Details
                      <span className={`sort-indicator ${sortField === 'title' ? 'active' : ''}`}>
                        {sortField === 'title' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </th>
                    <th>Category</th>
                    <th 
                      className="sortable"
                      onClick={() => handleSort('difficulty')}
                    >
                      Difficulty
                      <span className={`sort-indicator ${sortField === 'difficulty' ? 'active' : ''}`}>
                        {sortField === 'difficulty' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </th>
                    <th 
                      className="sortable"
                      onClick={() => handleSort('is_published')}
                    >
                      Status
                      <span className={`sort-indicator ${sortField === 'is_published' ? 'active' : ''}`}>
                        {sortField === 'is_published' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </th>
                    <th>Performance</th>
                    <th 
                      className="sortable"
                      onClick={() => handleSort('created_at')}
                    >
                      Created
                      <span className={`sort-indicator ${sortField === 'created_at' ? 'active' : ''}`}>
                        {sortField === 'created_at' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedQuizzes.map((quiz) => (
                    <QuizTableRow
                      key={quiz.id}
                      quiz={quiz}
                      isSelected={selectedQuizzes.has(quiz.id)}
                      onSelect={handleSelectQuiz}
                      onEdit={handleEdit}
                      onDelete={(quiz) => setDeleteModal({ isOpen: true, quizzes: [quiz] })}
                      availableCategories={availableCategories}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredQuizzes.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize)
                setCurrentPage(1)
              }}
            />
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={`Delete Quiz${deleteModal.quizzes.length > 1 ? 'es' : ''}?`}
        message={
          <div>
            <p>
              Are you sure you want to delete <strong>
                {deleteModal.quizzes.length === 1 
                  ? `"${deleteModal.quizzes[0]?.title}"`
                  : `${deleteModal.quizzes.length} quizzes`
                }
              </strong>?
            </p>
            
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
                <li>The quiz{deleteModal.quizzes.length > 1 ? 'es' : ''} and all questions</li>
                <li>ALL user attempts and scores</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
            
            {deleteModal.quizzes.length === 1 && deleteModal.quizzes[0] && (
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                This quiz has been played <strong>{deleteModal.quizzes[0].total_attempts}</strong> times 
                by <strong>{deleteModal.quizzes[0].unique_players}</strong> unique players.
              </p>
            )}
          </div>
        }
        onConfirm={() => {
          handleDelete(deleteModal.quizzes)
          setDeleteModal({ isOpen: false, quizzes: [] })
        }}
        onCancel={() => setDeleteModal({ isOpen: false, quizzes: [] })}
        confirmText="Delete Everything"
        danger={true}
      />

      {/* Bulk Delete Modal */}
      <ConfirmModal
        isOpen={bulkDeleteModal.isOpen}
        title="Delete Selected Quizzes?"
        message={
          <div>
            <p>
              Are you sure you want to delete <strong>{selectedQuizzes.size} quizzes</strong>?
            </p>
            
            <div style={{ 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '6px', 
              padding: '12px', 
              margin: '12px 0',
              color: '#991b1b'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>⚠️ WARNING:</p>
              <p style={{ margin: '0' }}>
                This will permanently delete all selected quizzes, their questions, 
                and ALL associated user attempts. This action cannot be undone.
              </p>
            </div>
          </div>
        }
        onConfirm={() => {
          const selectedQuizList = quizzes.filter(q => selectedQuizzes.has(q.id))
          handleDelete(selectedQuizList)
          setBulkDeleteModal({ isOpen: false })
        }}
        onCancel={() => setBulkDeleteModal({ isOpen: false })}
        confirmText="Delete All Selected"
        danger={true}
      />

      {/* Bulk Publish Modal */}
      <ConfirmModal
        isOpen={publishModal.isOpen}
        title={`${publishModal.action === 'publish' ? 'Publish' : 'Unpublish'} Selected Quizzes?`}
        message={
          <div>
            <p>
              Are you sure you want to <strong>
                {publishModal.action === 'publish' ? 'publish' : 'unpublish'}
              </strong> {selectedQuizzes.size} quizzes?
            </p>
            
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              {publishModal.action === 'publish' 
                ? 'Published quizzes will become visible to all users and can be taken.'
                : 'Unpublished quizzes will become drafts and won\'t be visible to users.'
              }
            </p>
          </div>
        }
        onConfirm={() => {
          handleBulkPublish(publishModal.action)
          setPublishModal({ isOpen: false, action: 'publish' })
        }}
        onCancel={() => setPublishModal({ isOpen: false, action: 'publish' })}
        confirmText={publishModal.action === 'publish' ? 'Publish Selected' : 'Unpublish Selected'}
        danger={false}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  )
}