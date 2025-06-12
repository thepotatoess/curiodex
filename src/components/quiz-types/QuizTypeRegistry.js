// src/components/quiz-types/QuizTypeRegistry.js
export const QUIZ_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  MAP_CLICK: 'map_click'
}

export const QUIZ_TYPE_CONFIG = {
  [QUIZ_TYPES.MULTIPLE_CHOICE]: {
    name: 'Multiple Choice',
    description: 'Choose the correct answer from multiple options',
    icon: '📝',
    component: 'MultipleChoiceQuestionComponent',
    hasOptions: true,
    hasTimer: true
  },
  [QUIZ_TYPES.MAP_CLICK]: {
    name: 'Map Quiz',
    description: 'Click on the correct location on a map',
    icon: '🗺️',
    component: 'MapClickQuestionComponent',
    hasOptions: false,
    hasTimer: true,
    requiresMap: true,
    availableMaps: ['world', 'europe']
  }
}