// src/components/quiz-types/components/MapClickQuestionComponent.js
import React, { useState } from 'react'
import WorldMap from '../maps/WorldMap'
import EuropeMap from '../maps/EuropeMap'

// Map component selector
const MAP_COMPONENTS = {
  world: WorldMap,
  europe: EuropeMap
}

// Country name mappings for display
const COUNTRY_DISPLAY_NAMES = {
  'FR': 'France',
  'DE': 'Germany', 
  'IT': 'Italy',
  'ES': 'Spain',
  'UK': 'United Kingdom',
  'PT': 'Portugal',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'US': 'United States',
  'CA': 'Canada',
  'BR': 'Brazil',
  'AU': 'Australia',
  'CN': 'China',
  'RU': 'Russia',
  'IN': 'India',
  'JP': 'Japan',
  'MX': 'Mexico',
  'AR': 'Argentina'
}

export default function MapClickQuestionComponent({ 
  question, 
  onAnswer, 
  userAnswer, 
  showFeedback, 
  timeRemaining 
}) {
  const [clickedRegion, setClickedRegion] = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Get the correct map component
  const MapComponent = MAP_COMPONENTS[question.map_type] || MAP_COMPONENTS.world

  const handleRegionClick = (regionId, regionName) => {
    if (showFeedback) return // Don't allow clicks after feedback is shown
    
    setClickedRegion(regionId)
    setIsAnimating(true)
    
    // Brief delay for visual feedback
    setTimeout(() => {
      onAnswer(regionId)
      setIsAnimating(false)
    }, 300)
  }

  const isCorrectAnswer = (regionId) => {
    return question.validateAnswer(regionId)
  }

  const getRegionStyle = (regionId) => {
    if (!showFeedback && !clickedRegion) {
      return { fill: '#e2e8f0', cursor: 'pointer' }
    }

    if (showFeedback) {
      if (isCorrectAnswer(regionId)) {
        return { fill: '#10b981', stroke: '#059669', strokeWidth: 2 }
      }
      if (userAnswer === regionId && !isCorrectAnswer(regionId)) {
        return { fill: '#ef4444', stroke: '#dc2626', strokeWidth: 2 }
      }
      return { fill: '#f1f5f9' }
    }

    if (clickedRegion === regionId) {
      return { 
        fill: '#3b82f6', 
        stroke: '#2563eb', 
        strokeWidth: 2,
        transform: isAnimating ? 'scale(1.02)' : 'scale(1)',
        transformOrigin: 'center'
      }
    }

    return { fill: '#e2e8f0', cursor: 'pointer' }
  }

  const displayTargetCountry = COUNTRY_DISPLAY_NAMES[question.target_region_id] || 
                              question.target_country

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      padding: '1.5rem',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem'
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#0f172a',
            margin: '0 0 1rem 0',
            lineHeight: '1.5'
          }}>
            {question.question_text}
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '2px solid #0ea5e9',
            borderRadius: '12px',
            fontSize: '1.1rem'
          }}>
            <span style={{ fontWeight: '500', color: '#0369a1' }}>Find:</span>
            <span style={{ fontWeight: '700', color: '#0c4a6e', fontSize: '1.2rem' }}>
              {displayTargetCountry}
            </span>
          </div>
        </div>
        
        {timeRemaining > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'white',
            border: `2px solid ${timeRemaining <= 10 ? '#ef4444' : '#e2e8f0'}`,
            borderRadius: '12px',
            fontWeight: '600',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            color: timeRemaining <= 10 ? '#dc2626' : 'inherit',
            animation: timeRemaining <= 10 ? 'pulse 1s infinite' : 'none'
          }}>
            <span style={{ fontSize: '1.2rem' }}>⏱️</span>
            <span style={{ fontSize: '1.1rem', fontFamily: 'Monaco, monospace' }}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}
      </div>

      <div style={{
        position: 'relative',
        background: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1rem',
        overflow: 'hidden',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <MapComponent 
          onRegionClick={handleRegionClick}
          getRegionStyle={getRegionStyle}
          disabled={showFeedback}
        />
      </div>

      {showFeedback && (
        <div style={{
          padding: '1.5rem',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          animation: 'slideUp 0.5s ease-out',
          background: isCorrectAnswer(userAnswer) 
            ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
            : 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
          border: `2px solid ${isCorrectAnswer(userAnswer) ? '#10b981' : '#ef4444'}`
        }}>
          <div style={{ fontSize: '2rem', flexShrink: 0 }}>
            {isCorrectAnswer(userAnswer) ? '🎉' : '❌'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              color: isCorrectAnswer(userAnswer) ? '#065f46' : '#991b1b'
            }}>
              {isCorrectAnswer(userAnswer) ? (
                `Correct! You found ${displayTargetCountry}!`
              ) : (
                `Not quite! That was ${COUNTRY_DISPLAY_NAMES[userAnswer] || 'an incorrect region'}. The correct answer is ${displayTargetCountry}.`
              )}
            </div>
            {question.explanation && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '400',
                opacity: '0.8',
                color: isCorrectAnswer(userAnswer) ? '#065f46' : '#991b1b'
              }}>
                {question.explanation}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '1rem',
        borderTop: '1px solid #e2e8f0',
        fontSize: '0.9rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '1rem',
          color: '#6b7280',
          fontWeight: '500'
        }}>
          <span>🎯 {question.points} points</span>
          <span>🗺️ {question.map_type.charAt(0).toUpperCase() + question.map_type.slice(1)} Map</span>
        </div>
        
        {!showFeedback && (
          <div style={{
            color: '#9ca3af',
            fontStyle: 'italic'
          }}>
            Click on the highlighted country or region on the map
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}