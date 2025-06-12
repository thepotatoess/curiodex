import { useState, useRef, useEffect } from 'react'
import '../css/QuizComments.css'

export function CommentSortSelector({ 
  currentSort, 
  onSortChange, 
  sortOptions, 
  sortLabels, 
  sortIcons,
  totalComments = 0 
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSortSelect = (sortOption) => {
    onSortChange(sortOption)
    setIsDropdownOpen(false)
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const currentLabel = sortLabels[currentSort]

  return (
    <div className="comment-sort-header">
      <div className="comment-count-display">
        <span className="comment-count-number">{totalComments}</span>
        <span className="comment-count-label">
          {totalComments === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      <div className="comment-sort-controls" ref={dropdownRef}>
        <span className="sort-by-label">Sort by</span>
        
        <div className="sort-selector-wrapper">
          <button
            onClick={toggleDropdown}
            className={`sort-selector-button ${isDropdownOpen ? 'active' : ''}`}
            aria-label={`Sort comments by ${currentLabel}`}
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
          >
            <span className="sort-current-label">{currentLabel}</span>
            <span className={`sort-chevron ${isDropdownOpen ? 'rotated' : ''}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path 
                  d="M3 4.5L6 7.5L9 4.5" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>

          {isDropdownOpen && (
            <div className="sort-dropdown-menu" role="listbox">
              {Object.values(sortOptions).map((option) => (
                <button
                  key={option}
                  onClick={() => handleSortSelect(option)}
                  className={`sort-dropdown-option ${currentSort === option ? 'selected' : ''}`}
                  role="option"
                  aria-selected={currentSort === option}
                >
                  <span className="sort-option-text">{sortLabels[option]}</span>
                  {currentSort === option && (
                    <span className="sort-option-checkmark">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path 
                          d="M11.667 3.5L5.25 9.917L2.333 7" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}