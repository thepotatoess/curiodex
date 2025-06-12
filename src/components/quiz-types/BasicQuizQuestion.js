// src/components/quiz-types/BaseQuizQuestion.js
export class BaseQuizQuestion {
  constructor(questionData) {
    this.id = questionData.id
    this.quiz_id = questionData.quiz_id
    this.question_text = questionData.question_text
    this.question_type = questionData.question_type
    this.points = questionData.points || 10
    this.time_limit_seconds = questionData.time_limit_seconds || 30
    this.explanation = questionData.explanation
    this.order_index = questionData.order_index
  }

  // Abstract methods that each quiz type must implement
  validateAnswer(userAnswer) {
    throw new Error('validateAnswer must be implemented by quiz type')
  }

  getCorrectAnswer() {
    throw new Error('getCorrectAnswer must be implemented by quiz type')
  }

  renderQuestion() {
    throw new Error('renderQuestion must be implemented by quiz type')
  }
}