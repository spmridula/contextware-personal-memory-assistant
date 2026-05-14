/**
 * AddPersonModal Component
 * Modal for capturing and saving a new person.
 * Now includes "Last Conversation" field and Voice Input / Speech-to-Text.
 */

import React, { useState, useCallback } from 'react';
import VoiceInputButton from './VoiceInputButton';

/**
 * Add person modal
 * @param {Object} props - Component props
 */
function AddPersonModal({
  isOpen,
  onClose,
  onSave,
  capturedImage = null,
  embedding = null,
  existingPerson = null, // For duplicate warning
}) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [lastConversation, setLastConversation] = useState(''); // NEW FIELD
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Voice input handler ─────────────────────────────────────────────────
  const handleVoiceResult = useCallback(({ name: vName, relation: vRelation, lastConversation: vConv }) => {
    if (vName) setName(vName);
    if (vRelation) setNote((prev) => prev || vRelation); // Don't overwrite if user already typed
    if (vConv) setLastConversation((prev) => prev || vConv);
  }, []);

  // ── Form submission ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!embedding) {
      setError('No face captured. Please try again.');
      return;
    }

    setSaving(true);

    try {
      const result = await onSave({
        name: name.trim(),
        note: note.trim(),
        lastConversation: lastConversation.trim(), // NEW FIELD
        embedding: embedding,
      });

      if (result.success) {
        setName('');
        setNote('');
        setLastConversation('');
        onClose();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [name, note, lastConversation, embedding, onSave, onClose]);

  // ── Force save (duplicate override) ────────────────────────────────────
  const handleForceSave = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await onSave({
        name: name.trim(),
        note: note.trim(),
        lastConversation: lastConversation.trim(), // NEW FIELD
        embedding: embedding,
      }, true); // Force flag

      if (result.success) {
        setName('');
        setNote('');
        setLastConversation('');
        onClose();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [name, note, lastConversation, embedding, onSave, onClose]);

  // ── Close handler ────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setName('');
    setNote('');
    setLastConversation('');
    setError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Person</h2>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>

        <div className="modal-body">
          {capturedImage && (
            <div className="captured-face">
              <img src={capturedImage} alt="Captured face" />
            </div>
          )}

          {existingPerson && (
            <div className="duplicate-warning">
              <p>This face looks similar to <strong>{existingPerson.name}</strong>.</p>
              <p>Do you still want to add it?</p>
            </div>
          )}

          {/* ── Voice Input ──────────────────────────────────────────── */}
          <div className="voice-input-section">
            <p className="voice-input-label">
              🎤 <strong>Voice Fill</strong> — speak to auto-fill the fields below
            </p>
            <VoiceInputButton
              onResult={handleVoiceResult}
              disabled={saving}
            />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="person-name">Name *</label>
              <input
                type="text"
                id="person-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter person's name"
                maxLength={50}
                autoFocus
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="person-note">Relation / Note (optional)</label>
              <textarea
                id="person-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Friend from college, Work colleague…"
                maxLength={200}
                rows={2}
                disabled={saving}
              />
            </div>

            {/* ── NEW: Last Conversation field ─────────────────────────── */}
            <div className="form-group">
              <label htmlFor="person-last-conversation">Last Conversation (optional)</label>
              <textarea
                id="person-last-conversation"
                value={lastConversation}
                onChange={(e) => setLastConversation(e.target.value)}
                placeholder="e.g. We talked about vectors and assignments yesterday."
                maxLength={500}
                rows={3}
                disabled={saving}
              />
            </div>

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </button>
              {existingPerson ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleForceSave}
                  disabled={saving || !name.trim()}
                >
                  {saving ? 'Saving...' : 'Add Anyway'}
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving || !name.trim()}
                >
                  {saving ? 'Saving...' : 'Save Person'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddPersonModal;
