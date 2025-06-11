import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../css/QuizList.css'

export default function QuizList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [userAttempts, setUserAttempts] = useState([])
  
  // Search and filter states - initialize from URL parameters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')
  const [selectedDifficulty, setSelectedDifficulty] = useState(searchParams.get('difficulty') || 'all')
  const [selectedPlayedStatus, setSelectedPlayedStatus] = useState(searchParams.get('status') || 'all')
  const [availableCategories, setAvailableCategories] = useState([])

  useEffect(() => {
    loadQuizzes()
    loadUserAttempts()
  }, [])

  // Update filters when URL parameters change
  useEffect(() => {
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const random = searchParams.get('random')

    if (category && category !== selectedCategory) {
      setSelectedCategory(category)
    }
    if (difficulty && difficulty !== selectedDifficulty) {
      setSelectedDifficulty(difficulty)
    }
    if (status && status !== selectedPlayedStatus) {
      setSelectedPlayedStatus(status)
    }
    if (search && search !== searchTerm) {
      setSearchTerm(search)
    }

    // Handle random quiz
    if (random === 'true' && quizzes.length > 0) {
      const randomIndex = Math.floor(Math.random() * quizzes.length)
      const randomQuiz = quizzes[randomIndex]
      navigate(`/quiz/${randomQuiz.id}/preview`)
    }
  }, [searchParams, quizzes])

  // Update URL when filters change
  const updateURLParams = (newParams) => {
    const currentParams = Object.fromEntries(searchParams)
    const updatedParams = { ...currentParams, ...newParams }
    
    // Remove empty or 'all' values
    Object.keys(updatedParams).forEach(key => {
      if (!updatedParams[key] || updatedParams[key] === 'all') {
        delete updatedParams[key]
      }
    })

    setSearchParams(updatedParams)
  }

  const loadQuizzes = async () => {
    try {
      const [quizzesRes, categoriesRes] = await Promise.all([
        supabase
          .from('quizzes')
          .select('*, questions(id), user_quiz_attempts(id)')
          .eq('is_published', true)
          .order('created_at', { ascending: false }),

        supabase
          .from('quiz_categories')
          .select('name, icon, color')
          .eq('is_active', true)
      ])

      if (quizzesRes.error) throw quizzesRes.error
      if (categoriesRes.error) throw categoriesRes.error

      const quizzesData = quizzesRes.data
      const categories = categoriesRes.data

      const quizzesWithCategoryMeta = quizzesData.map(quiz => {
        const cat = categories.find(c => c.name === quiz.category)

        return {
          ...quiz,
          question_count: quiz.questions?.length || 0,
          total_attempts: quiz.user_quiz_attempts?.length || 0,
          category_name: cat?.name || quiz.category,
          category_icon: cat?.icon || '❓',
          category_color: cat?.color || '#6b7280'
        }
      })

      setQuizzes(quizzesWithCategoryMeta)
      
      // Set available categories for filter
      const uniqueCategories = [...new Set(quizzesWithCategoryMeta.map(q => q.category_name))]
      setAvailableCategories(uniqueCategories)
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

  // Updated: Now clicking on quiz card goes to preview page
  const handleQuizClick = (quizId) => {
    navigate(`/quiz/${quizId}/preview`)
  }

  // Function: Handle viewing quiz details
  const handleViewDetails = (e, quizId) => {
    e.stopPropagation() // Prevent the card click event
    navigate(`/quiz/${quizId}`)
  }

  // Function: Direct play (skip preview) - used for random quiz
  const handleDirectPlay = (quizId) => {
    navigate(`/quiz/${quizId}/play`)
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

  // Filter quizzes based on search and filters
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = searchTerm === '' || 
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.category_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || quiz.category_name === selectedCategory
    const matchesDifficulty = selectedDifficulty === 'all' || quiz.difficulty === selectedDifficulty
    
    // Check if user has played this quiz
    const hasPlayed = getUserBestScore(quiz.id) !== null
    const matchesPlayedStatus = selectedPlayedStatus === 'all' ||
      (selectedPlayedStatus === 'played' && hasPlayed) ||
      (selectedPlayedStatus === 'unplayed' && !hasPlayed)
    
    return matchesSearch && matchesCategory && matchesDifficulty && matchesPlayedStatus
  })

  const groupQuizzesByCategory = () => {
    return filteredQuizzes.reduce((acc, quiz) => {
      const category = quiz.category_name
      if (!acc[category]) {
        acc[category] = {
          icon: quiz.category_icon,
          color: quiz.category_color,
          quizzes: []
        }
      }
      acc[category].quizzes.push(quiz)
      return acc
    }, {})
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('all')
    setSelectedDifficulty('all')
    setSelectedPlayedStatus('all')
    setSearchParams({}) // Clear URL parameters
  }

  const startRandomQuiz = () => {
    if (filteredQuizzes.length === 0) return
    
    const randomIndex = Math.floor(Math.random() * filteredQuizzes.length)
    const randomQuiz = filteredQuizzes[randomIndex]
    handleDirectPlay(randomQuiz.id) // Skip preview for random quiz
  }

  // Handle filter changes with URL update
  const handleSearchChange = (value) => {
    setSearchTerm(value)
    updateURLParams({ search: value })
  }

  const handleCategoryChange = (value) => {
    setSelectedCategory(value)
    updateURLParams({ category: value })
  }

  const handleDifficultyChange = (value) => {
    setSelectedDifficulty(value)
    updateURLParams({ difficulty: value })
  }

  const handlePlayedStatusChange = (value) => {
    setSelectedPlayedStatus(value)
    updateURLParams({ status: value })
  }

  if (loading) return <div className="quiz-loading">Loading quizzes...</div>

  const grouped = groupQuizzesByCategory()
  const hasActiveFilters = searchTerm !== '' || selectedCategory !== 'all' || selectedDifficulty !== 'all' || selectedPlayedStatus !== 'all'

  return (
    <div className="quiz-list-container">
      <h1 className="quiz-list-title">Available Quizzes</h1>

      {/* Search and Filter Controls */}
      <div className="quiz-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search quizzes by name, description, or category..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <div className="filter-group">
            <label htmlFor="category-filter">Category:</label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              {availableCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="difficulty-filter">Difficulty:</label>
            <select
              id="difficulty-filter"
              value={selectedDifficulty}
              onChange={(e) => handleDifficultyChange(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="played-filter">Status:</label>
            <select
              id="played-filter"
              value={selectedPlayedStatus}
              onChange={(e) => handlePlayedStatusChange(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Quizzes</option>
              <option value="played">Played Before</option>
              <option value="unplayed">Not Played</option>
            </select>
          </div>

          <div className="action-buttons">
            <button
              onClick={startRandomQuiz}
              disabled={filteredQuizzes.length === 0}
              className="btn btn-success random-quiz-btn"
            >
              🎲 Random Quiz
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="btn btn-outline clear-filters-btn"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        {hasActiveFilters ? (
          <p>
            Showing {filteredQuizzes.length} of {quizzes.length} quizzes
            {searchTerm && <span> matching "{searchTerm}"</span>}
            {selectedCategory !== 'all' && <span> in {selectedCategory}</span>}
            {selectedDifficulty !== 'all' && <span> ({selectedDifficulty} difficulty)</span>}
            {selectedPlayedStatus !== 'all' && <span> ({selectedPlayedStatus})</span>}
          </p>
        ) : (
          <p>Showing all {quizzes.length} quizzes • Click on any quiz to see preview and start</p>
        )}
      </div>

      {/* Quiz List */}
      {filteredQuizzes.length === 0 ? (
        <div className="quiz-empty-state">
          {hasActiveFilters ? (
            <>
              <h3>No quizzes found</h3>
              <p>Try adjusting your search terms or filters.</p>
              <button onClick={clearFilters} className="btn btn-primary">
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <h3>No quizzes available yet</h3>
              <p>Check back later for new quizzes!</p>
            </>
          )}
        </div>
      ) : (
        <div className="quiz-grouped-list">
          {Object.entries(grouped).map(([categoryName, { icon, color, quizzes }]) => (
            <div key={categoryName} className="quiz-category-section">
              <h2 className="quiz-category-title" style={{ color }}>
                <span className="category-icon">{icon}</span> 
                {categoryName}
                <span className="category-count">({quizzes.length})</span>
              </h2>
              <div className="quiz-grid">
                {quizzes.map(quiz => {
                  const userBest = getUserBestScore(quiz.id)
                  return (
                    <div 
                      key={quiz.id} 
                      className="quiz-card quiz-card-clickable"
                      onClick={() => handleQuizClick(quiz.id)}
                    >
                      <div className="quiz-card-content">
                        <div className="quiz-info">
                          <h3 className="quiz-title">{quiz.title}</h3>
                          <p className="quiz-description">{quiz.description}</p>

                          <div className="quiz-meta">
                            <span className="quiz-meta-item">
                              <strong>Difficulty:</strong>
                              <span className="quiz-meta-value">{quiz.difficulty}</span>
                            </span>
                            <span className="quiz-meta-item">
                              <strong>Questions:</strong>
                              <span className="quiz-meta-value">{quiz.question_count}</span>
                            </span>
                            <span className="quiz-meta-item">
                              <strong>Times taken:</strong>
                              <span className="quiz-meta-value">{quiz.total_attempts}</span>
                            </span>
                          </div>

                          {userBest && (
                            <div className="user-score-box">
                              <strong>Your Best Score:</strong> {userBest.score}/{userBest.maxScore} ({userBest.percentage}%)
                              | <strong>Attempts:</strong> {userBest.attempts}
                            </div>
                          )}

                          {/* Hint for new quiz flow */}
                          <div className="quiz-card-hint">
                            <span className="hint-icon">💡</span>
                            <span className="hint-text">Click to preview questions and start quiz</span>
                          </div>
                        </div>

                        <div className="quiz-actions">
                          <button
                            onClick={(e) => handleViewDetails(e, quiz.id)}
                            className="btn btn-outline quiz-detail-btn"
                            title="View detailed statistics and similar quizzes"
                          >
                            📊 View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}