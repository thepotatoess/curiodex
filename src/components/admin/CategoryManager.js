import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import '../../CategoryManager.css'

export default function CategoryManager() {
  console.log("Component is rendering")

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [newCategory, setNewCategory] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    console.log("Calling loadCategories...")
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_categories')
        .select('id, name, color, icon, is_active')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
      // If table doesn't exist, create it
      if (error.message.includes('relation "public.quiz_categories" does not exist')) {
        console.error('fuck')
      }
    } finally {
      setLoading(false)
    }
  }

  

  const addCategory = async () => {
    if (!newCategory.trim()) return

    try {
      const { error } = await supabase
        .from('quiz_categories')
        .insert({
          name: newCategory.trim(),
          color: '#' + Math.floor(Math.random()*16777215).toString(16),
          icon: '📚'
        })

      if (error) throw error

      setNewCategory('')
      setShowAddForm(false)
      loadCategories()
    } catch (error) {
      console.error('Error adding category:', error)
      alert(error.message)
    }
  }

  const updateCategory = async (id) => {
    if (!editingName.trim()) return

    try {
      const { error } = await supabase
        .from('quiz_categories')
        .update({ name: editingName.trim() })
        .eq('id', id)

      if (error) throw error

      setEditingId(null)
      setEditingName('')
      loadCategories()
    } catch (error) {
      console.error('Error updating category:', error)
      alert(error.message)
    }
  }

  const toggleCategoryStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('quiz_categories')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      loadCategories()
    } catch (error) {
      console.error('Error toggling category status:', error)
    }
  }

  const deleteCategory = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('quiz_categories')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Cannot delete category that is being used by quizzes.')
    }
  }

  const updateCategoryColor = async (id, color) => {
    try {
      const { error } = await supabase
        .from('quiz_categories')
        .update({ color })
        .eq('id', id)

      if (error) throw error
      loadCategories()
    } catch (error) {
      console.error('Error updating color:', error)
    }
  }

  const updateCategoryIcon = async (id, icon) => {
    try {
      const { error } = await supabase
        .from('quiz_categories')
        .update({ icon })
        .eq('id', id)

      if (error) throw error
      loadCategories()
    } catch (error) {
      console.error('Error updating icon:', error)
    }
  }

  if (loading) return <div className="categories-loading">ÆLoading categories...</div>


  return (
    <div className="categories-container">
      <div className="categories-header">
        <h1>Manage Quiz Categories</h1>
        <button 
          className="add-category-btn"
          onClick={() => setShowAddForm(true)}
        >
          + Add New Category
        </button>
      </div>

      {showAddForm && (
        <div className="add-category-form">
          <input
            type="text"
            placeholder="Enter category name..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCategory()}
            className="category-input"
            autoFocus
          />
          <div className="form-actions">
            <button onClick={addCategory} className="save-btn">Save</button>
            <button onClick={() => { setShowAddForm(false); setNewCategory(''); }} className="cancel-btn">Cancel</button>
          </div>
        </div>
      )}

      <div className="categories-info">
        <p>Categories are used to organize quizzes. Active categories appear in the quiz creation form.</p>
      </div>

      <div className="categories-grid">
        {categories.map(category => (
          <div 
            key={category.id} 
            className={`category-card ${!category.is_active ? 'inactive' : ''}`}
            style={{ borderColor: category.color }}
          >
            <div className="category-header">
              <div className="category-icon-wrapper">
                <input
                  type="text"
                  value={category.icon}
                  onChange={(e) => updateCategoryIcon(category.id, e.target.value)}
                  className="icon-input"
                  maxLength="2"
                />
              </div>
              
              {editingId === category.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && updateCategory(category.id)}
                  onBlur={() => updateCategory(category.id)}
                  className="category-name-input"
                  autoFocus
                />
              ) : (
                <h3 
                  className="category-name"
                  onClick={() => {
                    setEditingId(category.id)
                    setEditingName(category.name)
                  }}
                >
                  {category.name}
                </h3>
              )}
            </div>

            <div className="category-controls">
              <div className="color-picker-wrapper">
                <input
                  type="color"
                  value={category.color}
                  onChange={(e) => updateCategoryColor(category.id, e.target.value)}
                  className="color-picker"
                />
              </div>

              <button
                className={`status-toggle ${category.is_active ? 'active' : 'inactive'}`}
                onClick={() => toggleCategoryStatus(category.id, category.is_active)}
                title={category.is_active ? 'Click to deactivate' : 'Click to activate'}
              >
                {category.is_active ? 'Active' : 'Inactive'}
              </button>

              <button
                className="delete-btn"
                onClick={() => deleteCategory(category.id, category.name)}
                title="Delete category"
              >
                🗑️
              </button>
            </div>

            <div className="category-meta">
              <span className="meta-label">Status:</span>
              <span className={`meta-value ${category.is_active ? 'active' : 'inactive'}`}>
                {category.is_active ? 'Available for quizzes' : 'Hidden from quiz creation'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="empty-state">
          <p>No categories yet. Click "Add New Category" to get started!</p>
        </div>
      )}
    </div>
  )
}