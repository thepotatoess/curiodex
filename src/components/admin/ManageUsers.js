import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function ManageUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      // Get all users from auth.users and their profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsers(profiles || [])
    } catch (error) {
      console.error('Error loading users:', error)
      alert('Error loading users: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ))

      alert(`User role updated to ${newRole}`)
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Error updating user role: ' + error.message)
    }
  }

  const pauseUser = async (userId, isPaused) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_paused: isPaused })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_paused: isPaused } : user
      ))

      alert(`User ${isPaused ? 'paused' : 'unpaused'} successfully`)
    } catch (error) {
      console.error('Error updating user status:', error)
      alert('Error updating user status: ' + error.message)
    }
  }

  const deleteUser = async (userId, userEmail) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete user "${userEmail}"? This action cannot be undone and will remove all their quiz attempts.`
    )

    if (!confirmDelete) return

    try {
      // Delete user's quiz attempts first
      const { error: attemptsError } = await supabase
        .from('user_quiz_attempts')
        .delete()
        .eq('user_id', userId)

      if (attemptsError) throw attemptsError

      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) throw profileError

      // Note: We can't delete from auth.users via client-side code
      // This would need to be done via Supabase admin API or Edge Function
      
      // Update local state
      setUsers(users.filter(user => user.id !== userId))

      alert('User deleted successfully. Note: Auth user record may still exist and require manual cleanup.')
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user: ' + error.message)
    }
  }

  const getUserStats = async (userId) => {
    try {
      const { data: attempts, error } = await supabase
        .from('user_quiz_attempts')
        .select('score, max_score, completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })

      if (error) {
        console.error('Database error for user', userId, error)
        throw error
      }


      if (!attempts || attempts.length === 0) {
        return { totalAttempts: 0, averagePercentage: 0, lastAttempt: 'Never' }
      }

      const totalAttempts = attempts.length
      
      // Debug each attempt
      const percentages = attempts.map(attempt => {
        const percentage = attempt.max_score > 0 ? (attempt.score / attempt.max_score) * 100 : 0
        return percentage
      })
      
      const averagePercentage = percentages.length > 0 
        ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length) 
        : 0
      
      const lastAttempt = new Date(attempts[0].completed_at).toLocaleDateString()

      return {
        totalAttempts,
        averagePercentage,
        lastAttempt
      }
    } catch (error) {
      console.error('Error getting user stats:', error)
      return { totalAttempts: 0, averagePercentage: 0, lastAttempt: 'Error' }
    }
  }

  const [userStats, setUserStats] = useState({})

  useEffect(() => {
    const loadAllUserStats = async () => {
      const stats = {}
      for (const user of users) {
        stats[user.id] = await getUserStats(user.id)
      }
      setUserStats(stats)
    }

    if (users.length > 0) {
      loadAllUserStats()
    }
  }, [users])

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || user.role === filterRole
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && !user.is_paused) ||
                         (filterStatus === 'paused' && user.is_paused)

    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return '#dc3545'
      case 'moderator': return '#fd7e14'
      case 'user': return '#28a745'
      default: return '#6c757d'
    }
  }

  const getStatusBadgeColor = (isPaused) => {
    return isPaused ? '#ffc107' : '#28a745'
  }

  if (loading) return <div style={{ padding: '20px' }}>Loading users...</div>

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Manage Users</h1>
        <button 
          onClick={loadUsers}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px', 
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Search Users</label>
          <input
            type="text"
            placeholder="Search by email or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ddd', 
              borderRadius: '4px' 
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Filter by Role</label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ddd', 
              borderRadius: '4px' 
            }}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="user">User</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Filter by Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ddd', 
              borderRadius: '4px' 
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* User Count */}
      <div style={{ marginBottom: '20px', color: '#666' }}>
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '40px', 
          textAlign: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <p style={{ margin: 0, color: '#666' }}>
            No users found matching your filters.
          </p>
        </div>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Role</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Quiz Stats</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Joined</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => {
                const stats = userStats[user.id] || { totalAttempts: 0, averagePercentage: 0, lastAttempt: 'Loading...' }
                
                return (
                  <tr key={user.id} style={{ 
                    backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                    borderBottom: '1px solid #eee'
                  }}>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{user.username || 'No username'}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>{user.email}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>ID: {user.id.slice(0, 8)}...</div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: getRoleBadgeColor(user.role || 'user'),
                          color: 'white',
                          minWidth: '70px',
                          textAlign: 'center'
                        }}>
                          {(user.role || 'user').toUpperCase()}
                        </span>
                        <select
                          value={user.role || 'user'}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          style={{
                            padding: '4px 6px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            backgroundColor: 'white',
                            color: '#333',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="user">Change to User</option>
                          <option value="moderator">Change to Moderator</option>
                          <option value="admin">Change to Admin</option>
                        </select>
                      </div>
                    </td>
                    
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: getStatusBadgeColor(user.is_paused),
                        color: 'white'
                      }}>
                        {user.is_paused ? 'PAUSED' : 'ACTIVE'}
                      </span>
                    </td>
                    
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '14px' }}>
                        <div>{stats.totalAttempts} attempts</div>
                        <div style={{ color: '#666' }}>{stats.averagePercentage}% avg</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>Last: {stats.lastAttempt}</div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => pauseUser(user.id, !user.is_paused)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: user.is_paused ? '#28a745' : '#ffc107',
                            color: user.is_paused ? 'white' : 'black'
                          }}
                        >
                          {user.is_paused ? 'Unpause' : 'Pause'}
                        </button>
                        
                        <button
                          onClick={() => deleteUser(user.id, user.email)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}