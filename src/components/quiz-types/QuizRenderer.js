// src/components/quiz-types/QuizRenderer.js
import React from 'react'
import { QuizTypeFactory } from './QuizTypeFactory'
import MultipleChoiceQuestionComponent from './components/MultipleChoiceQuestionComponent'
import MapClickQuestionComponent from './components/MapClickQuestionComponent'

const QUIZ_COMPONENTS = {
  MultipleChoiceQuestionComponent,
  MapClickQuestionComponent
}

export default function QuizRenderer({ 
  questionData, 
  onAnswer, 
  userAnswer, 
  showFeedback, 
  timeRemaining 
}) {
  try {
    // Create question instance
    const question = QuizTypeFactory.createQuestion(questionData)
    
    // Get the appropriate component
    const componentName = question.renderQuestion()
    const QuestionComponent = QUIZ_COMPONENTS[componentName]
    
    if (!QuestionComponent) {
      console.error(`Component ${componentName} not found`)
      return (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '8px' 
        }}>
          <h3 style={{ color: '#dc2626', margin: '0 0 0.5rem 0' }}>
            Quiz Type Not Supported
          </h3>
          <p style={{ color: '#991b1b', margin: 0 }}>
            The quiz type "{questionData.question_type}" is not yet implemented.
          </p>
        </div>
      )
    }

    return (
      <QuestionComponent
        question={question}
        onAnswer={onAnswer}
        userAnswer={userAnswer}
        showFeedback={showFeedback}
        timeRemaining={timeRemaining}
      />
    )
  } catch (error) {
    console.error('Error rendering question:', error)
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        backgroundColor: '#fef2f2', 
        border: '1px solid #fecaca', 
        borderRadius: '8px' 
      }}>
        <h3 style={{ color: '#dc2626', margin: '0 0 0.5rem 0' }}>
          Error Loading Question
        </h3>
        <p style={{ color: '#991b1b', margin: 0 }}>
          There was an error loading this question. Please try refreshing the page.
        </p>
      </div>
    )
  }
}