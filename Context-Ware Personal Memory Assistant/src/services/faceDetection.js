/**
 * Face Detection Service
 * Handles face-api.js model loading, face detection, and embedding extraction
 */

import * as faceapi from '@vladmandic/face-api';

// Configuration
const MODEL_URL = '/models';
const DETECTION_OPTIONS = {
  inputSize: 416, // Larger input improves detection of faces at various sizes
  scoreThreshold: 0.3, // Lower threshold for more reliable detection (angles, lighting)
};

// State tracking
let modelsLoaded = false;
let loadingPromise = null;
let webglAvailable = null;

/**
 * Check if WebGL is available in the browser
 * @returns {boolean} True if WebGL is supported
 */
export function checkWebGLSupport() {
  if (webglAvailable !== null) {
    return webglAvailable;
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    webglAvailable = !!gl;
  } catch (e) {
    webglAvailable = false;
  }

  return webglAvailable;
}

/**
 * Get backend information
 * @returns {string} Current TensorFlow.js backend
 */
export function getBackendInfo() {
  try {
    return faceapi.tf?.getBackend() || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Initialize TensorFlow.js backend
 * @returns {Promise<string>} Active backend name
 */
async function initializeBackend() {
  const tf = faceapi.tf;
  
  // Check current backend
  const currentBackend = tf.getBackend();
  if (currentBackend) {
    console.log('TensorFlow.js backend already set:', currentBackend);
    return currentBackend;
  }

  // Try WebGL first, then fall back to CPU
  const hasWebGL = checkWebGLSupport();
  
  if (hasWebGL) {
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('TensorFlow.js using WebGL backend');
      return 'webgl';
    } catch (e) {
      console.warn('WebGL backend failed, falling back to CPU:', e);
    }
  }

  // Fallback to CPU
  try {
    await tf.setBackend('cpu');
    await tf.ready();
    console.log('TensorFlow.js using CPU backend');
    return 'cpu';
  } catch (e) {
    console.error('Failed to initialize TensorFlow.js backend:', e);
    throw new Error('Failed to initialize TensorFlow.js');
  }
}

/**
 * Load a single model with timeout
 * @param {Function} loadFn - Model load function
 * @param {string} modelName - Model name for logging
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<void>}
 */
async function loadModelWithTimeout(loadFn, modelName, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout loading ${modelName}`));
    }, timeout);

    loadFn()
      .then(() => {
        clearTimeout(timer);
        console.log(`Loaded: ${modelName}`);
        resolve();
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Load face-api.js models from local models folder
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} Result with success status
 */
export async function loadModels(onProgress) {
  // If already loaded, return immediately
  if (modelsLoaded) {
    return { success: true, message: 'Models already loaded' };
  }

  // If currently loading, wait for the existing operation
  if (loadingPromise) {
    console.log('Model loading already in progress, waiting...');
    return loadingPromise;
  }

  // Start new loading operation
  loadingPromise = (async () => {
    try {
      // Initialize TensorFlow.js backend first
      onProgress?.({ stage: 'Initializing TensorFlow.js', progress: 0 });
      console.log('Initializing TensorFlow.js backend...');
      
      const backend = await initializeBackend();
      console.log('Backend initialized:', backend);

      onProgress?.({ stage: 'Loading TinyFaceDetector', progress: 10 });
      
      // Load TinyFaceDetector model (fast, lightweight)
      console.log('Loading TinyFaceDetector from:', MODEL_URL);
      await loadModelWithTimeout(
        () => faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        'TinyFaceDetector'
      );
      onProgress?.({ stage: 'Loading FaceLandmark68', progress: 40 });

      // Load face landmark model (for face alignment)
      console.log('Loading FaceLandmark68Net...');
      await loadModelWithTimeout(
        () => faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        'FaceLandmark68Net'
      );
      onProgress?.({ stage: 'Loading FaceRecognition', progress: 70 });

      // Load face recognition model (for embeddings)
      console.log('Loading FaceRecognitionNet...');
      await loadModelWithTimeout(
        () => faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        'FaceRecognitionNet'
      );
      onProgress?.({ stage: 'Complete', progress: 100 });

      modelsLoaded = true;
      loadingPromise = null;

      console.log('All models loaded successfully');

      return {
        success: true,
        message: 'Models loaded successfully',
        backend: getBackendInfo(),
        webgl: checkWebGLSupport(),
      };
    } catch (error) {
      loadingPromise = null;
      console.error('Error loading models:', error);
      return {
        success: false,
        error: `Failed to load models: ${error.message}. Ensure model files are in public/models folder.`,
      };
    }
  })();

  return loadingPromise;
}

/**
 * Check if models are loaded using face-api's internal state
 * @returns {boolean} True if all required models are loaded
 */
function checkModelsActuallyLoaded() {
  try {
    return (
      faceapi.nets.tinyFaceDetector.isLoaded &&
      faceapi.nets.faceLandmark68Net.isLoaded &&
      faceapi.nets.faceRecognitionNet.isLoaded
    );
  } catch {
    return false;
  }
}

/**
 * Check if models are loaded
 * @returns {boolean} True if models are ready
 */
export function areModelsLoaded() {
  return modelsLoaded || checkModelsActuallyLoaded();
}

/**
 * Create TinyFaceDetector options
 * @param {Object} customOptions - Optional custom options
 * @returns {faceapi.TinyFaceDetectorOptions} Detector options
 */
function createDetectorOptions(customOptions = {}) {
  return new faceapi.TinyFaceDetectorOptions({
    inputSize: customOptions.inputSize || DETECTION_OPTIONS.inputSize,
    scoreThreshold: customOptions.scoreThreshold || DETECTION_OPTIONS.scoreThreshold,
  });
}

/**
 * Detect all faces in an image/video element
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} input - Input element
 * @param {Object} options - Detection options
 * @returns {Promise<Array>} Array of detected faces with bounding boxes
 */
export async function detectFaces(input, options = {}) {
  if (!modelsLoaded) {
    throw new Error('Models not loaded. Call loadModels() first.');
  }

  if (!input) {
    throw new Error('Input element is required');
  }

  try {
    const detectorOptions = createDetectorOptions(options);
    const detections = await faceapi.detectAllFaces(input, detectorOptions);

    return detections.map((detection) => ({
      box: detection.box,
      score: detection.score,
    }));
  } catch (error) {
    console.error('Face detection error:', error);
    throw error;
  }
}

/**
 * Detect faces with landmarks and descriptors
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} input - Input element
 * @param {Object} options - Detection options
 * @returns {Promise<Array>} Array of face detections with full data
 */
export async function detectFacesWithDescriptors(input, options = {}) {
  const actuallyLoaded = checkModelsActuallyLoaded();
  
  if (!modelsLoaded && !actuallyLoaded) {
    console.error('detectFacesWithDescriptors: Models not loaded. modelsLoaded:', modelsLoaded, 'actuallyLoaded:', actuallyLoaded);
    throw new Error('Models not loaded. Call loadModels() first.');
  }
  
  // Update modelsLoaded if face-api says they're loaded
  if (!modelsLoaded && actuallyLoaded) {
    console.log('detectFacesWithDescriptors: Updating modelsLoaded flag');
    modelsLoaded = true;
  }

  if (!input) {
    console.error('detectFacesWithDescriptors: No input element');
    throw new Error('Input element is required');
  }

  try {
    const detectorOptions = createDetectorOptions(options);
    
    console.log('detectFacesWithDescriptors: Running detection with options', {
      inputSize: detectorOptions.inputSize,
      scoreThreshold: detectorOptions.scoreThreshold,
    });
    
    const detections = await faceapi
      .detectAllFaces(input, detectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();

    console.log('detectFacesWithDescriptors: Raw detections count:', detections.length);

    return detections.map((detection) => ({
      box: detection.detection.box,
      score: detection.detection.score,
      landmarks: detection.landmarks,
      descriptor: detection.descriptor, // This is the 128-dim embedding
    }));
  } catch (error) {
    console.error('Face detection with descriptors error:', error);
    throw error;
  }
}

/**
 * Detect a single face with descriptor (for registration)
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} input - Input element
 * @returns {Promise<Object|null>} Single face detection or null
 */
export async function detectSingleFaceWithDescriptor(input) {
  if (!modelsLoaded) {
    throw new Error('Models not loaded. Call loadModels() first.');
  }

  if (!input) {
    throw new Error('Input element is required');
  }

  try {
    const detectorOptions = createDetectorOptions();
    
    const detection = await faceapi
      .detectSingleFace(input, detectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    return {
      box: detection.detection.box,
      score: detection.detection.score,
      landmarks: detection.landmarks,
      descriptor: detection.descriptor,
    };
  } catch (error) {
    console.error('Single face detection error:', error);
    throw error;
  }
}

/**
 * Extract embedding from a face detection result
 * @param {Object} detection - Face detection result
 * @returns {Float32Array|null} Face embedding or null
 */
export function extractEmbedding(detection) {
  if (!detection || !detection.descriptor) {
    return null;
  }

  // Ensure it's a Float32Array
  if (detection.descriptor instanceof Float32Array) {
    return detection.descriptor;
  }

  return new Float32Array(detection.descriptor);
}

/**
 * Resize detections to match display size
 * @param {Array} detections - Face detections
 * @param {Object} displaySize - Display dimensions { width, height }
 * @returns {Array} Resized detections
 */
export function resizeDetections(detections, displaySize) {
  return faceapi.resizeResults(detections, displaySize);
}

/**
 * Draw detection boxes on a canvas
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {Array} detections - Face detections
 * @param {Object} options - Drawing options
 */
export function drawDetections(canvas, detections, options = {}) {
  const ctx = canvas.getContext('2d');
  
  detections.forEach((detection) => {
    const { box } = detection;
    
    ctx.strokeStyle = options.boxColor || '#00ff00';
    ctx.lineWidth = options.lineWidth || 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
  });
}

/**
 * Clean up resources (call on unmount)
 */
export function cleanup() {
  // face-api.js doesn't require explicit cleanup, but this
  // is here for future use if needed
}

export { faceapi };
