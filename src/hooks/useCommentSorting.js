import { useState, useMemo, useCallback } from 'react'

export const SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  MOST_UPVOTED: 'most_upvoted',
  MOST_DOWNVOTED: 'most_downvoted',
  MOST_CONTROVERSIAL: 'most_controversial',
  BEST: 'best' // Combination of upvotes and recency
}

export const SORT_LABELS = {
  [SORT_OPTIONS.NEWEST]: 'Newest First',
  [SORT_OPTIONS.OLDEST]: 'Oldest First',
  [SORT_OPTIONS.MOST_UPVOTED]: 'Most Upvoted',
  [SORT_OPTIONS.MOST_DOWNVOTED]: 'Most Downvoted',
  [SORT_OPTIONS.MOST_CONTROVERSIAL]: 'Most Controversial',
  [SORT_OPTIONS.BEST]: 'Best'
}

export const SORT_ICONS = {
  [SORT_OPTIONS.BEST]: '⭐',
  [SORT_OPTIONS.NEWEST]: '🕐',
  [SORT_OPTIONS.OLDEST]: '📜',
  [SORT_OPTIONS.MOST_UPVOTED]: '⬆️',
  [SORT_OPTIONS.MOST_DOWNVOTED]: '⬇️',
  [SORT_OPTIONS.MOST_CONTROVERSIAL]: '🔥'
}

export function useCommentSorting(initialSort = SORT_OPTIONS.NEWEST) {
  const [sortBy, setSortBy] = useState(initialSort)

  const sortComments = useCallback((comments, sortOption = sortBy) => {
    const sortedComments = [...comments].map(comment => ({
      ...comment,
      replies: sortReplies(comment.replies, sortOption)
    }))

    return sortedComments.sort((a, b) => {
      switch (sortOption) {
        case SORT_OPTIONS.NEWEST:
          return new Date(b.created_at) - new Date(a.created_at)

        case SORT_OPTIONS.OLDEST:
          return new Date(a.created_at) - new Date(b.created_at)

        case SORT_OPTIONS.MOST_UPVOTED:
          const aScore = a.vote_score || 0
          const bScore = b.vote_score || 0
          if (aScore === bScore) {
            // Secondary sort by newest if scores are equal
            return new Date(b.created_at) - new Date(a.created_at)
          }
          return bScore - aScore

        case SORT_OPTIONS.MOST_DOWNVOTED:
          const aDownScore = a.vote_score || 0
          const bDownScore = b.vote_score || 0
          if (aDownScore === bDownScore) {
            // Secondary sort by newest if scores are equal
            return new Date(b.created_at) - new Date(a.created_at)
          }
          return aDownScore - bDownScore

        case SORT_OPTIONS.MOST_CONTROVERSIAL:
          const aControversy = calculateControversy(a)
          const bControversy = calculateControversy(b)
          if (aControversy === bControversy) {
            // Secondary sort by newest if controversy is equal
            return new Date(b.created_at) - new Date(a.created_at)
          }
          return bControversy - aControversy

        case SORT_OPTIONS.BEST:
          const aBest = calculateBestScore(a)
          const bBest = calculateBestScore(b)
          if (aBest === bBest) {
            // Secondary sort by newest if best scores are equal
            return new Date(b.created_at) - new Date(a.created_at)
          }
          return bBest - aBest

        default:
          return new Date(b.created_at) - new Date(a.created_at)
      }
    })
  }, [sortBy])

  const sortReplies = useCallback((replies, sortOption = sortBy) => {
    if (!replies || replies.length === 0) return replies

    return [...replies].sort((a, b) => {
      switch (sortOption) {
        case SORT_OPTIONS.NEWEST:
          return new Date(b.created_at) - new Date(a.created_at)

        case SORT_OPTIONS.OLDEST:
          return new Date(a.created_at) - new Date(b.created_at)

        case SORT_OPTIONS.MOST_UPVOTED:
          const aScore = a.vote_score || 0
          const bScore = b.vote_score || 0
          if (aScore === bScore) {
            return new Date(b.created_at) - new Date(a.created_at)
          }
          return bScore - aScore

        case SORT_OPTIONS.MOST_DOWNVOTED:
          const aDownScore = a.vote_score || 0
          const bDownScore = b.vote_score || 0
          if (aDownScore === bDownScore) {
            return new Date(b.created_at) - new Date(a.created_at)
          }
          return aDownScore - bDownScore

        case SORT_OPTIONS.MOST_CONTROVERSIAL:
          const aControversy = calculateControversy(a)
          const bControversy = calculateControversy(b)
          if (aControversy === bControversy) {
            return new Date(b.created_at) - new Date(a.created_at)
          }
          return bControversy - aControversy

        case SORT_OPTIONS.BEST:
          const aBest = calculateBestScore(a)
          const bBest = calculateBestScore(b)
          if (aBest === bBest) {
            return new Date(b.created_at) - new Date(a.created_at)
          }
          return bBest - aBest

        default:
          return new Date(a.created_at) - new Date(b.created_at)
      }
    })
  }, [sortBy])

  // Calculate controversy score (high when both upvotes and downvotes are high)
  const calculateControversy = useCallback((comment) => {
    const upvotes = comment.upvotes || 0
    const downvotes = comment.downvotes || 0
    const totalVotes = upvotes + downvotes
    
    if (totalVotes < 2) return 0 // Need at least 2 votes to be controversial
    
    // Controversy is high when votes are split relatively evenly
    // Formula: (total_votes) * min(upvotes, downvotes) / max(upvotes, downvotes)
    const minVotes = Math.min(upvotes, downvotes)
    const maxVotes = Math.max(upvotes, downvotes)
    
    if (maxVotes === 0) return 0
    
    return totalVotes * (minVotes / maxVotes)
  }, [])

  // Calculate "best" score combining upvotes with recency
  const calculateBestScore = useCallback((comment) => {
    const score = comment.vote_score || 0
    const now = Date.now()
    const commentTime = new Date(comment.created_at).getTime()
    const ageInHours = (now - commentTime) / (1000 * 60 * 60)
    
    // Decay factor: newer comments get a boost
    // Comments lose 10% of their boost per day
    const decayFactor = Math.max(0.1, Math.exp(-ageInHours / 24))
    
    // Best score is the vote score with a recency boost
    return score + (score > 0 ? score * decayFactor : 0)
  }, [])

  const handleSortChange = useCallback((newSort) => {
    setSortBy(newSort)
  }, [])

  return {
    sortBy,
    sortComments,
    handleSortChange,
    sortOptions: SORT_OPTIONS,
    sortLabels: SORT_LABELS,
    sortIcons: SORT_ICONS
  }
}