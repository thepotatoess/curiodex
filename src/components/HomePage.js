import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../css/Homepage.css'

export default function HomePage() {
  const [currentFeature, setCurrentFeature] = useState(0)
  const [stats, setStats] = useState({
    quizzes: 0,
    attempts: 0,
    users: 0
  })

  // Mock stats animation on load
  useEffect(() => {
    const animateStats = () => {
      const targets = { quizzes: 25, attempts: 1247, users: 89 }
      const duration = 2000
      const steps = 50
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

    animateStats()
  }, [])

  const features = [
    {
      icon: '🧠',
      title: 'Interactive Quizzes',
      description: 'Test your knowledge with our engaging, timed quizzes across multiple subjects. Get immediate feedback and track your progress.',
      status: 'Available Now',
      isAvailable: true
    },
    {
      icon: '📚',
      title: 'Learning Articles',
      description: 'Deep-dive into topics with our comprehensive, expert-written articles designed to enhance your understanding.',
      status: 'Coming Soon',
      isAvailable: false
    },
    {
      icon: '🗺️',
      title: 'Learning Paths',
      description: 'Structured learning journeys that guide you from beginner to expert with curated content and milestones.',
      status: 'Coming Soon',
      isAvailable: false
    },
    {
      icon: '🎯',
      title: 'Personalized Learning',
      description: 'AI-powered recommendations based on your progress, interests, and learning style preferences.',
      status: 'Coming Soon',
      isAvailable: false
    }
  ]

  const categories = [
    { name: 'Geography', icon: '🌍', color: '#059669' },
    { name: 'History', icon: '🏛️', color: '#dc2626' },
    { name: 'Science', icon: '🔬', color: '#2563eb' },
    { name: 'Technology', icon: '💻', color: '#7c3aed' },
    { name: 'Literature', icon: '📖', color: '#ea580c' },
    { name: 'Mathematics', icon: '🔢', color: '#0891b2' },
    { name: 'Art & Culture', icon: '🎨', color: '#be185d' },
    { name: 'Languages', icon: '🗣️', color: '#16a34a' }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Generate floating background elements
  const generateFloatingElements = () => {
    return [...Array(15)].map((_, i) => (
      <div
        key={i}
        className="floating-element"
        style={{
          width: Math.random() * 100 + 50 + 'px',
          height: Math.random() * 100 + 50 + 'px',
          left: Math.random() * 100 + '%',
          top: Math.random() * 100 + '%',
          animationDuration: Math.random() * 6 + 4 + 's',
          animationDelay: Math.random() * 2 + 's'
        }}
      />
    ))
  }

  return (
    <div className="homepage">
      {/* Animated Background Elements */}
      <div className="homepage-bg">
        {generateFloatingElements()}
      </div>

      <div className="homepage-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">Curiodex</h1>
            
            <p className="hero-subtitle">
              Your gateway to knowledge through interactive learning experiences. 
              Discover, learn, and grow with our comprehensive educational platform.
            </p>

            <div className="hero-buttons">
              <Link to="/quizzes" className="hero-btn-primary">
                <span>🚀</span>
                Start Learning Now
              </Link>
              
              <a href="#features" className="hero-btn-secondary">
                <span>📖</span>
                Explore Features
              </a>
            </div>

            {/* Live Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{stats.quizzes}+</span>
                <span className="stat-label">Interactive Quizzes</span>
              </div>
              
              <div className="stat-card">
                <span className="stat-value">{stats.attempts.toLocaleString()}+</span>
                <span className="stat-label">Quiz Attempts</span>
              </div>
              
              <div className="stat-card">
                <span className="stat-value">{stats.users}+</span>
                <span className="stat-label">Active Learners</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="section-glass">
          <h2 className="section-title">Learning Platform Features</h2>
          
          <p className="section-subtitle">
            Discover our comprehensive suite of learning tools designed to make education 
            engaging, effective, and accessible to everyone.
          </p>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`feature-card ${currentFeature === index ? 'active' : ''}`}
                onClick={() => setCurrentFeature(index)}
              >
                <span className="feature-icon">{feature.icon}</span>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <span className={`feature-status ${feature.isAvailable ? 'available' : 'coming-soon'}`}>
                  {feature.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Categories Section */}
        <section className="section">
          <h2 className="section-title">Explore Knowledge Categories</h2>
          
          <p className="section-subtitle">
            Dive into diverse subjects and expand your understanding across 
            multiple disciplines and areas of expertise.
          </p>

          <div className="categories-grid">
            {categories.map((category, index) => (
              <div
                key={index}
                className="category-card"
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <span className="category-icon">{category.icon}</span>
                <h3 className="category-name" style={{ color: category.color }}>
                  {category.name}
                </h3>
              </div>
            ))}
          </div>
        </section>

        {/* Vision Section */}
        <section className="section-glass">
          <h2 className="section-title">The Future of Learning</h2>
          
          <p className="section-subtitle">
            Curiodex is evolving into a comprehensive learning ecosystem where knowledge 
            comes alive through interactive experiences, personalized paths, and community-driven content.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <span className="feature-icon">📊</span>
              <h3 className="feature-title">Progress Tracking</h3>
              <p className="feature-description">
                Monitor your learning journey with detailed analytics, achievement badges, 
                and personalized insights to optimize your study habits.
              </p>
            </div>
            
            <div className="feature-card">
              <span className="feature-icon">👥</span>
              <h3 className="feature-title">Community Learning</h3>
              <p className="feature-description">
                Connect with fellow learners, share knowledge, participate in discussions, 
                and learn from diverse perspectives around the world.
              </p>
            </div>
            
            <div className="feature-card">
              <span className="feature-icon">🏆</span>
              <h3 className="feature-title">Achievements & Certifications</h3>
              <p className="feature-description">
                Earn certificates, unlock achievements, and showcase your expertise 
                with verifiable credentials recognized by educational institutions.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="cta-section">
          <h2 className="cta-title">Ready to Begin Your Learning Journey?</h2>
          
          <p className="cta-description">
            Join thousands of learners who are already expanding their knowledge with Curiodex. 
            Start with our interactive quizzes and stay tuned for exciting new features that will 
            transform how you learn and grow.
          </p>

          <div className="cta-buttons">
            <Link to="/quizzes" className="cta-btn-primary">
              <span>🎯</span>
              Take Your First Quiz
            </Link>
            
            <Link to="/stats" className="cta-btn-secondary">
              <span>📊</span>
              View Your Progress
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="homepage-footer">
          <p className="footer-text">
            © 2025 Curiodex - Empowering minds through interactive learning experiences
          </p>
        </footer>
      </div>
    </div>
  )
}