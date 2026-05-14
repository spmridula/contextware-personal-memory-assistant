/**
 * OfflineIndicator Component
 * Shows offline status banner
 */

import React from 'react';

/**
 * Offline status indicator
 * @param {Object} props - Component props
 */
function OfflineIndicator({ isOffline }) {
  if (!isOffline) {
    return null;
  }

  return (
    <div className="offline-indicator">
      <span className="offline-icon">&#9679;</span>
      <span className="offline-text">Offline Mode - All data stored locally</span>
    </div>
  );
}

export default OfflineIndicator;
