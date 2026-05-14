/**
 * ErrorMessage Component
 * Displays error messages with retry option
 */

import React from 'react';

/**
 * Error message display with optional retry
 * @param {Object} props - Component props
 */
function ErrorMessage({ title = 'Error', message, onRetry = null, retryText = 'Try Again' }) {
  return (
    <div className="error-message">
      <div className="error-icon">!</div>
      <h3 className="error-title">{title}</h3>
      <p className="error-text">{message}</p>
      {onRetry && (
        <button className="error-retry-btn" onClick={onRetry}>
          {retryText}
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
