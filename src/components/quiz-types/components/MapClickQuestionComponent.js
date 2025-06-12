// src/components/quiz-types/components/MapClickQuestionComponent.js
import React from 'react';
import WorldMap from '../maps/WorldMap';
import EuropeMap from '../maps/EuropeMap';
import '../../../css/MapQuiz.css'; // Assuming you have some styles here

export default function MapClickQuestionComponent({
  question,
  onAnswer,
  userAnswer,
  showFeedback,
  timeRemaining,
}) {
  // This function is passed to the map components to style each region
  // based on the quiz's state (answered, correct, incorrect, etc.).
  const getRegionStyle = (regionId) => {
    let fill = '#e2e8f0'; // Default color for a clickable region

    // Determine if the region is the correct answer
    const isCorrect =
      question.target_region_id === regionId ||
      (question.acceptable_regions || []).includes(regionId);

    if (showFeedback) {
      if (isCorrect) {
        fill = '#10b981'; // Green for correct answer
      } else if (userAnswer === regionId) {
        fill = '#ef4444'; // Red for the user's incorrect choice
      }
    } else {
      if (userAnswer === regionId) {
        fill = '#3b82f6'; // Blue for the user's selected answer
      }
    }
    return { fill };
  };

  // This function determines which map to show based on the question data
  const renderMap = () => {
    const mapProps = {
      onRegionClick: (regionId) => !showFeedback && onAnswer(regionId),
      getRegionStyle: getRegionStyle,
      disabled: showFeedback,
    };

    switch (question.map_type) {
      case 'europe':
        return <EuropeMap {...mapProps} />;
      case 'world':
        return <WorldMap {...mapProps} />;
      default:
        return <p>Map type '{question.map_type}' not supported.</p>;
    }
  };

  return (
    <div className="map-question-container">
      <div className="map-wrapper">{renderMap()}</div>

      {showFeedback && (
        <div className="map-feedback">
          <p>
            The correct answer was <strong>{question.target_country}</strong>.
          </p>
          {question.explanation && (
            <div className="question-explanation">
              <h4>Explanation:</h4>
              <p>{question.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}