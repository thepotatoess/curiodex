import '../css/QuizComments.css'

export function VotingButtons({ 
  commentId, 
  voteScore, 
  userVote, 
  isVoting, 
  onVote, 
  canVote = true,
  size = 'normal' // 'normal' or 'small' for replies
}) {
  const handleUpvote = () => {
    if (canVote && !isVoting) {
      onVote(commentId, 1, voteScore)
    }
  }

  const handleDownvote = () => {
    if (canVote && !isVoting) {
      onVote(commentId, -1, voteScore)
    }
  }

  // Determine button states
  const isUpvoted = userVote === 1
  const isDownvoted = userVote === -1
  const isDisabled = !canVote || isVoting

  // Get score display color
  const getScoreColor = () => {
    if (voteScore > 0) return '#10b981' // Green for positive
    if (voteScore < 0) return '#ef4444' // Red for negative
    return '#6b7280' // Gray for neutral
  }

  const buttonClass = `voting-btn ${size === 'small' ? 'voting-btn-small' : ''}`
  const containerClass = `voting-buttons ${size === 'small' ? 'voting-buttons-small' : ''}`

  return (
    <div className={containerClass}>
      <button
        onClick={handleUpvote}
        className={`${buttonClass} voting-btn-upvote ${isUpvoted ? 'active' : ''}`}
        disabled={isDisabled}
        title={isUpvoted ? 'Remove upvote' : 'Upvote this comment'}
        aria-label={`Upvote comment${isUpvoted ? ' (currently upvoted)' : ''}`}
      >
        <span className="voting-icon">
          {isUpvoted ? '▲' : '△'}
        </span>
      </button>

      <div 
        className={`voting-score ${size === 'small' ? 'voting-score-small' : ''}`}
        style={{ color: getScoreColor() }}
        title={`${voteScore} net votes`}
      >
        {voteScore > 0 ? `+${voteScore}` : voteScore}
      </div>

      <button
        onClick={handleDownvote}
        className={`${buttonClass} voting-btn-downvote ${isDownvoted ? 'active' : ''}`}
        disabled={isDisabled}
        title={isDownvoted ? 'Remove downvote' : 'Downvote this comment'}
        aria-label={`Downvote comment${isDownvoted ? ' (currently downvoted)' : ''}`}
      >
        <span className="voting-icon">
          {isDownvoted ? '▼' : '▽'}
        </span>
      </button>

      {isVoting && (
        <div className="voting-loader">
          <div className="voting-spinner"></div>
        </div>
      )}
    </div>
  )
}