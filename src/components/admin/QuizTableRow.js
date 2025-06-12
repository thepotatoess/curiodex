import { memo } from 'react'

const QuizTableRow = memo(({ 
  quiz, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete, 
  availableCategories 
}) => {
  const getCategoryInfo = (categoryName) => {
    return availableCategories.find(c => c.name === categoryName) || {
      icon: '📚',
      color: '#6b7280'
    }
  }

  const categoryInfo = getCategoryInfo(quiz.category)

  return (
    <tr className={isSelected ? 'selected' : ''}>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(quiz.id, e.target.checked)}
          className="quiz-checkbox"
        />
      </td>
      
      <td className="quiz-title-cell">
        <h4 className="quiz-title">{quiz.title}</h4>
        <p className="quiz-description">
          {quiz.description || 'No description provided'}
        </p>
        <div className="quiz-meta">
          <div className="meta-row">
            <span>📝</span>
            <span>{quiz.question_count} questions</span>
          </div>
          <div className="meta-row">
            <span>🏆</span>
            <span>{quiz.total_points} points</span>
          </div>
          <div className="meta-row">
            <span>👤</span>
            <span>by {quiz.creator_name}</span>
          </div>
        </div>
      </td>
      
      <td>
        <div 
          className="category-badge"
          style={{ backgroundColor: categoryInfo.color }}
        >
          <span>{categoryInfo.icon}</span>
          <span>{quiz.category}</span>
        </div>
      </td>
      
      <td>
        <span className={`difficulty-badge difficulty-${quiz.difficulty}`}>
          {quiz.difficulty}
        </span>
      </td>
      
      <td>
        <span className={`status-badge ${quiz.is_published ? 'status-published' : 'status-draft'}`}>
          {quiz.is_published ? '✅ Published' : '📝 Draft'}
        </span>
      </td>
      
      <td>
        <div className="quiz-meta">
          <div className="meta-row">
            <span>🎯</span>
            <span>{quiz.total_attempts} attempts</span>
          </div>
          <div className="meta-row">
            <span>👥</span>
            <span>{quiz.unique_players} players</span>
          </div>
          {quiz.total_attempts > 0 && (
            <div className="meta-row">
              <span>📊</span>
              <span>{quiz.average_score}% avg</span>
            </div>
          )}
        </div>
      </td>
      
      <td>
        <div className="quiz-meta">
          <div>{new Date(quiz.created_at).toLocaleDateString()}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
            {new Date(quiz.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </td>
      
      <td>
        <div className="quiz-actions">
          <button
            onClick={() => onEdit(quiz)}
            className="action-btn primary"
            title="Edit quiz"
          >
            ✏️
          </button>
          
          <button
            onClick={() => onDelete(quiz)}
            className="action-btn danger"
            title="Delete quiz"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  )
})

QuizTableRow.displayName = 'QuizTableRow'

export default QuizTableRow