/**
 * ConfirmDialog Component
 * Generic confirmation dialog
 */

import React from 'react';

/**
 * Confirmation dialog
 * @param {Object} props - Component props
 */
function ConfirmDialog({
  isOpen,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
        </div>

        <div className="modal-body">
          <p className="confirm-message">{message}</p>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button 
              type="button" 
              className={isDangerous ? 'btn-danger' : 'btn-primary'}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
