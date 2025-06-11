// UPDATE the existing ModernNavbar component with these changes:

import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAdmin } from '../hooks/useAdmin'
import { useCategories } from '../contexts/CategoryContext'
import '../css/Navbar.css'

export default function ModernNavbar({ onQuizzesNavClick }) {
  const { user, profile, signOut } = useAuth()
  const { isAdmin } = useAdmin()
  const { availableCategories, loadingCategories, refreshCategories } = useCategories()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  
  const dropdownRefs = {
    quizzes: useRef(null),
    user: useRef(null)
  }

  // Refresh categories when coming from admin or quiz management areas
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      // Refresh categories when in admin area in case changes were made
      const timer = setTimeout(() => {
        refreshCategories()
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [location.pathname, refreshCategories])

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdowns and mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setActiveDropdown(null)
  }, [location])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.entries(dropdownRefs).forEach(([key, ref]) => {
        if (ref.current && !ref.current.contains(event.target)) {
          if (activeDropdown === key) {
            setActiveDropdown(null)
          }
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeDropdown])

  const handleQuizzesClick = (e) => {
    if (onQuizzesNavClick) {
      onQuizzesNavClick(e)
    }
  }

  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const isActivePath = (path) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  const handleSignOut = async () => {
    await signOut()
    setActiveDropdown(null)
    navigate('/')
  }

  // ADD: Handle authentication required actions
  const handleAuthRequiredAction = (path) => {
    if (!user) {
      navigate('/login')
    } else {
      navigate(path)
    }
  }

  // Dynamic quiz dropdown items based on available categories
  const getQuizDropdownItems = () => {
    const items = [
      { icon: '🧠', label: 'All Quizzes', path: '/quizzes' }
    ]

    // Add available categories
    if (!loadingCategories && availableCategories.length > 0) {
      items.push({ divider: true })
      
      availableCategories.forEach(category => {
        items.push({
          icon: category.icon || '📚',
          label: category.name,
          path: `/quizzes?category=${encodeURIComponent(category.name)}`
        })
      })
    }

    // Add additional options
    items.push(
      { divider: true },
      { icon: '📊', label: 'My Statistics', path: '/stats' },
      { icon: '🎯', label: 'Random Quiz', path: '/quizzes?random=true' }
    )

    return items
  }

  // UPDATED: User dropdown items for authenticated users
  const userDropdownItems = user ? [
    { icon: '📊', label: 'My Statistics', path: '/stats' },
    { icon: '🏆', label: 'Achievements', path: '/achievements' },
    { icon: '⚙️', label: 'Settings', path: '/settings' },
    { divider: true },
    ...(isAdmin ? [{ icon: '👨‍💼', label: 'Admin Panel', path: '/admin' }, { divider: true }] : []),
    { icon: '🚪', label: 'Sign Out', action: handleSignOut }
  ] : []

  const quizDropdownItems = getQuizDropdownItems()

  // UPDATED: Show different navbar based on authentication state and current page
  const isHomePage = location.pathname === '/'
  
  // If user is not logged in and not on homepage, don't show navbar
  if (!user && !isHomePage) {
    return null
  }

  return (
    <>
      <nav className={`modern-navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          {/* Brand Logo */}
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">🧠</span>
            <span className="brand-text">Curiodex</span>
          </Link>

          {/* Desktop Navigation - Only show if user is logged in */}
          {user && (
            <ul className="navbar-nav">
              <li className="nav-item">
                <Link
                  to="/"
                  className={`nav-link ${isActivePath('/') ? 'active' : ''}`}
                >
                  <span className="nav-icon">🏠</span>
                  <span>Home</span>
                </Link>
              </li>

              {/* Quizzes Dropdown */}
              <li className="nav-item nav-dropdown" ref={dropdownRefs.quizzes}>
                <button
                  className={`dropdown-toggle ${activeDropdown === 'quizzes' ? 'active' : ''} ${isActivePath('/quiz') ? 'active' : ''}`}
                  onClick={() => toggleDropdown('quizzes')}
                >
                  <span className="nav-icon">🧠</span>
                  <span>Quizzes</span>
                  <span className="dropdown-arrow">▼</span>
                </button>
                
                <div className={`dropdown-menu ${activeDropdown === 'quizzes' ? 'open' : ''}`}>
                  {loadingCategories ? (
                    <div className="dropdown-item" style={{ 
                      opacity: 0.6, 
                      cursor: 'default',
                      pointerEvents: 'none'
                    }}>
                      <span className="dropdown-item-icon">⏳</span>
                      <span>Loading categories...</span>
                    </div>
                  ) : (
                    quizDropdownItems.map((item, index) => {
                      if (item.divider) {
                        return <div key={index} className="dropdown-divider" />
                      }
                      return (
                        <Link
                          key={index}
                          to={item.path}
                          className="dropdown-item"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <span className="dropdown-item-icon">{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      )
                    })
                  )}
                </div>
              </li>

              {/* Admin Link (if admin) */}
              {isAdmin && (
                <li className="nav-item">
                  <Link
                    to="/admin"
                    className={`nav-link ${isActivePath('/admin') ? 'active' : ''}`}
                  >
                    <span className="nav-icon">⚙️</span>
                    <span>Admin</span>
                    <span className="admin-badge">Admin</span>
                  </Link>
                </li>
              )}
            </ul>
          )}

          {/* Desktop User Section */}
          {user ? (
            <div className="navbar-user">
              <div className="user-dropdown" ref={dropdownRefs.user}>
                <button
                  className={`user-button ${activeDropdown === 'user' ? 'active' : ''}`}
                  onClick={() => toggleDropdown('user')}
                >
                  <div className="user-avatar">
                    {getInitials(profile?.username || profile?.email)}
                  </div>
                  <div className="user-info">
                    <span className="user-name">
                      {profile?.username || 'User'}
                    </span>
                    <span className="user-role">
                      {profile?.role || 'Member'}
                    </span>
                  </div>
                  <span className="user-dropdown-arrow">▼</span>
                </button>

                <div className={`dropdown-menu ${activeDropdown === 'user' ? 'open' : ''}`}>
                  {userDropdownItems.map((item, index) => {
                    if (item.divider) {
                      return <div key={index} className="dropdown-divider" />
                    }
                    if (item.action) {
                      return (
                        <button
                          key={index}
                          className="dropdown-item"
                          onClick={item.action}
                          style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none' }}
                        >
                          <span className="dropdown-item-icon">{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      )
                    }
                    return (
                      <Link
                        key={index}
                        to={item.path}
                        className="dropdown-item"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <span className="dropdown-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Show Login/Sign Up buttons for non-authenticated users on homepage */
            isHomePage && (
              <div className="navbar-user">
                <button
                  onClick={() => navigate('/login')}
                  className="nav-link"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    padding: '0.5rem 1.5rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  <span>🚀</span>
                  <span>Get Started</span>
                </button>
              </div>
            )
          )}

          {/* Mobile Menu Toggle - Only show if user is logged in */}
          {user && (
            <button 
              className="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          )}
        </div>

        {/* Mobile Menu - Only show if user is logged in */}
        {user && (
          <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
            <ul className="mobile-nav">
              <li>
                <Link
                  to="/"
                  className={`nav-link ${isActivePath('/') ? 'active' : ''}`}
                >
                  <span className="nav-icon">🏠</span>
                  <span>Home</span>
                </Link>
              </li>
              
              <li>
                <Link
                  to="/quizzes"
                  className={`nav-link ${isActivePath('/quiz') ? 'active' : ''}`}
                  onClick={handleQuizzesClick}
                >
                  <span className="nav-icon">🧠</span>
                  <span>All Quizzes</span>
                </Link>
              </li>

              {/* Mobile Categories */}
              {!loadingCategories && availableCategories.length > 0 && (
                <>
                  {availableCategories.map((category, index) => (
                    <li key={index}>
                      <Link
                        to={`/quizzes?category=${encodeURIComponent(category.name)}`}
                        className="nav-link"
                        style={{ paddingLeft: '2rem' }}
                      >
                        <span className="nav-icon">{category.icon}</span>
                        <span>{category.name}</span>
                      </Link>
                    </li>
                  ))}
                </>
              )}
              
              <li>
                <Link
                  to="/stats"
                  className={`nav-link ${isActivePath('/stats') ? 'active' : ''}`}
                >
                  <span className="nav-icon">📊</span>
                  <span>Statistics</span>
                </Link>
              </li>

              {isAdmin && (
                <li>
                  <Link
                    to="/admin"
                    className={`nav-link ${isActivePath('/admin') ? 'active' : ''}`}
                  >
                    <span className="nav-icon">⚙️</span>
                    <span>Admin Panel</span>
                    <span className="admin-badge">Admin</span>
                  </Link>
                </li>
              )}
            </ul>

            <div className="mobile-user-section">
              <div className="mobile-user-info">
                <div className="mobile-user-avatar">
                  {getInitials(profile?.username || profile?.email)}
                </div>
                <div>
                  <div style={{ color: '#1a1a1a', fontWeight: '600', fontSize: '1rem' }}>
                    {profile?.username || 'User'}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                    {profile?.role || 'Member'}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                    {profile?.email}
                  </div>
                </div>
              </div>
              
              <button onClick={handleSignOut} className="mobile-sign-out">
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Menu Overlay */}
      {user && (
        <div 
          className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}