// src/components/quiz-types/QuizTypeFactory.js
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion'
import { MapClickQuestion } from './MapClickQuestion'
import { QUIZ_TYPES, QUIZ_TYPE_CONFIG } from './QuizTypeRegistry'

export class QuizTypeFactory {
  static createQuestion(questionData) {
    switch (questionData.question_type) {
      case QUIZ_TYPES.MULTIPLE_CHOICE:
        return new MultipleChoiceQuestion(questionData)
      
      case QUIZ_TYPES.MAP_CLICK:
        return new MapClickQuestion(questionData)
      
      default:
        throw new Error(`Unknown quiz type: ${questionData.question_type}`)
    }
  }

  static getAvailableTypes() {
    return Object.values(QUIZ_TYPES)
  }

  static getTypeConfig(type) {
    return QUIZ_TYPE_CONFIG[type]
  }
}