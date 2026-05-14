/**
 * AddPersonModal Component
 * Modal for capturing and saving a new person
 */

import React, { useState, useCallback } from 'react';

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
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  /**
   * Handle form submission
   */
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
        embedding: embedding,
      });

      if (result.success) {
        setName('');
        setNote('');
        onClose();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [name, note, embedding, onSave, onClose]);

  /**
   * Handle force save (for duplicates)
   */
  const handleForceSave = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await onSave({
        name: name.trim(),
        note: note.trim(),
        embedding: embedding,
      }, true); // Force flag

      if (result.success) {
        setName('');
        setNote('');
        onClose();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [name, note, embedding, onSave, onClose]);

  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    setName('');
    setNote('');
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
              <label htmlFor="person-note">Note (optional)</label>
              <textarea
                id="person-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this person"
                maxLength={200}
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
