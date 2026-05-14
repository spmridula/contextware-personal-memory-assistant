/**
 * EditPersonModal Component
 * Modal for editing an existing person
 */

import React, { useState, useEffect, useCallback } from 'react';

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
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Initialize form with person data
  useEffect(() => {
    if (person) {
      setName(person.name || '');
      setNote(person.note || '');
    }
  }, [person]);

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

    if (!person?.id) {
      setError('Invalid person data');
      return;
    }

    setSaving(true);

    try {
      const result = await onSave(person.id, {
        name: name.trim(),
        note: note.trim(),
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
  }, [name, note, person, onSave, onClose]);

  /**
   * Handle close
   */
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
              <label htmlFor="edit-person-note">Note (optional)</label>
              <textarea
                id="edit-person-note"
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
