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

        // Check admin status from database instead of hardcoded email
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin, role')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error checking admin status:', error)
          setIsAdmin(false)
        } else {
          // User is admin if either is_admin is true OR role is 'admin'
          setIsAdmin(profile?.is_admin === true || profile?.role === 'admin')
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus()
    })

    return () => subscription.unsubscribe()
  }, [])

  return { isAdmin, loading }
}