/**
 * StatusBar Component
 * Shows system status information
 */

import React from 'react';

/**
 * Status bar component
 * @param {Object} props - Component props
 */
function StatusBar({
  isModelLoaded,
  hasWebGL,
  backend,
  faceCount,
  storedCount,
  maxStored,
  fps = null,
}) {
  return (
    <div className="status-bar">
      <div className="status-item">
        <span className={`status-dot ${isModelLoaded ? 'status-ok' : 'status-loading'}`}></span>
        <span>Models: {isModelLoaded ? 'Ready' : 'Loading'}</span>
      </div>

      <div className="status-item">
        <span className={`status-dot ${hasWebGL ? 'status-ok' : 'status-warning'}`}></span>
        <span>Backend: {backend || 'Unknown'}</span>
      </div>

      <div className="status-item">
        <span>Faces: {faceCount}</span>
      </div>

      <div className="status-item">
        <span>Stored: {storedCount}/{maxStored}</span>
      </div>

      {fps !== null && (
        <div className="status-item">
          <span>FPS: {fps.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

export default StatusBar;
