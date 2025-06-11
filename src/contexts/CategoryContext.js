import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CategoryContext = createContext()

export function CategoryProvider({ children }) {
  const [availableCategories, setAvailableCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(Date.now())

  const loadAvailableCategories = async () => {
    try {
      setLoadingCategories(true)
      
      // Get categories that have active quizzes
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('category')
        .eq('is_published', true)

      if (quizzesError) throw quizzesError

      // Get unique categories from published quizzes
      const uniqueCategories = [...new Set(quizzesData.map(quiz => quiz.category))]

      // Get category metadata for the categories that have quizzes
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('quiz_categories')
        .select('name, icon, color')
        .eq('is_active', true)
        .in('name', uniqueCategories)

      if (categoriesError) throw categoriesError

      // Sort categories alphabetically
      const sortedCategories = categoriesData
        .sort((a, b) => a.name.localeCompare(b.name))

      setAvailableCategories(sortedCategories)
      setLastUpdate(Date.now())
    } catch (error) {
      console.error('Error loading available categories:', error)
      setAvailableCategories([])
    } finally {
      setLoadingCategories(false)
    }
  }

  // Function to manually refresh categories (can be called from admin components)
  const refreshCategories = () => {
    loadAvailableCategories()
  }

  // Load categories on mount
  useEffect(() => {
    loadAvailableCategories()
  }, [])

  // Set up periodic refresh every 30 seconds when the page is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadAvailableCategories()
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadAvailableCategories()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const value = {
    availableCategories,
    loadingCategories,
    refreshCategories,
    lastUpdate
  }

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  )
}

export function useCategories() {
  const context = useContext(CategoryContext)
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider')
  }
  return context
}