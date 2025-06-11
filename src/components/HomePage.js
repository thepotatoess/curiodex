import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../css/Homepage.css'

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [stats, setStats] = useState({
    quizzes: 0,
    attempts: 0,
    users: 0
  })
  const [categories, setCategories] = useState([])
  const [demoQuestion, setDemoQuestion] = useState(0)
  const [selectedDemoAnswer, setSelectedDemoAnswer] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Demo questions for interactive preview
  const demoQuestions = [
    {
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correct: 2
    },
    {
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correct: 1
    },
    {
      question: "Who painted the Mona Lisa?",
      options: ["Van Gogh", "Picasso", "Leonardo da Vinci", "Michelangelo"],
      correct: 2
    }
  ]

  useEffect(() => {
    loadInitialData()
  }, [])

  // Animate demo question rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setDemoQuestion(prev => (prev + 1) % demoQuestions.length)
      setSelectedDemoAnswer(null)
    }, 4000)

    return () => clearInterval(timer)
  }, [])

  // Handle the start learning button
  const handleStartLearning = () => {
    if (user) {
      // User is logged in - go to quizzes
      navigate('/quizzes')
    } else {
      // User is not logged in - go to login page
      navigate('/login')
    }
  }

  // Handle category clicks
  const handleCategoryClick = (categoryName) => {
    if (user) {
      // User is logged in - go to filtered quizzes
      navigate(`/quizzes?category=${encodeURIComponent(categoryName)}`)
    } else {
      // User is not logged in - go to login page
      navigate('/login')
    }
  }

  const loadInitialData = async () => {
    try {
      // Load real stats from database
      const [usersResult, quizzesResult, attemptsResult, categoriesResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('quizzes').select('id', { count: 'exact' }).eq('is_published', true),
        supabase.from('user_quiz_attempts').select('id', { count: 'exact' }),
        supabase.from('quiz_categories').select('name, icon, color').eq('is_active', true).limit(8)
      ])

      // Animate stats counting up
      const targetStats = {
        quizzes: quizzesResult.count || 0,
        attempts: attemptsResult.count || 0,
        users: usersResult.count || 0
      }

      // Add some buffer numbers if real data is low for demo purposes
      const finalStats = {
        quizzes: Math.max(targetStats.quizzes, 25),
        attempts: Math.max(targetStats.attempts, 1247),
        users: Math.max(targetStats.users, 89)
      }

      animateStats(finalStats)
      
      if (categoriesResult.data) {
        setCategories(categoriesResult.data)
      }

    } catch (error) {
      console.error('Error loading homepage data:', error)
      // Fallback to demo data
      animateStats({ quizzes: 25, attempts: 1247, users: 89 })
    } finally {
      setIsLoading(false)
    }
  }

  const animateStats = (targets) => {
    const duration = 2000
    const steps = 60
    const stepTime = duration / steps

    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const easeOut = 1 - Math.pow(1 - progress, 3)

      setStats({
        quizzes: Math.floor(targets.quizzes * easeOut),
        attempts: Math.floor(targets.attempts * easeOut),
        users: Math.floor(targets.users * easeOut)
      })

      if (step >= steps) {
        clearInterval(timer)
        setStats(targets)
      }
    }, stepTime)
  }

  const features = [
    {
      icon: '🧠',
      title: 'Interactive Quizzes',
      description: 'Test your knowledge with engaging, timed quizzes across multiple subjects. Get immediate feedback and detailed explanations to enhance your learning.',
      status: 'Available Now',
      isAvailable: true
    },
    {
      icon: '📊',
      title: 'Progress Tracking',
      description: 'Monitor your learning journey with detailed analytics, achievement badges, and personalized insights to optimize your study habits.',
      status: 'Available Now',
      isAvailable: true
    },
    {
      icon: '📚',
      title: 'Learning Articles',
      description: 'Deep-dive into topics with comprehensive, expert-written articles designed to enhance your understanding and knowledge retention.',
      status: 'Coming Soon',
      isAvailable: false
    },
    {
      icon: '🎯',
      title: 'Personalized Learning',
      description: 'AI-powered recommendations based on your progress, interests, and learning style preferences for optimized learning paths.',
      status: 'Coming Soon',
      isAvailable: false
    },
    {
      icon: '👥',
      title: 'Community Learning',
      description: 'Connect with fellow learners, share knowledge, participate in discussions, and learn from diverse perspectives worldwide.',
      status: 'Coming Soon',
      isAvailable: false
    },
    {
      icon: '🏆',
      title: 'Achievements & Certifications',
      description: 'Earn certificates, unlock achievements, and showcase your expertise with verifiable credentials recognized by institutions.',
      status: 'Coming Soon',
      isAvailable: false
    }
  ]

  // Fallback categories if none loaded from database
  const defaultCategories = [
    { name: 'Geography', icon: '🌍', color: '#059669' },
    { name: 'History', icon: '🏛️', color: '#dc2626' },
    { name: 'Science', icon: '🔬', color: '#2563eb' },
    { name: 'Technology', icon: '💻', color: '#7c3aed' },
    { name: 'Literature', icon: '📖', color: '#ea580c' },
    { name: 'Mathematics', icon: '🔢', color: '#0891b2' },
    { name: 'Art & Culture', icon: '🎨', color: '#be185d' },
    { name: 'Languages', icon: '🗣️', color: '#16a34a' }
  ]

  const displayCategories = categories.length > 0 ? categories : defaultCategories

  const handleDemoAnswer = (index) => {
    setSelectedDemoAnswer(index)
  }

  if (isLoading) {
    return (
      <div className="homepage">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          color: '#6b7280',
          fontSize: '1.2rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
            <div>Loading Curiodex...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="homepage">
      {/* Clean Background */}
      <div className="homepage-bg">
        <div className="bg-gradient" />
      </div>

      <div className="homepage-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              Learn Smarter with{' '}
              <span className="gradient-text">Curiodex</span>
            </h1>
            
            <p className="hero-subtitle">
              Discover knowledge through interactive quizzes, track your progress, and 
              unlock your learning potential with our comprehensive educational platform 
              designed for curious minds.
            </p>

            <div className="hero-buttons">
              <button 
                onClick={handleStartLearning}
                className="hero-btn-primary"
              >
                <span>🎯</span>
                <span>{user ? 'Continue Learning' : 'Start Learning Now'}</span>
              </button>
              
              <a href="#features" className="hero-btn-secondary">
                <span>✨</span>
                <span>Explore Features</span>
              </a>
            </div>

            {/* Live Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon">🧠</span>
                <span className="stat-value">{stats.quizzes.toLocaleString()}+</span>
                <span className="stat-label">Interactive Quizzes</span>
              </div>
              
              <div className="stat-card">
                <span className="stat-icon">🎯</span>
                <span className="stat-value">{stats.attempts.toLocaleString()}+</span>
                <span className="stat-label">Quiz Attempts</span>
              </div>
              
              <div className="stat-card">
                <span className="stat-icon">👥</span>
                <span className="stat-value">{stats.users.toLocaleString()}+</span>
                <span className="stat-label">Active Learners</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="section">
          <div className="section-header">
            <div className="section-badge">Features</div>
            <h2 className="section-title">Everything You Need to Learn</h2>
            <p className="section-subtitle">
              Discover our comprehensive suite of learning tools designed to make education 
              engaging, effective, and accessible to everyone, everywhere.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`feature-card ${feature.isAvailable ? 'available' : 'coming-soon'} interactive-element`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="feature-header">
                  <div className="feature-icon">{feature.icon}</div>
                  <h3 className="feature-title">{feature.title}</h3>
                </div>
                <p className="feature-description">{feature.description}</p>
                <span className={`feature-status ${feature.isAvailable ? 'available' : 'coming-soon'}`}>
                  {feature.isAvailable && <span>✅</span>}
                  {!feature.isAvailable && <span>🚧</span>}
                  <span>{feature.status}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Categories Section */}
        <section className="section">
          <div className="section-header">
            <div className="section-badge">Subjects</div>
            <h2 className="section-title">Explore Knowledge Categories</h2>
            <p className="section-subtitle">
              Dive into diverse subjects and expand your understanding across 
              multiple disciplines and areas of expertise.
            </p>
          </div>

          <div className="categories-grid">
            {displayCategories.slice(0, 8).map((category, index) => (
              <div
                key={index}
                onClick={() => handleCategoryClick(category.name)}
                className="category-card interactive-element"
                style={{
                  '--category-color': category.color,
                  animationDelay: `${index * 0.1}s`,
                  cursor: 'pointer'
                }}
              >
                <span className="category-icon">{category.icon}</span>
                <h3 className="category-name">{category.name}</h3>
                <p className="category-count">
                  {user ? 'Explore quizzes' : 'Sign in to explore'}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="cta-section">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Begin Your Learning Journey?</h2>
            
            <p className="cta-description">
              {user 
                ? "Continue your learning adventure with Curiodex. Take on new challenges and expand your knowledge."
                : "Join thousands of learners who are already expanding their knowledge with Curiodex. Start with our interactive quizzes and discover a new way to learn and grow."
              }
            </p>

            <div className="cta-buttons">
              <button 
                onClick={handleStartLearning}
                className="cta-btn-primary"
              >
                <span>🎯</span>
                <span>{user ? 'Continue Learning' : 'Take Your First Quiz'}</span>
              </button>
              
              {user ? (
                <Link to="/stats" className="cta-btn-secondary">
                  <span>📊</span>
                  <span>View Your Progress</span>
                </Link>
              ) : (
                <button 
                  onClick={() => navigate('/login')}
                  className="cta-btn-secondary"
                >
                  <span>🚀</span>
                  <span>Join Curiodex</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="homepage-footer">
          <div className="footer-content">
            <p className="footer-text">
              © 2025 Curiodex - Empowering minds through interactive learning experiences
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}