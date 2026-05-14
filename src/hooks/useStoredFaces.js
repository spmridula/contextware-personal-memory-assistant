/**
 * useStoredFaces Hook
 * Manages stored face data from IndexedDB
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAllFaces,
  addFace,
  updateFace,
  deleteFace,
  MAX_STORED_FACES,
} from '../db/faceDB';
import { findDuplicate } from '../utils/similarity';

/**
 * Custom hook for managing stored faces
 * @returns {Object} Stored faces state and CRUD operations
 */
export function useStoredFaces() {
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [count, setCount] = useState({ count: 0, max: MAX_STORED_FACES });

  const mountedRef = useRef(true);

  /**
   * Load all faces from database
   */
  const loadFaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getAllFaces();

      if (!mountedRef.current) return;

      if (result.success) {
        setFaces(result.data);
        setCount({ count: result.data.length, max: MAX_STORED_FACES });
      } else {
        setError(result.error);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Add a new face
   * @param {Object} faceData - Face data with name, note, and embedding
   * @returns {Promise<Object>} Result with success status
   */
  const addNewFace = useCallback(
    async (faceData) => {
      try {
        // Check for duplicates
        const duplicate = findDuplicate(faceData.embedding, faces);
        if (duplicate) {
          return {
            success: false,
            error: `This face looks similar to "${duplicate.name}". Are you sure you want to add it?`,
            isDuplicate: true,
            existingFace: duplicate,
          };
        }

        const result = await addFace(faceData);

        if (result.success && mountedRef.current) {
          // Update local state
          setFaces((prev) => [
            ...prev,
            {
              ...result.data,
              embedding: new Float32Array(result.data.embedding),
            },
          ]);
          setCount((prev) => ({ ...prev, count: prev.count + 1 }));
        }

        return result;
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [faces]
  );

  /**
   * Force add a face (skip duplicate check)
   * @param {Object} faceData - Face data
   * @returns {Promise<Object>} Result
   */
  const forceAddFace = useCallback(async (faceData) => {
    try {
      const result = await addFace(faceData);

      if (result.success && mountedRef.current) {
        setFaces((prev) => [
          ...prev,
          {
            ...result.data,
            embedding: new Float32Array(result.data.embedding),
          },
        ]);
        setCount((prev) => ({ ...prev, count: prev.count + 1 }));
      }

      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Update an existing face
   * @param {number} id - Face ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Result
   */
  const updateExistingFace = useCallback(async (id, updates) => {
    try {
      const result = await updateFace(id, updates);

      if (result.success && mountedRef.current) {
        setFaces((prev) =>
          prev.map((face) =>
            face.id === id
              ? { ...face, name: updates.name || face.name, note: updates.note ?? face.note }
              : face
          )
        );
      }

      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Delete a face
   * @param {number} id - Face ID
   * @returns {Promise<Object>} Result
   */
  const removeFace = useCallback(async (id) => {
    try {
      const result = await deleteFace(id);

      if (result.success && mountedRef.current) {
        setFaces((prev) => prev.filter((face) => face.id !== id));
        setCount((prev) => ({ ...prev, count: Math.max(0, prev.count - 1) }));
      }

      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Get a face by ID
   * @param {number} id - Face ID
   * @returns {Object|undefined} Face data or undefined
   */
  const getFaceById = useCallback(
    (id) => {
      return faces.find((face) => face.id === id);
    },
    [faces]
  );

  /**
   * Search faces by name
   * @param {string} query - Search query
   * @returns {Array} Matching faces
   */
  const searchFaces = useCallback(
    (query) => {
      if (!query || query.trim() === '') {
        return faces;
      }

      const lowerQuery = query.toLowerCase();
      return faces.filter(
        (face) =>
          face.name.toLowerCase().includes(lowerQuery) ||
          face.note?.toLowerCase().includes(lowerQuery)
      );
    },
    [faces]
  );

  // Load faces on mount
  useEffect(() => {
    mountedRef.current = true;
    loadFaces();

    return () => {
      mountedRef.current = false;
    };
  }, [loadFaces]);

  return {
    faces,
    loading,
    error,
    count,
    isEmpty: faces.length === 0,
    isFull: count.count >= count.max,
    loadFaces,
    addFace: addNewFace,
    forceAddFace,
    updateFace: updateExistingFace,
    deleteFace: removeFace,
    getFaceById,
    searchFaces,
  };
}

export default useStoredFaces;
