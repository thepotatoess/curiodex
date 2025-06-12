import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCommentVoting(user) {
  const [votingStates, setVotingStates] = useState({}) // Track voting loading states
  const [userVotes, setUserVotes] = useState({}) // Track user's votes for each comment

  // Load user's existing votes for comments
  const loadUserVotes = useCallback(async (commentIds) => {
    if (!user || !commentIds.length) return

    try {
      const { data, error } = await supabase
        .from('comment_votes')
        .select('comment_id, vote_type')
        .eq('user_id', user.id)
        .in('comment_id', commentIds)

      if (error) throw error

      const votesMap = {}
      data.forEach(vote => {
        votesMap[vote.comment_id] = vote.vote_type
      })
      
      setUserVotes(votesMap)
    } catch (error) {
      console.error('Error loading user votes:', error)
    }
  }, [user])

  // Handle voting on a comment
  const handleVote = useCallback(async (commentId, voteType, currentScore, onScoreUpdate) => {
    if (!user || votingStates[commentId]) return

    const existingVote = userVotes[commentId]
    let newVoteType = voteType
    let scoreChange = 0

    // Determine the action and score change
    if (existingVote === voteType) {
      // User is removing their vote
      newVoteType = null
      scoreChange = voteType === 1 ? -1 : 1
    } else if (existingVote) {
      // User is changing their vote (from upvote to downvote or vice versa)
      scoreChange = voteType === 1 ? 2 : -2
    } else {
      // User is adding a new vote
      scoreChange = voteType === 1 ? 1 : -1
    }

    const newScore = currentScore + scoreChange

    try {
      setVotingStates(prev => ({ ...prev, [commentId]: true }))

      // Call the database function to handle the vote
      const { data, error } = await supabase.rpc('handle_comment_vote', {
        p_comment_id: commentId,
        p_user_id: user.id,
        p_vote_type: newVoteType
      })

      if (error) throw error

      if (data.success) {
        // Update local state
        setUserVotes(prev => ({
          ...prev,
          [commentId]: newVoteType
        }))

        // Update the comment score through callback
        onScoreUpdate(commentId, newScore)
      } else {
        throw new Error(data.error || 'Failed to process vote')
      }

    } catch (error) {
      console.error('Error handling vote:', error)
      // You might want to show a toast notification here
      alert('Failed to process vote. Please try again.')
    } finally {
      setVotingStates(prev => ({ ...prev, [commentId]: false }))
    }
  }, [user, votingStates, userVotes])

  return {
    userVotes,
    votingStates,
    loadUserVotes,
    handleVote
  }
}