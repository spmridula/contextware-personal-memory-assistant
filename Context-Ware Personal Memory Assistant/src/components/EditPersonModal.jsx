/**
 * EditPersonModal Component
 * Modal for editing an existing person.
 * Now includes "Last Conversation" field and Voice Input / Speech-to-Text.
 */

import React, { useState, useEffect, useCallback } from 'react';
import VoiceInputButton from './VoiceInputButton';

/**
 * Edit person modal
 * @param {Object} props - Component props
 */
function EditPersonModal({
  isOpen,
  onClose,
  onSave,
  person = null,
}) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [lastConversation, setLastConversation] = useState(''); // NEW FIELD
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Initialize form with person data (including backward-safe lastConversation)
  useEffect(() => {
    if (person) {
      setName(person.name || '');
      setNote(person.note || '');
      setLastConversation(person.lastConversation || ''); // NEW FIELD — falls back to '' for old records
    }
  }, [person]);

  // ── Voice input handler ─────────────────────────────────────────────────
  const handleVoiceResult = useCallback(({ name: vName, relation: vRelation, lastConversation: vConv }) => {
    if (vName) setName(vName);
    if (vRelation) setNote(vRelation);
    if (vConv) setLastConversation(vConv);
  }, []);

  // ── Form submission ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!person?.id) {
      setError('Invalid person data');
      return;
    }

    setSaving(true);

    try {
      const result = await onSave(person.id, {
        name: name.trim(),
        note: note.trim(),
        lastConversation: lastConversation.trim(), // NEW FIELD
      });

      if (result.success) {
        onClose();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [name, note, lastConversation, person, onSave, onClose]);

  // ── Close handler ────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  if (!isOpen || !person) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Person</h2>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* ── Voice Input ──────────────────────────────────────────── */}
          <div className="voice-input-section">
            <p className="voice-input-label">
              🎤 <strong>Voice Fill</strong> — speak to update the fields below
            </p>
            <VoiceInputButton
              onResult={handleVoiceResult}
              disabled={saving}
            />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="edit-person-name">Name *</label>
              <input
                type="text"
                id="edit-person-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter person's name"
                maxLength={50}
                autoFocus
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-person-note">Relation / Note (optional)</label>
              <textarea
                id="edit-person-note"
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
              <label htmlFor="edit-person-last-conversation">Last Conversation (optional)</label>
              <textarea
                id="edit-person-last-conversation"
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
              <button
                type="submit"
                className="btn-primary"
                disabled={saving || !name.trim()}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditPersonModal;
