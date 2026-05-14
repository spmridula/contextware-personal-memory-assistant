/**
 * IndexedDB Service for Face Storage
 * Handles all database operations for storing and retrieving face data
 */

import { openDB } from 'idb';

const DB_NAME = 'FaceMemoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'faces';
const MAX_STORED_FACES = 50;

/**
 * Initialize and open the IndexedDB database
 * @returns {Promise<IDBDatabase>} Database instance
 */
async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    },
  });
}

/**
 * Validate face entry data
 * @param {Object} entry - Face entry to validate
 * @returns {Object} Validation result with isValid and error properties
 */
function validateEntry(entry) {
  if (!entry.name || typeof entry.name !== 'string' || entry.name.trim() === '') {
    return { isValid: false, error: 'Name is required and must be a non-empty string' };
  }

  if (!entry.embedding || !(entry.embedding instanceof Float32Array)) {
    return { isValid: false, error: 'Valid embedding (Float32Array) is required' };
  }

  if (entry.embedding.length !== 128) {
    return { isValid: false, error: 'Embedding must have exactly 128 dimensions' };
  }

  return { isValid: true, error: null };
}

/**
 * Add a new face entry to the database
 * @param {Object} entry - Face entry with name, note, and embedding
 * @returns {Promise<Object>} Result with success status and data/error
 */
export async function addFace(entry) {
  try {
    const validation = validateEntry(entry);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const db = await getDB();
    const count = await db.count(STORE_NAME);

    if (count >= MAX_STORED_FACES) {
      return {
        success: false,
        error: `Maximum storage limit (${MAX_STORED_FACES}) reached. Delete some entries first.`,
      };
    }

    const faceData = {
      name: entry.name.trim(),
      note: entry.note?.trim() || '',
      embedding: Array.from(entry.embedding), // Store as regular array for serialization
      timestamp: Date.now(),
    };

    const id = await db.add(STORE_NAME, faceData);
    return { success: true, data: { ...faceData, id } };
  } catch (error) {
    console.error('Error adding face:', error);
    return { success: false, error: `Database error: ${error.message}` };
  }
}

/**
 * Get all face entries from the database
 * @returns {Promise<Object>} Result with success status and faces array
 */
export async function getAllFaces() {
  try {
    const db = await getDB();
    const faces = await db.getAll(STORE_NAME);

    // Convert stored arrays back to Float32Array
    const processedFaces = faces.map((face) => ({
      ...face,
      embedding: new Float32Array(face.embedding),
    }));

    return { success: true, data: processedFaces };
  } catch (error) {
    console.error('Error fetching faces:', error);
    return { success: false, error: `Database error: ${error.message}` };
  }
}

/**
 * Get a single face entry by ID
 * @param {number} id - Face entry ID
 * @returns {Promise<Object>} Result with success status and face data
 */
export async function getFaceById(id) {
  try {
    if (!id || typeof id !== 'number') {
      return { success: false, error: 'Valid ID is required' };
    }

    const db = await getDB();
    const face = await db.get(STORE_NAME, id);

    if (!face) {
      return { success: false, error: 'Face entry not found' };
    }

    return {
      success: true,
      data: {
        ...face,
        embedding: new Float32Array(face.embedding),
      },
    };
  } catch (error) {
    console.error('Error fetching face:', error);
    return { success: false, error: `Database error: ${error.message}` };
  }
}

/**
 * Update an existing face entry
 * @param {number} id - Face entry ID
 * @param {Object} updates - Fields to update (name, note)
 * @returns {Promise<Object>} Result with success status
 */
export async function updateFace(id, updates) {
  try {
    if (!id || typeof id !== 'number') {
      return { success: false, error: 'Valid ID is required' };
    }

    const db = await getDB();
    const existing = await db.get(STORE_NAME, id);

    if (!existing) {
      return { success: false, error: 'Face entry not found' };
    }

    const updatedFace = {
      ...existing,
      name: updates.name?.trim() || existing.name,
      note: updates.note !== undefined ? updates.note.trim() : existing.note,
      timestamp: Date.now(),
    };

    if (!updatedFace.name) {
      return { success: false, error: 'Name cannot be empty' };
    }

    await db.put(STORE_NAME, updatedFace);
    return { success: true, data: updatedFace };
  } catch (error) {
    console.error('Error updating face:', error);
    return { success: false, error: `Database error: ${error.message}` };
  }
}

/**
 * Delete a face entry by ID
 * @param {number} id - Face entry ID
 * @returns {Promise<Object>} Result with success status
 */
export async function deleteFace(id) {
  try {
    if (!id || typeof id !== 'number') {
      return { success: false, error: 'Valid ID is required' };
    }

    const db = await getDB();
    const existing = await db.get(STORE_NAME, id);

    if (!existing) {
      return { success: false, error: 'Face entry not found' };
    }

    await db.delete(STORE_NAME, id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting face:', error);
    return { success: false, error: `Database error: ${error.message}` };
  }
}

/**
 * Get the count of stored faces
 * @returns {Promise<Object>} Result with count
 */
export async function getFaceCount() {
  try {
    const db = await getDB();
    const count = await db.count(STORE_NAME);
    return { success: true, data: { count, max: MAX_STORED_FACES } };
  } catch (error) {
    console.error('Error counting faces:', error);
    return { success: false, error: `Database error: ${error.message}` };
  }
}

/**
 * Clear all face entries (use with caution)
 * @returns {Promise<Object>} Result with success status
 */
export async function clearAllFaces() {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
    return { success: true };
  } catch (error) {
    console.error('Error clearing faces:', error);
    return { success: false, error: `Database error: ${error.message}` };
  }
}

export { MAX_STORED_FACES };
