// src/components/quiz-types/components/MultipleChoiceQuestionComponent.js
import React from 'react'
//import '../../css/QuizQuestion.css'

export default function MultipleChoiceQuestionComponent({ 
  question, 
  onAnswer, 
  userAnswer, 
  showFeedback, 
  timeRemaining 
}) {
  const handleOptionClick = (option) => {
    if (!showFeedback && onAnswer) {
      onAnswer(option)
    }
  }

  const getOptionClassName = (option) => {
    let className = 'quiz-option'
    
    if (!showFeedback && userAnswer === option) {
      className += ' selected'
    }
    
    if (showFeedback) {
      if (option === question.correct_answer) {
        className += ' correct'
      } else if (userAnswer === option && option !== question.correct_answer) {
        className += ' incorrect'
      }
    }
    
    return className
  }
}