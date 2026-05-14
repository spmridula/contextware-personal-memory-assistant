/**
 * Controls Component
 * Camera and detection control buttons
 */

import React from 'react';

/**
 * Control panel component
 * @param {Object} props - Component props
 */
function Controls({
  isCameraActive,
  isDetecting,
  isModelLoaded,
  canCapture,
  faceCount = 0,
  onStartCamera,
  onStopCamera,
  onToggleDetection,
  onCaptureFace,
  disabled = false,
}) {
  return (
    <div className="controls">
      <div className="controls-row">
        {!isCameraActive ? (
          <button
            className="btn-primary btn-large"
            onClick={onStartCamera}
            disabled={disabled || !isModelLoaded}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            Start Camera
          </button>
        ) : (
          <button
            className="btn-secondary btn-large"
            onClick={onStopCamera}
            disabled={disabled}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
            </svg>
            Stop Camera
          </button>
        )}

        <button
          className={`btn-large ${isDetecting ? 'btn-active' : 'btn-secondary'}`}
          onClick={onToggleDetection}
          disabled={disabled || !isCameraActive}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/>
          </svg>
          {isDetecting ? 'Detection On' : 'Detection Off'}
        </button>
      </div>

      <div className="controls-row">
        <button
          className="btn-primary btn-large btn-capture"
          onClick={onCaptureFace}
          disabled={disabled || !canCapture}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          Add Person
          {faceCount > 0 && <span className="face-badge">{faceCount}</span>}
        </button>
      </div>

      {!isModelLoaded && (
        <div className="controls-hint">
          Loading face detection models...
        </div>
      )}

      {isModelLoaded && !isCameraActive && (
        <div className="controls-hint">
          Start the camera to begin face detection
        </div>
      )}

      {isCameraActive && !isDetecting && (
        <div className="controls-hint">
          Enable detection to recognize faces
        </div>
      )}

      {isDetecting && faceCount === 0 && (
        <div className="controls-hint">
          No faces detected - position a face in view
        </div>
      )}

      {isDetecting && faceCount > 0 && (
        <div className="controls-hint">
          {faceCount} face{faceCount > 1 ? 's' : ''} detected - Click "Add Person" to save
        </div>
      )}
    </div>
  );
}

export default Controls;
