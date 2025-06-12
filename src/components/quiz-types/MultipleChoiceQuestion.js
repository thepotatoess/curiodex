// src/components/quiz-types/MultipleChoiceQuestion.js
import { BaseQuizQuestion } from './BaseQuizQuestion'

export class MultipleChoiceQuestion extends BaseQuizQuestion {
  constructor(questionData) {
    super(questionData)
    this.options = questionData.options || '[]'
    this.correct_answer = questionData.correct_answer
  }

  validateAnswer(userAnswer) {
    return userAnswer === this.correct_answer
  }

  getCorrectAnswer() {
    return this.correct_answer
  }

  renderQuestion() {
    return 'MultipleChoiceQuestionComponent'
  }
}