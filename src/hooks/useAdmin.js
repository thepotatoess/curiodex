import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setIsAdmin(false)
          setLoading(false)
          return
        }

        // For now, just allow your specific email until profiles table is working
        setIsAdmin(user.email === 'cplex6655@proton.me')
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  return { isAdmin, loading }
}