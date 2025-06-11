import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAdmin } from '../hooks/useAdmin'
import '../css/Navbar.css'

export default function ModernNavbar({ onQuizzesNavClick, showNavConfirm }) {
  const { user, profile, signOut } = useAuth()
  const { isAdmin } = useAdmin()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [quizProgress, setQuizProgress] = useState(0)

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  // Mock quiz progress detection
  useEffect(() => {
    if (location.pathname.includes('/quiz/') && location.pathname.includes('/preview')) {
      // Simulate quiz progress
      const timer = setInterval(() => {
        setQuizProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer)
            return 0
          }
          return prev + 2
        })
      }, 100)
      return () => clearInterval(timer)
    } else {
      setQuizProgress(0)
    }
  }, [location])

  const handleQuizzesClick = (e) => {
    if (onQuizzesNavClick) {
      onQuizzesNavClick(e)
    }
  }

  const handleMobileMenuToggle = () => {
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

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/quizzes', label: 'Quizzes', icon: '🧠', onClick: handleQuizzesClick },
    { path: '/stats', label: 'Statistics', icon: '📊' },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: '⚙️', badge: true }] : [])
  ]

  // Generate floating particles
  const generateParticles = () => {
    return [...Array(6)].map((_, i) => (
      <div
        key={i}
        className="navbar-particle"
        style={{
          left: Math.random() * 100 + '%',
          animationDelay: Math.random() * 6 + 's',
          animationDuration: Math.random() * 4 + 6 + 's'
        }}
      />
    ))
  }

  return (
    <nav className={`modern-navbar ${isScrolled ? 'scrolled' : ''}`}>
      {/* Floating particles */}
      {generateParticles()}
      
      {/* Progress bar for quiz pages */}
      {quizProgress > 0 && (
        <div 
          className="navbar-progress" 
          style={{ width: `${quizProgress}%` }}
        />
      )}

      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🧠</span>
          <span className="logo-text">Curiodex</span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="navbar-nav">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link ${isActivePath(item.path) ? 'active' : ''}`}
                onClick={item.onClick}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && <span className="admin-badge">Admin</span>}
                {isActivePath(item.path) && <div className="nav-indicator" />}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop User Section */}
        <div className="navbar-user">
          <div className="user-info">
            <div className="user-avatar">
              {getInitials(profile?.username || profile?.email)}
            </div>
            <span className="user-name">
              {profile?.username || 'User'}
            </span>
          </div>
          
          <button onClick={signOut} className="sign-out-btn">
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-toggle"
          onClick={handleMobileMenuToggle}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-nav">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`nav-link ${isActivePath(item.path) ? 'active' : ''}`}
                onClick={item.onClick}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && <span className="admin-badge">Admin</span>}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mobile-user-section">
          <div className="mobile-user-info">
            <div className="mobile-user-avatar">
              {getInitials(profile?.username || profile?.email)}
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: '500' }}>
                {profile?.username || 'User'}
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                {profile?.email}
              </div>
            </div>
          </div>
          
          <button onClick={signOut} className="mobile-sign-out">
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  )
}