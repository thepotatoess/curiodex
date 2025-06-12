import { memo } from 'react'

const QuizFilters = memo(({
  searchTerm,
  categoryFilter,
  difficultyFilter,
  statusFilter,
  availableCategories,
  onSearchChange,
  onCategoryChange,
  onDifficultyChange,
  onStatusChange,
  onClearFilters,
  activeFilters,
  onRemoveFilter
}) => {
  return (
    <div className="quiz-filters">
      <div className="filters-row">
        <div className="filter-group">
          <label className="filter-label">Search Quizzes</label>
          <input
            type="text"
            placeholder="   Search by title, description, category, or creator..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="filter-input search-input"
          />
        </div>
        
        <div className="filter-group">
          <label className="filter-label">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {availableCategories.map(cat => (
              <option key={cat.name} value={cat.name}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-label">Difficulty</label>
          <select
            value={difficultyFilter}
            onChange={(e) => onDifficultyChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        
        <div className="filters-actions">
          {activeFilters.length > 0 && (
            <button 
              onClick={onClearFilters}
              className="btn btn-secondary btn-sm"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="active-filters">
          <div className="filter-tags">
            {activeFilters.map((filter, index) => (
              <div key={index} className="filter-tag">
                <span>{filter.type}: {filter.value}</span>
                <button 
                  onClick={() => onRemoveFilter(filter.type)}
                  className="filter-tag-remove"
                  title={`Remove ${filter.type} filter`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

QuizFilters.displayName = 'QuizFilters'

export default QuizFilters