/**
 * PersonList Component
 * Displays list of stored people
 */

import React, { useState, useMemo } from 'react';
import PersonCard from './PersonCard';

/**
 * Person list component
 * @param {Object} props - Component props
 */
function PersonList({ 
  faces = [], 
  loading = false, 
  onEdit, 
  onDelete,
  maxCount = 50,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter faces based on search query
  const filteredFaces = useMemo(() => {
    if (!searchQuery.trim()) {
      return faces;
    }

    const query = searchQuery.toLowerCase();
    return faces.filter(
      (face) =>
        face.name.toLowerCase().includes(query) ||
        face.note?.toLowerCase().includes(query)
    );
  }, [faces, searchQuery]);

  // Sort by most recent first
  const sortedFaces = useMemo(() => {
    return [...filteredFaces].sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredFaces]);

  if (loading) {
    return (
      <div className="person-list">
        <div className="person-list-loading">Loading stored people...</div>
      </div>
    );
  }

  return (
    <div className="person-list">
      <div className="person-list-header">
        <h2>Stored People ({faces.length}/{maxCount})</h2>
        {faces.length > 0 && (
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="search-clear" 
                onClick={() => setSearchQuery('')}
              >
                &times;
              </button>
            )}
          </div>
        )}
      </div>

      {faces.length === 0 ? (
        <div className="person-list-empty">
          <p>No people stored yet.</p>
          <p>Capture a face from the camera to add someone.</p>
        </div>
      ) : filteredFaces.length === 0 ? (
        <div className="person-list-empty">
          <p>No results found for "{searchQuery}"</p>
        </div>
      ) : (
        <div className="person-list-grid">
          {sortedFaces.map((face) => (
            <PersonCard
              key={face.id}
              person={face}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PersonList;
