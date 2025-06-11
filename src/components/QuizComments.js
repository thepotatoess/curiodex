import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ConfirmModal } from './ConfirmModal'
import '../css/QuizComments.css'

export default function QuizComments({ quizId, quizTitle }) {
  const { user, profile } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, commentId: null })
  
  // New states for replies
  const [replyingTo, setReplyingTo] = useState(null)
  const [newReply, setNewReply] = useState('')
  const [expandedReplies, setExpandedReplies] = useState(new Set())
  const [submittingReply, setSubmittingReply] = useState(false)
  // New state for tracking reply targets
  const [replyTargets, setReplyTargets] = useState({}) // Maps reply IDs to target user info
  // New state for highlighting
  const [highlightedReply, setHighlightedReply] = useState(null)

  const MAX_COMMENT_LENGTH = 1000

  useEffect(() => {
    if (quizId) {
      loadComments()
    }
  }, [quizId])

  const loadComments = async () => {
    try {
      setLoading(true)
      
      // Load all comments and replies in one query
      const { data: commentsData, error: commentsError } = await supabase
        .from('quiz_comments')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (commentsError) throw commentsError

      // Get unique user IDs from comments
      const userIds = [...new Set(commentsData.map(comment => comment.user_id))]
      
      // Fetch user profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', userIds)

      if (profilesError) {
        console.warn('Error loading profiles:', profilesError)
      }

      // Combine comments with user data
      const commentsWithUsers = commentsData.map(comment => {
        const userProfile = profilesData?.find(p => p.id === comment.user_id)
        return {
          ...comment,
          user: userProfile || { 
            username: 'Unknown User', 
            email: '',
            id: comment.user_id 
          }
        }
      })
      
      // Separate top-level comments and replies
      const topLevelComments = commentsWithUsers
        .filter(comment => comment.parent_comment_id === null)
        .map(comment => ({
          ...comment,
          replies: commentsWithUsers.filter(reply => reply.parent_comment_id === comment.id)
        }))
      
      // Build reply targets map for @mentions
      const targets = {}
      topLevelComments.forEach(comment => {
        comment.replies.forEach(reply => {
          // Check if this reply was made in response to a specific reply
          // We'll store this info when creating replies
          if (reply.reply_target_user_id) {
            const targetUser = commentsWithUsers.find(c => c.user_id === reply.reply_target_user_id)
            if (targetUser) {
              targets[reply.id] = {
                username: targetUser.user.username || targetUser.user.email,
                userId: targetUser.user_id
              }
            }
          }
        })
      })
      setReplyTargets(targets)
      
      setComments(topLevelComments)
    } catch (error) {
      console.error('Error loading comments:', error)
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || submitting || !user) return

    try {
      setSubmitting(true)
      
      const { data: insertedComment, error: insertError } = await supabase
        .from('quiz_comments')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          comment_text: newComment.trim(),
          depth_level: 0
        })
        .select('*')
        .single()

      if (insertError) throw insertError

      const newCommentWithUser = {
        ...insertedComment,
        user: {
          username: profile?.username || profile?.email || 'You',
          email: profile?.email || '',
          id: user.id
        },
        replies: []
      }

      setComments(prev => [...prev, newCommentWithUser])
      setNewComment('')
      
    } catch (error) {
      console.error('Error submitting comment:', error)
      alert('Failed to post comment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReply = async (e) => {
    e.preventDefault()
    if (!newReply.trim() || submittingReply || !user || !replyingTo) return

    try {
      setSubmittingReply(true)
      
      // Extract the actual comment ID and determine if replying to a specific reply
      let parentCommentId
      let replyTargetUserId = null
      let replyTargetUsername = null
      
      if (replyingTo.toString().startsWith('reply-')) {
        // Replying to a specific reply
        const replyId = replyingTo.toString().replace('reply-', '')
        
        // Find which comment contains this reply
        const parentComment = comments.find(c => 
          c.replies.some(r => r.id === replyId)
        )
        
        if (parentComment) {
          parentCommentId = parentComment.id
          // Find the specific reply being responded to
          const targetReply = parentComment.replies.find(r => r.id === replyId)
          if (targetReply) {
            replyTargetUserId = targetReply.user_id
            replyTargetUsername = targetReply.user.username || targetReply.user.email
          }
        }
      } else {
        // Replying to main comment
        parentCommentId = replyingTo
      }

      const { data: insertedReply, error: insertError } = await supabase
        .from('quiz_comments')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          comment_text: newReply.trim(),
          parent_comment_id: parentCommentId,
          depth_level: 1,
          // Store the target user info if replying to a specific reply
          reply_target_user_id: replyTargetUserId
        })
        .select('*')
        .single()

      if (insertError) throw insertError

      const newReplyWithUser = {
        ...insertedReply,
        user: {
          username: profile?.username || profile?.email || 'You',
          email: profile?.email || '',
          id: user.id
        }
      }

      // Add reply to the appropriate comment
      setComments(prev => prev.map(comment => 
        comment.id === parentCommentId 
          ? { ...comment, replies: [...comment.replies, newReplyWithUser] }
          : comment
      ))

      // Update reply targets if this was a reply to a specific reply
      if (replyTargetUserId && replyTargetUsername) {
        setReplyTargets(prev => ({
          ...prev,
          [insertedReply.id]: {
            username: replyTargetUsername,
            userId: replyTargetUserId
          }
        }))
      }

      // Expand replies for this comment
      setExpandedReplies(prev => new Set([...prev, parentCommentId]))
      
      setNewReply('')
      setReplyingTo(null)
      
    } catch (error) {
      console.error('Error submitting reply:', error)
      alert('Failed to post reply. Please try again.')
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleEditComment = (comment) => {
    setEditingId(comment.id)
    setEditingText(comment.comment_text)
  }

  const handleSaveEdit = async (commentId) => {
    if (!editingText.trim()) return

    try {
      const { error } = await supabase
        .from('quiz_comments')
        .update({
          comment_text: editingText.trim(),
          updated_at: new Date().toISOString(),
          is_edited: true
        })
        .eq('id', commentId)
        .eq('user_id', user.id)

      if (error) throw error

      // Update local state for both comments and replies
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          return { ...comment, comment_text: editingText.trim(), is_edited: true }
        }
        return {
          ...comment,
          replies: comment.replies.map(reply => 
            reply.id === commentId 
              ? { ...reply, comment_text: editingText.trim(), is_edited: true }
              : reply
          )
        }
      }))

      setEditingId(null)
      setEditingText('')
    } catch (error) {
      console.error('Error updating comment:', error)
      alert('Failed to update comment. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingText('')
  }

  const handleDeleteComment = async () => {
    try {
      const { error } = await supabase
        .from('quiz_comments')
        .update({ is_deleted: true })
        .eq('id', deleteModal.commentId)
        .eq('user_id', user.id)

      if (error) throw error

      // Remove from local state - handle both top-level comments and replies
      setComments(prev => {
        return prev.map(comment => {
          // Check if this is a top-level comment being deleted
          if (comment.id === deleteModal.commentId) {
            return null // Will be filtered out
          }
          
          // Check if this is a reply being deleted
          const updatedReplies = comment.replies.filter(reply => reply.id !== deleteModal.commentId)
          
          return {
            ...comment,
            replies: updatedReplies
          }
        }).filter(Boolean) // Remove null entries (deleted top-level comments)
      })

      // Also remove from reply targets if it was a reply with a target
      setReplyTargets(prev => {
        const newTargets = { ...prev }
        delete newTargets[deleteModal.commentId]
        return newTargets
      })

      setDeleteModal({ isOpen: false, commentId: null })
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment. Please try again.')
    }
  }

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const handleHighlightReply = (targetUserId, parentCommentId) => {
    // Find the target reply within the parent comment
    const parentComment = comments.find(c => c.id === parentCommentId)
    if (parentComment) {
      const targetReply = parentComment.replies.find(r => r.user_id === targetUserId)
      if (targetReply) {
        // Ensure replies are expanded so the target is visible
        setExpandedReplies(prev => new Set([...prev, parentCommentId]))
        
        // Wait for expansion, then check visibility and highlight
        setTimeout(() => {
          const element = document.getElementById(`reply-${targetReply.id}`)
          if (element) {
            // Check if element is visible in viewport
            const rect = element.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            const viewportWidth = window.innerWidth
            
            const isVisible = (
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.bottom <= viewportHeight &&
              rect.right <= viewportWidth
            )
            
            // Only scroll if element is not fully visible
            if (!isVisible) {
              element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
              })
            }
            
            // Add highlight after a brief delay to ensure DOM is ready
            setTimeout(() => {
              setHighlightedReply(targetReply.id)
              
              // Remove highlight after 4 seconds (increased for smoother fade)
              setTimeout(() => {
                setHighlightedReply(null)
              }, 4000)
            }, isVisible ? 50 : 300) // Shorter delay if no scroll needed
          }
        }, 150) // Wait for replies expansion
      }
    }
  }

  const formatTimeAgo = (dateString) => {
    const now = new Date()
    const commentDate = new Date(dateString)
    const diffInMinutes = Math.floor((now - commentDate) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`
    
    return commentDate.toLocaleDateString()
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const isUserComment = (comment) => {
    return user && comment.user_id === user.id
  }

  const remainingChars = MAX_COMMENT_LENGTH - newComment.length
  const editingRemainingChars = MAX_COMMENT_LENGTH - editingText.length
  const replyRemainingChars = MAX_COMMENT_LENGTH - newReply.length

  const totalCommentsCount = comments.reduce((total, comment) => 
    total + 1 + comment.replies.length, 0
  )

  if (!user) {
    return (
      <div className="quiz-comments-section">
        <div className="comments-header">
          <h3>
            💬 Comments
            <span className="comments-count">{totalCommentsCount}</span>
          </h3>
        </div>
        <div className="comments-empty">
          <div className="comments-empty-icon">🔒</div>
          <h4>Sign in to view and post comments</h4>
          <p>Join the conversation about this quiz!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz-comments-section">
      {/* Header */}
      <div className="comments-header">
        <h3>
          💬 Comments
          <span className="comments-count">{totalCommentsCount}</span>
        </h3>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmitComment} className="comment-form">
        <div className="comment-form-header">
          <div className="comment-form-avatar">
            {getInitials(profile?.username || profile?.email)}
          </div>
          <div className="comment-form-user">
            {profile?.username || 'You'}
          </div>
        </div>
        
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={`Share your thoughts about "${quizTitle}"...`}
          className="comment-textarea"
          maxLength={MAX_COMMENT_LENGTH}
          required
        />
        
        <div className="comment-form-actions">
          <div className={`comment-char-count ${
            remainingChars < 100 ? (remainingChars < 0 ? 'error' : 'warning') : ''
          }`}>
            {remainingChars} characters remaining
          </div>
          
          <div className="comment-form-buttons">
            <button
              type="button"
              onClick={() => setNewComment('')}
              className="comment-btn comment-btn-secondary"
              disabled={!newComment.trim()}
            >
              Clear
            </button>
            <button
              type="submit"
              className="comment-btn comment-btn-primary"
              disabled={!newComment.trim() || submitting || remainingChars < 0}
            >
              {submitting ? (
                <>
                  <span>⏳</span>
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <span>💬</span>
                  <span>Post Comment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="comments-loading">
          <div className="comments-loading-spinner"></div>
          <span>Loading comments...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="comments-empty">
          <div className="comments-empty-icon">💭</div>
          <h4>No comments yet</h4>
          <p>Be the first to share your thoughts about this quiz!</p>
        </div>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-avatar">
                {getInitials(comment.user.username || comment.user.email)}
              </div>
              
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-author">
                    {comment.user.username || comment.user.email || 'Anonymous'}
                  </span>
                  <span className="comment-timestamp">
                    {formatTimeAgo(comment.created_at)}
                  </span>
                  {comment.is_edited && (
                    <span className="comment-edited">
                      (edited)
                    </span>
                  )}
                </div>
                
                {editingId === comment.id ? (
                  <div className="comment-edit-form">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="comment-edit-textarea"
                      maxLength={MAX_COMMENT_LENGTH}
                    />
                    <div className="comment-edit-actions">
                      <div className={`comment-char-count ${
                        editingRemainingChars < 100 ? (editingRemainingChars < 0 ? 'error' : 'warning') : ''
                      }`}>
                        {editingRemainingChars} characters remaining
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={handleCancelEdit}
                          className="comment-edit-btn cancel"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(comment.id)}
                          className="comment-edit-btn save"
                          disabled={!editingText.trim() || editingRemainingChars < 0}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="comment-text">{comment.comment_text}</p>
                    
                    <div className="comment-actions">
                      <button
                        onClick={() => setReplyingTo(comment.id)}
                        className="comment-action-btn reply-button"
                      >
                        <span>💬</span>
                        <span>Reply</span>
                      </button>
                      
                      {isUserComment(comment) && (
                        <>
                          <button
                            onClick={() => handleEditComment(comment)}
                            className="comment-action-btn edit"
                          >
                            <span>✏️</span>
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, commentId: comment.id })}
                            className="comment-action-btn delete"
                          >
                            <span>🗑️</span>
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Reply Form - Show after main comment actions */}
                {replyingTo === comment.id && replyingTo !== 'reply-to-main' && (
                  <form onSubmit={handleSubmitReply} className="reply-form">
                    <div className="reply-form-header">
                      <div className="reply-form-avatar">
                        {getInitials(profile?.username || profile?.email)}
                      </div>
                      <div className="reply-form-user">
                        Replying to {comment.user.username || comment.user.email}
                      </div>
                    </div>
                    
                    <textarea
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      placeholder="Write your reply..."
                      className="reply-textarea"
                      maxLength={MAX_COMMENT_LENGTH}
                      required
                      autoFocus
                    />
                    
                    <div className="reply-form-actions">
                      <div className={`reply-char-count ${
                        replyRemainingChars < 100 ? (replyRemainingChars < 0 ? 'error' : 'warning') : ''
                      }`}>
                        {replyRemainingChars} characters remaining
                      </div>
                      
                      <div className="reply-form-buttons">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(null)
                            setNewReply('')
                          }}
                          className="reply-btn reply-btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="reply-btn reply-btn-primary"
                          disabled={!newReply.trim() || submittingReply || replyRemainingChars < 0}
                        >
                          {submittingReply ? (
                            <>
                              <span>⏳</span>
                              <span>Posting...</span>
                            </>
                          ) : (
                            <>
                              <span>💬</span>
                              <span>Reply</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Replies Toggle & List */}
                {comment.replies.length > 0 && (
                  <div className="comment-replies">
                    <button
                      onClick={() => toggleReplies(comment.id)}
                      className={`replies-toggle ${expandedReplies.has(comment.id) ? 'expanded' : ''}`}
                    >
                      <span className="replies-toggle-icon">▶</span>
                      <span>
                        {expandedReplies.has(comment.id) ? 'Hide' : 'Show'} replies
                      </span>
                      <span className="replies-count">{comment.replies.length}</span>
                    </button>

                    {expandedReplies.has(comment.id) && (
                      <div className="replies-list">
                        {comment.replies.map((reply) => (
                          <div 
                            key={reply.id} 
                            id={`reply-${reply.id}`}
                            className={`reply-item ${highlightedReply === reply.id ? 'highlighted' : ''}`}
                          >
                            <div className="reply-avatar">
                              {getInitials(reply.user.username || reply.user.email)}
                            </div>
                            
                              <div className="reply-content">
                                <div className="reply-header">
                                  <span className="reply-author">
                                    {reply.user.username || reply.user.email || 'Anonymous'}
                                  </span>
                                  <span className="reply-timestamp">
                                    {formatTimeAgo(reply.created_at)}
                                  </span>
                                  {reply.is_edited && (
                                    <span className="reply-edited">
                                      (edited)
                                    </span>
                                  )}
                                </div>
                                
                                {/* Reply Target Indicator */}
                                {replyTargets[reply.id] && (
                                  <div 
                                    className="reply-target"
                                    onClick={() => handleHighlightReply(replyTargets[reply.id].userId, comment.id)}
                                  >
                                    <span className="reply-target-icon">↳</span>
                                    <span className="reply-target-text">
                                      Replying to <span className="reply-target-user">@{replyTargets[reply.id].username}</span>
                                    </span>
                                    <span className="reply-target-hint">Click to see original</span>
                                  </div>
                                )}
                              
                              {editingId === reply.id ? (
                                <div className="reply-edit-form">
                                  <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="reply-edit-textarea"
                                    maxLength={MAX_COMMENT_LENGTH}
                                  />
                                  <div className="reply-edit-actions">
                                    <div className={`reply-char-count ${
                                      editingRemainingChars < 100 ? (editingRemainingChars < 0 ? 'error' : 'warning') : ''
                                    }`}>
                                      {editingRemainingChars} characters remaining
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="reply-edit-btn cancel"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleSaveEdit(reply.id)}
                                        className="reply-edit-btn save"
                                        disabled={!editingText.trim() || editingRemainingChars < 0}
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="reply-text">{reply.comment_text}</p>
                                  
                                  <div className="reply-actions">
                                    <button
                                      onClick={() => setReplyingTo(`reply-${reply.id}`)}
                                      className="reply-action-btn reply"
                                    >
                                      <span>💬</span>
                                      <span>Reply</span>
                                    </button>
                                    
                                    {isUserComment(reply) && (
                                      <>
                                        <button
                                          onClick={() => handleEditComment(reply)}
                                          className="reply-action-btn edit"
                                        >
                                          <span>✏️</span>
                                          <span>Edit</span>
                                        </button>
                                        <button
                                          onClick={() => setDeleteModal({ isOpen: true, commentId: reply.id })}
                                          className="reply-action-btn delete"
                                        >
                                          <span>🗑️</span>
                                          <span>Delete</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* Reply Form - Show after individual reply */}
                                  {replyingTo === `reply-${reply.id}` && (
                                    <form onSubmit={handleSubmitReply} className="reply-form">
                                      <div className="reply-form-header">
                                        <div className="reply-form-avatar">
                                          {getInitials(profile?.username || profile?.email)}
                                        </div>
                                        <div className="reply-form-user">
                                          Replying to {comment.user.username || comment.user.email}
                                        </div>
                                      </div>
                                      
                                      <textarea
                                        value={newReply}
                                        onChange={(e) => setNewReply(e.target.value)}
                                        placeholder="Write your reply..."
                                        className="reply-textarea"
                                        maxLength={MAX_COMMENT_LENGTH}
                                        required
                                        autoFocus
                                      />
                                      
                                      <div className="reply-form-actions">
                                        <div className={`reply-char-count ${
                                          replyRemainingChars < 100 ? (replyRemainingChars < 0 ? 'error' : 'warning') : ''
                                        }`}>
                                          {replyRemainingChars} characters remaining
                                        </div>
                                        
                                        <div className="reply-form-buttons">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setReplyingTo(null)
                                              setNewReply('')
                                            }}
                                            className="reply-btn reply-btn-secondary"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="submit"
                                            className="reply-btn reply-btn-primary"
                                            disabled={!newReply.trim() || submittingReply || replyRemainingChars < 0}
                                          >
                                            {submittingReply ? (
                                              <>
                                                <span>⏳</span>
                                                <span>Posting...</span>
                                              </>
                                            ) : (
                                              <>
                                                <span>💬</span>
                                                <span>Reply</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    </form>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Comment?"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        onConfirm={handleDeleteComment}
        onCancel={() => setDeleteModal({ isOpen: false, commentId: null })}
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
      />
    </div>
  )
}