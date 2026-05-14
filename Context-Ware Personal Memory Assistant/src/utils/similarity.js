/**
 * Similarity Utility Functions
 * Contains mathematical functions for comparing face embeddings
 */

/**
 * Calculate the magnitude (L2 norm) of a vector
 * @param {Float32Array|number[]} vector - Input vector
 * @returns {number} Magnitude of the vector
 */
function magnitude(vector) {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
}

/**
 * Calculate dot product of two vectors
 * @param {Float32Array|number[]} a - First vector
 * @param {Float32Array|number[]} b - Second vector
 * @returns {number} Dot product result
 */
function dotProduct(a, b) {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns a value between -1 and 1, where 1 means identical
 * 
 * @param {Float32Array|number[]} embedding1 - First face embedding
 * @param {Float32Array|number[]} embedding2 - Second face embedding
 * @returns {number} Cosine similarity score (0-1 for face embeddings)
 */
export function cosineSimilarity(embedding1, embedding2) {
  // Validate inputs
  if (!embedding1 || !embedding2) {
    console.warn('Invalid embeddings provided to cosineSimilarity');
    return 0;
  }

  if (embedding1.length !== embedding2.length) {
    console.warn('Embedding dimensions do not match');
    return 0;
  }

  const mag1 = magnitude(embedding1);
  const mag2 = magnitude(embedding2);

  // Prevent divide-by-zero
  if (mag1 === 0 || mag2 === 0) {
    console.warn('Zero magnitude embedding detected');
    return 0;
  }

  const dot = dotProduct(embedding1, embedding2);
  const similarity = dot / (mag1 * mag2);

  // Clamp to valid range (handles floating point errors)
  return Math.max(-1, Math.min(1, similarity));
}

/**
 * Calculate Euclidean distance between two embeddings
 * Lower values indicate more similar faces
 * 
 * @param {Float32Array|number[]} embedding1 - First face embedding
 * @param {Float32Array|number[]} embedding2 - Second face embedding
 * @returns {number} Euclidean distance
 */
export function euclideanDistance(embedding1, embedding2) {
  if (!embedding1 || !embedding2) {
    console.warn('Invalid embeddings provided to euclideanDistance');
    return Infinity;
  }

  if (embedding1.length !== embedding2.length) {
    console.warn('Embedding dimensions do not match');
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Validate if an embedding is valid
 * @param {any} embedding - Embedding to validate
 * @returns {boolean} True if valid
 */
export function isValidEmbedding(embedding) {
  if (!embedding) return false;
  
  if (!(embedding instanceof Float32Array) && !Array.isArray(embedding)) {
    return false;
  }

  if (embedding.length !== 128) {
    return false;
  }

  // Check for NaN or Infinity values
  for (let i = 0; i < embedding.length; i++) {
    if (!Number.isFinite(embedding[i])) {
      return false;
    }
  }

  // Check that it's not all zeros
  const mag = magnitude(embedding);
  if (mag === 0) {
    return false;
  }

  return true;
}

/**
 * Find the best match from a list of stored faces
 * 
 * @param {Float32Array|number[]} queryEmbedding - The embedding to match
 * @param {Array<Object>} storedFaces - Array of face objects with embedding property
 * @param {number} threshold - Minimum similarity threshold (default: 0.55)
 * @returns {Object|null} Best matching face or null if no match above threshold
 */
export function findBestMatch(queryEmbedding, storedFaces, threshold = 0.55) {
  if (!isValidEmbedding(queryEmbedding)) {
    return null;
  }

  if (!storedFaces || storedFaces.length === 0) {
    return null;
  }

  let bestMatch = null;
  let bestSimilarity = threshold;

  for (const face of storedFaces) {
    if (!face.embedding || !isValidEmbedding(face.embedding)) {
      continue;
    }

    const similarity = cosineSimilarity(queryEmbedding, face.embedding);

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = {
        ...face,
        similarity: similarity,
        confidence: Math.round(similarity * 100),
      };
    }
  }

  return bestMatch;
}

/**
 * Check if a face is a potential duplicate
 * @param {Float32Array|number[]} embedding - New embedding to check
 * @param {Array<Object>} storedFaces - Existing stored faces
 * @param {number} duplicateThreshold - Threshold for duplicate detection (default: 0.85)
 * @returns {Object|null} Potential duplicate face or null
 */
export function findDuplicate(embedding, storedFaces, duplicateThreshold = 0.85) {
  if (!isValidEmbedding(embedding) || !storedFaces || storedFaces.length === 0) {
    return null;
  }

  for (const face of storedFaces) {
    if (!face.embedding) continue;

    const similarity = cosineSimilarity(embedding, face.embedding);
    if (similarity >= duplicateThreshold) {
      return {
        ...face,
        similarity: similarity,
      };
    }
  }

  return null;
}

/**
 * Default recognition threshold
 */
export const DEFAULT_THRESHOLD = 0.55;

/**
 * Threshold descriptions for UI
 */
export const THRESHOLD_INFO = {
  low: { value: 0.45, label: 'Low (more false positives)' },
  medium: { value: 0.55, label: 'Medium (balanced)' },
  high: { value: 0.65, label: 'High (more strict)' },
  veryHigh: { value: 0.75, label: 'Very High (very strict)' },
};
