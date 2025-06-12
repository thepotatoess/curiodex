// src/components/quiz-types/maps/WorldMap.js
import React from 'react'

const COUNTRIES = {
  'FR': { name: 'France', path: 'M 300 200 L 320 200 L 330 220 L 310 240 L 290 230 Z' },
  'DE': { name: 'Germany', path: 'M 320 180 L 340 180 L 350 200 L 330 220 L 315 210 Z' },
  'IT': { name: 'Italy', path: 'M 310 240 L 320 240 L 315 280 L 305 270 Z' },
  'ES': { name: 'Spain', path: 'M 270 230 L 300 230 L 295 260 L 265 250 Z' },
  'UK': { name: 'United Kingdom', path: 'M 280 160 L 295 160 L 290 180 L 275 175 Z' },
  'US': { name: 'United States', path: 'M 100 180 L 200 180 L 195 240 L 105 235 Z' },
  'CA': { name: 'Canada', path: 'M 100 120 L 200 120 L 195 175 L 105 170 Z' },
  'BR': { name: 'Brazil', path: 'M 180 280 L 240 280 L 235 350 L 185 345 Z' },
  'AU': { name: 'Australia', path: 'M 600 350 L 680 350 L 675 400 L 605 395 Z' },
  'CN': { name: 'China', path: 'M 500 180 L 580 180 L 575 240 L 505 235 Z' },
  'RU': { name: 'Russia', path: 'M 320 100 L 580 100 L 575 175 L 325 170 Z' },
  'IN': { name: 'India', path: 'M 480 240 L 520 240 L 515 300 L 485 295 Z' },
  'JP': { name: 'Japan', path: 'M 600 200 L 620 200 L 615 240 L 605 235 Z' },
  'MX': { name: 'Mexico', path: 'M 100 240 L 150 240 L 145 280 L 105 275 Z' },
  'AR': { name: 'Argentina', path: 'M 180 350 L 220 350 L 215 420 L 185 415 Z' }
}

export default function WorldMap({ onRegionClick, getRegionStyle, disabled = false }) {
  const handleCountryClick = (countryCode, countryName) => {
    if (disabled) return
    onRegionClick(countryCode, countryName)
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <svg 
        width="800" 
        height="500" 
        viewBox="0 0 800 500"
        style={{ 
          maxWidth: '100%', 
          height: 'auto', 
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          backgroundColor: '#f0f9ff'
        }}
      >
        {/* Background */}
        <rect width="800" height="500" fill="#f0f9ff" />
        
        {/* Ocean areas */}
        <circle cx="400" cy="250" r="300" fill="#bfdbfe" opacity="0.3" />
        
        {/* Countries */}
        {Object.entries(COUNTRIES).map(([countryCode, country]) => (
          <path
            key={countryCode}
            d={country.path}
            style={{
              ...getRegionStyle(countryCode),
              stroke: '#94a3b8',
              strokeWidth: 1,
              transition: 'all 0.3s ease',
              cursor: disabled ? 'default' : 'pointer'
            }}
            onClick={() => handleCountryClick(countryCode, country.name)}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.target.style.opacity = '0.8'
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled) {
                e.target.style.opacity = '1'
              }
            }}
          />
        ))}
        
        <text x="400" y="30" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#374151">
          World Map
        </text>
      </svg>
      
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        padding: '0.5rem',
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '2px', border: '1px solid #d1d5db' }}></div>
          <span>Click to select</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px', border: '1px solid #d1d5db' }}></div>
          <span>Correct answer</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px', border: '1px solid #d1d5db' }}></div>
          <span>Incorrect answer</span>
        </div>
      </div>
    </div>
  )
}