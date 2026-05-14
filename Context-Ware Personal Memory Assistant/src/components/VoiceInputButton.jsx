/**
 * VoiceInputButton Component
 * Renders a record button with listening/processing states.
 * Calls onResult({ name, relation, lastConversation, transcript }) when done.
 */

import React from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';

/**
 * @param {Object} props
 * @param {Function} props.onResult  - Called with parsed fields
 * @param {Function} [props.onError] - Called with error string
 * @param {boolean}  [props.disabled]
 */
function VoiceInputButton({ onResult, onError, disabled = false }) {
  const {
    isSupported,
    isRecording,
    isProcessing,
    transcript,
    error,
    startRecording,
    stopRecording,
    clearError,
  } = useVoiceInput({ onResult, onError });

  if (!isSupported) {
    return (
      <div className="voice-unsupported">
        <span title="Speech recognition is not supported in this browser">
          🎤 Voice input not supported in this browser
        </span>
      </div>
    );
  }

  const handleClick = () => {
    clearError();
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  let buttonLabel = '🎤 Record';
  if (isRecording) buttonLabel = '⏹ Stop';
  if (isProcessing) buttonLabel = '⏳ Processing…';

  return (
    <div className="voice-input-wrapper">
      <button
        type="button"
        className={`btn-voice ${isRecording ? 'btn-voice--recording' : ''} ${isProcessing ? 'btn-voice--processing' : ''}`}
        onClick={handleClick}
        disabled={disabled || isProcessing}
        title={isRecording ? 'Click to stop recording' : 'Click to start voice input'}
      >
        {isRecording && <span className="voice-pulse" aria-hidden="true" />}
        {buttonLabel}
      </button>

      {isRecording && (
        <p className="voice-hint">Speak now… e.g. "This is my friend Ruth, we talked about vectors"</p>
      )}

      {isProcessing && (
        <p className="voice-hint">Parsing your speech…</p>
      )}

      {transcript && !isRecording && !isProcessing && (
        <p className="voice-transcript">
          <strong>Heard:</strong> {transcript}
        </p>
      )}

      {error && (
        <p className="voice-error">{error}</p>
      )}
    </div>
  );
}

export default VoiceInputButton;
