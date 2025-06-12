import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useCategories } from '../../contexts/CategoryContext'
import EnhancedQuizForm from './EnhancedQuizForm'
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
    loadQuizzes2()
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, difficultyFilter, statusFilter])

  const loadQuizzes2 = async () => {
    try {
      setLoading(true)
      
      // Simplified query - let's start with basic quiz data only
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false })

      if (quizzesError) {
        console.error('Quiz query error:', quizzesError)
        throw quizzesError
      }

      console.log('Loaded quizzes:', quizzesData) // Debug log

      // Load questions count separately for each quiz
      const quizzesWithCounts = await Promise.all(
        (quizzesData || []).map(async (quiz) => {
          try {
            // Get question count
            const { data: questionsData, error: questionsError } = await supabase
              .from('questions')
              .select('id')
              .eq('quiz_id', quiz.id)

            if (questionsError) {
              console.warn(`Error loading questions for quiz ${quiz.id}:`, questionsError)
            }

            // Get play count
            const { data: attemptsData, error: attemptsError } = await supabase
              .from('user_quiz_attempts')
              .select('id')
              .eq('quiz_id', quiz.id)

            if (attemptsError) {
              console.warn(`Error loading attempts for quiz ${quiz.id}:`, attemptsError)
            }

            return {
              ...quiz,
              question_count: questionsData?.length || 0,
              play_count: attemptsData?.length || 0
            }
          } catch (error) {
            console.error(`Error processing quiz ${quiz.id}:`, error)
            return {
              ...quiz,
              question_count: 0,
              play_count: 0
            }
          }
        })
      )

      setQuizzes(quizzesWithCounts)
      
    } catch (error) {
      console.error('Error loading quizzes:', error)
      addToast('Failed to load quizzes: ' + error.message, 'error')
      // Set empty array on error to prevent crashes
      setQuizzes([])
    } finally {
      setLoading(false)
    }
  }

  // Quiz statistics calculation
  const stats = useMemo(() => {
    return {
      total: quizzes.length,
      published: quizzes.filter(q => q.is_published).length,
      drafts: quizzes.filter(q => !q.is_published).length,
      totalAttempts: quizzes.reduce((sum, q) => sum + (q.play_count || 0), 0)
    }
  }, [quizzes])

  // Filtering logic
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      const matchesSearch = !searchTerm || 
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = categoryFilter === 'all' || quiz.category === categoryFilter
      const matchesDifficulty = difficultyFilter === 'all' || quiz.difficulty === difficultyFilter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'published' && quiz.is_published) ||
        (statusFilter === 'draft' && !quiz.is_published)

      return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus
    })
  }, [quizzes, searchTerm, categoryFilter, difficultyFilter, statusFilter])

  // Sorting logic
  const sortedQuizzes = useMemo(() => {
    return [...filteredQuizzes].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // Handle date fields
      if (sortField === 'created_at' || sortField === 'updated_at') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      // Handle string fields
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
  }, [filteredQuizzes, sortField, sortDirection])

  // Pagination logic
  const paginatedQuizzes = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedQuizzes.slice(startIndex, startIndex + pageSize)
  }, [sortedQuizzes, currentPage, pageSize])

  const totalPages = Math.ceil(sortedQuizzes.length / pageSize)

  // Active filters for display
  const activeFilters = useMemo(() => {
    const filters = []
    if (searchTerm) filters.push({ type: 'search', value: searchTerm, label: `Search: "${searchTerm}"` })
    if (categoryFilter !== 'all') filters.push({ type: 'category', value: categoryFilter, label: `Category: ${categoryFilter}` })
    if (difficultyFilter !== 'all') filters.push({ type: 'difficulty', value: difficultyFilter, label: `Difficulty: ${difficultyFilter}` })
    if (statusFilter !== 'all') filters.push({ type: 'status', value: statusFilter, label: `Status: ${statusFilter}` })
    return filters
  }, [searchTerm, categoryFilter, difficultyFilter, statusFilter])

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

  const removeFilter = (filterType) => {
    switch (filterType) {
      case 'search':
        setSearchTerm('')
        break
      case 'category':
        setCategoryFilter('all')
        break
      case 'difficulty':
        setDifficultyFilter('all')
        break
      case 'status':
        setStatusFilter('all')
        break
    }
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
        questions: data.questions.map(q => {
          const parsed = { ...q }
          
          // Parse different question type data
          if (q.question_type === 'multiple_choice' && q.options) {
            parsed.options = JSON.parse(q.options)
          }
          
          if (q.question_type === 'map_click' && q.map_data) {
            parsed.map_data = JSON.parse(q.map_data)
          }
          
          return parsed
        })
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
      
      loadQuizzes2()
      clearSelection()
    } catch (error) {
      console.error('Error deleting quiz(zes):', error)
      addToast('Failed to delete quiz(zes)', 'error')
    }
  }

  const handleBulkAction = async (action, quizIds) => {
    try {
      const updateData = {}
      
      if (action === 'publish') {
        updateData.is_published = true
      } else if (action === 'unpublish') {
        updateData.is_published = false
      }

      for (const quizId of quizIds) {
        const { error } = await supabase
          .from('quizzes')
          .update(updateData)
          .eq('id', quizId)

        if (error) throw error
      }

      addToast(
        `${quizIds.length} quiz${quizIds.length > 1 ? 'es' : ''} ${action}ed successfully`,
        'success'
      )
      
      loadQuizzes2()
      clearSelection()
    } catch (error) {
      console.error(`Error ${action}ing quizzes:`, error)
      addToast(`Failed to ${action} quizzes`, 'error')
    }
  }

  // Form handlers
  const handleFormSuccess = (message) => {
    addToast(message, 'success')
    setShowForm(false)
    setEditingQuiz(null)
    loadQuizzes2()
    refreshCategories()
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingQuiz(null)
  }

  // Show form when creating/editing
  if (showForm) {
    return (
      <>
        <EnhancedQuizForm
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
                onClick={loadQuizzes2}
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
                    <th 
                      className="sortable"
                      onClick={() => handleSort('category')}
                    >
                      Category
                      <span className={`sort-indicator ${sortField === 'category' ? 'active' : ''}`}>
                        {sortField === 'category' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </th>
                    <th 
                      className="sortable"
                      onClick={() => handleSort('difficulty')}
                    >
                      Difficulty
                      <span className={`sort-indicator ${sortField === 'difficulty' ? 'active' : ''}`}>
                        {sortField === 'difficulty' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </th>
                    <th>Status</th>
                    <th>Stats</th>
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
                  {paginatedQuizzes.map(quiz => (
                    <QuizTableRow
                      key={quiz.id}
                      quiz={quiz}
                      isSelected={selectedQuizzes.has(quiz.id)}
                      onSelect={handleSelectQuiz}
                      onEdit={handleEdit}
                      onDelete={(quiz) => setDeleteModal({ isOpen: true, quizzes: [quiz] })}
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
              totalItems={sortedQuizzes.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          title="Delete Quiz"
          message={
            <div>
              <p>Are you sure you want to delete this quiz?</p>
              <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
                This will also delete all questions and user attempts. This action cannot be undone.
              </p>
            </div>
          }
          onConfirm={() => {
            handleDelete(deleteModal.quizzes)
            setDeleteModal({ isOpen: false, quizzes: [] })
          }}
          onCancel={() => setDeleteModal({ isOpen: false, quizzes: [] })}
          confirmText="Delete Quiz"
          danger={true}
        />

        {/* Bulk Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={bulkDeleteModal.isOpen}
          title="Delete Selected Quizzes"
          message={
            <div>
              <p>Are you sure you want to delete {selectedQuizzes.size} selected quiz{selectedQuizzes.size > 1 ? 'es' : ''}?</p>
              <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
                This will also delete all questions and user attempts. This action cannot be undone.
              </p>
            </div>
          }
          onConfirm={() => {
            const selectedQuizObjects = paginatedQuizzes.filter(q => selectedQuizzes.has(q.id))
            handleDelete(selectedQuizObjects)
            setBulkDeleteModal({ isOpen: false })
          }}
          onCancel={() => setBulkDeleteModal({ isOpen: false })}
          confirmText="Delete Quizzes"
          danger={true}
        />

        {/* Publish/Unpublish Confirmation Modal */}
        <ConfirmModal
          isOpen={publishModal.isOpen}
          title={`${publishModal.action === 'publish' ? 'Publish' : 'Unpublish'} Selected Quizzes`}
          message={
            <p>
              Are you sure you want to {publishModal.action} {selectedQuizzes.size} selected quiz{selectedQuizzes.size > 1 ? 'es' : ''}?
            </p>
          }
          onConfirm={() => {
            handleBulkAction(publishModal.action, Array.from(selectedQuizzes))
            setPublishModal({ isOpen: false, action: 'publish' })
          }}
          onCancel={() => setPublishModal({ isOpen: false, action: 'publish' })}
          confirmText={publishModal.action === 'publish' ? 'Publish' : 'Unpublish'}
        />
      </div>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  )
}