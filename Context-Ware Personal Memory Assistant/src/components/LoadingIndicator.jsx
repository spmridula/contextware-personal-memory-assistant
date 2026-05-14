/**
 * LoadingIndicator Component
 * Shows loading state with progress
 */

import React from 'react';

/**
 * Loading indicator with optional progress
 * @param {Object} props - Component props
 */
function LoadingIndicator({ message = 'Loading...', progress = null, stage = '' }) {
  return (
    <div className="loading-indicator">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
      {stage && <p className="loading-stage">{stage}</p>}
      {progress !== null && (
        <div className="loading-progress-container">
          <div 
            className="loading-progress-bar" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default LoadingIndicator;
