/**
 * Face Recognition Service
 * Combines face detection with stored face matching
 */

import { detectFacesWithDescriptors, extractEmbedding } from './faceDetection';
import { findBestMatch, DEFAULT_THRESHOLD } from '../utils/similarity';

/**
 * Recognition result structure
 * @typedef {Object} RecognitionResult
 * @property {Object} box - Bounding box coordinates
 * @property {number} score - Detection confidence score
 * @property {Object|null} match - Matched face data or null
 * @property {boolean} isKnown - True if face matches a stored entry
 */

/**
 * Perform face recognition on input
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} input - Input element
 * @param {Array<Object>} storedFaces - Array of stored face entries
 * @param {number} threshold - Recognition threshold (default: 0.55)
 * @returns {Promise<Array<RecognitionResult>>} Array of recognition results
 */
export async function recognizeFaces(input, storedFaces, threshold = DEFAULT_THRESHOLD) {
  try {
    console.log('recognizeFaces: Starting detection on', input.tagName, input.videoWidth, 'x', input.videoHeight);
    
    // Detect all faces with descriptors
    const detections = await detectFacesWithDescriptors(input);

    console.log('recognizeFaces: detectFacesWithDescriptors returned', detections?.length || 0, 'faces');

    if (!detections || detections.length === 0) {
      return [];
    }

    // Process each detection
    const results = detections.map((detection) => {
      const embedding = extractEmbedding(detection);
      
      if (!embedding) {
        return {
          box: detection.box,
          score: detection.score,
          match: null,
          isKnown: false,
        };
      }

      // Find best match among stored faces
      const match = findBestMatch(embedding, storedFaces, threshold);

      return {
        box: detection.box,
        score: detection.score,
        match: match,
        isKnown: match !== null,
        embedding: embedding, // Include for potential use
      };
    });

    return results;
  } catch (error) {
    console.error('Recognition error:', error);
    throw error;
  }
}

/**
 * Format recognition result for display
 * @param {RecognitionResult} result - Recognition result
 * @returns {Object} Formatted display data
 */
export function formatRecognitionDisplay(result) {
  if (!result) {
    return null;
  }

  if (result.isKnown && result.match) {
    return {
      name: result.match.name,
      note: result.match.note || '',
      confidence: result.match.confidence,
      box: result.box,
      status: 'known',
    };
  }

  return {
    name: 'Unknown',
    note: '',
    confidence: Math.round(result.score * 100),
    box: result.box,
    status: 'unknown',
  };
}

/**
 * Batch format recognition results
 * @param {Array<RecognitionResult>} results - Array of recognition results
 * @returns {Array<Object>} Formatted results for display
 */
export function formatAllRecognitions(results) {
  if (!results || results.length === 0) {
    return [];
  }

  return results.map(formatRecognitionDisplay).filter(Boolean);
}

/**
 * Get recognition summary statistics
 * @param {Array<RecognitionResult>} results - Recognition results
 * @returns {Object} Summary statistics
 */
export function getRecognitionStats(results) {
  if (!results || results.length === 0) {
    return {
      total: 0,
      known: 0,
      unknown: 0,
    };
  }

  const known = results.filter((r) => r.isKnown).length;
  
  return {
    total: results.length,
    known: known,
    unknown: results.length - known,
  };
}
