/**
 * PersonCard Component
 * Displays a single person entry
 */

import React from 'react';

/**
 * Person card component
 * @param {Object} props - Component props
 */
function PersonCard({ person, onEdit, onDelete }) {
  const formattedDate = new Date(person.timestamp).toLocaleDateString();

  return (
    <div className="person-card">
      <div className="person-info">
        <h3 className="person-name">{person.name}</h3>
        {person.note && (
          <p className="person-note">{person.note}</p>
        )}
        <span className="person-date">Added: {formattedDate}</span>
      </div>
      
      <div className="person-actions">
        <button 
          className="btn-icon btn-edit" 
          onClick={() => onEdit(person)}
          title="Edit"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
        <button 
          className="btn-icon btn-delete" 
          onClick={() => onDelete(person)}
          title="Delete"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default PersonCard;
