// src/components/quiz-types/maps/EuropeMap.js
import React from 'react'

const EUROPEAN_COUNTRIES = {
  'FR': { name: 'France', path: 'M 280 220 L 320 220 L 330 260 L 300 280 L 270 270 L 260 240 Z' },
  'DE': { name: 'Germany', path: 'M 320 200 L 360 200 L 370 240 L 340 250 L 320 230 Z' },
  'IT': { name: 'Italy', path: 'M 330 260 L 350 260 L 360 320 L 340 340 L 320 320 L 320 280 Z' },
  'ES': { name: 'Spain', path: 'M 200 250 L 260 250 L 270 290 L 210 300 L 180 280 Z' },
  'UK': { name: 'United Kingdom', path: 'M 240 160 L 280 160 L 285 200 L 245 200 L 235 180 Z' },
  'PT': { name: 'Portugal', path: 'M 180 250 L 200 250 L 205 300 L 185 310 L 170 290 Z' },
  'NL': { name: 'Netherlands', path: 'M 300 180 L 330 180 L 335 200 L 305 200 Z' },
  'BE': { name: 'Belgium', path: 'M 280 200 L 300 200 L 305 220 L 285 220 Z' },
  'CH': { name: 'Switzerland', path: 'M 310 240 L 330 240 L 335 260 L 315 260 Z' },
  'AT': { name: 'Austria', path: 'M 340 230 L 380 230 L 385 250 L 345 250 Z' }
}

export default function EuropeMap({ onRegionClick, getRegionStyle, disabled = false }) {
  const handleCountryClick = (countryCode, countryName) => {
    if (disabled) return
    onRegionClick(countryCode, countryName)
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <svg 
        width="600" 
        height="450" 
        viewBox="0 0 600 450"
        style={{ 
          maxWidth: '100%', 
          height: 'auto', 
          borderRadius: '12px', 
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
        }}
      >
        {/* Background */}
        <rect width="600" height="450" fill="#f0f9ff" />
        
        {/* Mediterranean Sea */}
        <ellipse cx="350" cy="350" rx="180" ry="60" fill="#bfdbfe" opacity="0.4" />
        
        {/* Atlantic Ocean */}
        <ellipse cx="150" cy="200" rx="80" ry="120" fill="#bfdbfe" opacity="0.3" />
        
        {/* Countries */}
        {Object.entries(EUROPEAN_COUNTRIES).map(([countryCode, country]) => (
          <path
            key={countryCode}
            d={country.path}
            style={{
              ...getRegionStyle(countryCode),
              stroke: '#94a3b8',
              strokeWidth: 1.5,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: disabled ? 'default' : 'pointer'
            }}
            onClick={() => handleCountryClick(countryCode, country.name)}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.target.style.filter = 'brightness(1.1)'
                e.target.style.transform = 'scale(1.02)'
                e.target.style.transformOrigin = 'center'
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled) {
                e.target.style.filter = 'brightness(1)'
                e.target.style.transform = 'scale(1)'
              }
            }}
          />
        ))}
        
        <text x="300" y="30" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#374151">
          Europe
        </text>
      </svg>
      
      <div style={{ 
        display: 'flex', 
        gap: '1.5rem', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        padding: '0.75rem 1rem',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>
          <div style={{ width: '14px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '3px', border: '1px solid #d1d5db', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}></div>
          <span>Clickable</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>
          <div style={{ width: '14px', height: '14px', backgroundColor: '#10b981', borderRadius: '3px', border: '1px solid #d1d5db', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}></div>
          <span>Correct</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>
          <div style={{ width: '14px', height: '14px', backgroundColor: '#ef4444', borderRadius: '3px', border: '1px solid #d1d5db', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}></div>
          <span>Incorrect</span>
        </div>
      </div>
    </div>
  )
}