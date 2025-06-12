// src/components/quiz-types/MapClickQuestion.js
import { BaseQuizQuestion } from './BaseQuizQuestion'

export class MapClickQuestion extends BaseQuizQuestion {
  constructor(questionData) {
    super(questionData)
    
    // Parse map-specific data
    const mapData = questionData.map_data || {}
    this.target_country = mapData.target_country
    this.target_region_id = mapData.target_region_id
    this.map_type = mapData.map_type || 'world'
    this.acceptable_regions = mapData.acceptable_regions || [this.target_region_id]
  }

  validateAnswer(clickedRegionId) {
    return this.acceptable_regions.includes(clickedRegionId) || 
           clickedRegionId === this.target_region_id
  }

  getCorrectAnswer() {
    return {
      country: this.target_country,
      regionId: this.target_region_id,
      mapType: this.map_type
    }
  }

  renderQuestion() {
    return 'MapClickQuestionComponent'
  }
}