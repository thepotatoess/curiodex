import React from 'react'
import '../../css/QuestionForms.css'

// Available countries/regions for different map types
const MAP_REGIONS = {
  world: [
    { id: 'US', name: 'United States' },
    { id: 'CA', name: 'Canada' },
    { id: 'MX', name: 'Mexico' },
    { id: 'BR', name: 'Brazil' },
    { id: 'AR', name: 'Argentina' },
    { id: 'GB', name: 'United Kingdom' },
    { id: 'FR', name: 'France' },
    { id: 'DE', name: 'Germany' },
    { id: 'IT', name: 'Italy' },
    { id: 'ES', name: 'Spain' },
    { id: 'PT', name: 'Portugal' },
    { id: 'NL', name: 'Netherlands' },
    { id: 'BE', name: 'Belgium' },
    { id: 'CH', name: 'Switzerland' },
    { id: 'AT', name: 'Austria' },
    { id: 'PL', name: 'Poland' },
    { id: 'CZ', name: 'Czech Republic' },
    { id: 'HU', name: 'Hungary' },
    { id: 'RO', name: 'Romania' },
    { id: 'GR', name: 'Greece' },
    { id: 'SE', name: 'Sweden' },
    { id: 'NO', name: 'Norway' },
    { id: 'DK', name: 'Denmark' },
    { id: 'FI', name: 'Finland' }
  ]
}

export default function MapClickQuestionForm({ 
  question, 
  index, 
  onUpdate, 
  onRemove, 
  onMove, 
  errors, 
  totalQuestions 
}) {
  const mapData = question.map_data || {}
  const availableRegions = MAP_REGIONS[mapData.map_type] || MAP_REGIONS.world

  const updateMapData = (field, value) => {
    const updatedMapData = {
      ...mapData,
      [field]: value
    }
    
    // Auto-set target_region_id when country is selected
    if (field === 'target_country') {
      const selectedRegion = availableRegions.find(r => r.name === value)
      if (selectedRegion) {
        updatedMapData.target_region_id = selectedRegion.id
      }
    }
    
    // Reset target country when map type changes
    if (field === 'map_type') {
      updatedMapData.target_country = ''
      updatedMapData.target_region_id = ''
      updatedMapData.acceptable_regions = []
    }
    
    onUpdate(index, 'map_data', updatedMapData)
  }

  const toggleAcceptableRegion = (regionId) => {
    const currentAcceptable = mapData.acceptable_regions || []
    const newAcceptable = currentAcceptable.includes(regionId)
      ? currentAcceptable.filter(id => id !== regionId)
      : [...currentAcceptable, regionId]
    
    updateMapData('acceptable_regions', newAcceptable)
  }

  const questionTextError = errors[`question_${index}_text`]
  const targetError = errors[`question_${index}_target`]
  const mapError = errors[`question_${index}_map`]

  return (
    <div className="question-form-card">
      <div className="question-header">
        <div className="question-info">
          <div className="question-type-badge map-click">
            <span className="type-icon">🗺️</span>
            <span>Map Quiz</span>
          </div>
          <span className="question-number">Question {index + 1}</span>
        </div>
        
        <div className="question-actions">
          <button
            type="button"
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            className="btn-icon"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 'down')}
            disabled={index === totalQuestions - 1}
            className="btn-icon"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="btn-icon danger"
            title="Remove question"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="question-content">
        <div className="form-group">
          <label htmlFor={`question-text-${index}`}>Question Text *</label>
          <textarea
            id={`question-text-${index}`}
            value={question.question_text}
            onChange={(e) => onUpdate(index, 'question_text', e.target.value)}
            placeholder="e.g., 'Click on France on the map below'"
            rows="2"
            className={questionTextError ? 'error' : ''}
          />
          {questionTextError && (
            <span className="error-message">{questionTextError}</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor={`map-type-${index}`}>Map Type *</label>
            <select
              id={`map-type-${index}`}
              value={mapData.map_type || 'world'}
              onChange={(e) => updateMapData('map_type', e.target.value)}
              className={mapError ? 'error' : ''}
            >
              <option value="world">🌍 World Map</option>
              <option value="europe">🇪🇺 Europe Map</option>
            </select>
            {mapError && (
              <span className="error-message">{mapError}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor={`target-country-${index}`}>Target Country/Region *</label>
            <select
              id={`target-country-${index}`}
              value={mapData.target_country || ''}
              onChange={(e) => updateMapData('target_country', e.target.value)}
              className={targetError ? 'error' : ''}
            >
              <option value="">Select target country...</option>
              {availableRegions.map(region => (
                <option key={region.id} value={region.name}>
                  {region.name}
                </option>
              ))}
            </select>
            {targetError && (
              <span className="error-message">{targetError}</span>
            )}
          </div>
        </div>

        {mapData.target_country && (
          <div className="form-group">
            <label>Acceptable Regions (Optional)</label>
            <p className="help-text">
              Select additional regions that should be accepted as correct answers. 
              The target country is automatically accepted.
            </p>
            <div className="acceptable-regions">
              {availableRegions
                .filter(region => region.name !== mapData.target_country)
                .map(region => (
                  <label key={region.id} className="region-checkbox">
                    <input
                      type="checkbox"
                      checked={(mapData.acceptable_regions || []).includes(region.id)}
                      onChange={() => toggleAcceptableRegion(region.id)}
                    />
                    <span className="checkmark"></span>
                    <span className="region-name">{region.name}</span>
                  </label>
                ))
              }
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor={`points-${index}`}>Points</label>
            <input
              id={`points-${index}`}
              type="number"
              value={question.points}
              onChange={(e) => onUpdate(index, 'points', parseInt(e.target.value) || 10)}
              min="1"
              max="100"
              className="points-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor={`time-limit-${index}`}>Time Limit (seconds)</label>
            <input
              id={`time-limit-${index}`}
              type="number"
              value={question.time_limit_seconds}
              onChange={(e) => onUpdate(index, 'time_limit_seconds', parseInt(e.target.value) || 30)}
              min="10"
              max="300"
              className="time-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor={`explanation-${index}`}>Explanation (Optional)</label>
          <textarea
            id={`explanation-${index}`}
            value={question.explanation}
            onChange={(e) => onUpdate(index, 'explanation', e.target.value)}
            placeholder="Provide additional information about the correct answer..."
            rows="2"
            className="explanation-input"
          />
        </div>

        {mapData.target_country && (
          <div className="map-preview">
            <h5>Preview Settings</h5>
            <div className="preview-info">
              <span className="preview-item">
                <strong>Map:</strong> {mapData.map_type === 'world' ? '🌍 World' : '🇪🇺 Europe'}
              </span>
              <span className="preview-item">
                <strong>Target:</strong> {mapData.target_country}
              </span>
              {mapData.acceptable_regions && mapData.acceptable_regions.length > 0 && (
                <span className="preview-item">
                  <strong>Also accepts:</strong> {mapData.acceptable_regions.map(id => 
                    availableRegions.find(r => r.id === id)?.name
                  ).join(', ')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}