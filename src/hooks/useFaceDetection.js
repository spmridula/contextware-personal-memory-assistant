/**
 * useFaceDetection Hook
 * Manages face detection loop and recognition
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { recognizeFaces } from '../services/recognition';
import { DEFAULT_THRESHOLD } from '../utils/similarity';

/**
 * Detection states
 */
export const DETECTION_STATES = {
  IDLE: 'idle',
  DETECTING: 'detecting',
  PAUSED: 'paused',
  ERROR: 'error',
};

/**
 * Default detection interval in milliseconds (shorter = more responsive)
 */
const DEFAULT_INTERVAL = 350;

/**
 * Custom hook for face detection and recognition
 * @param {Object} options - Configuration options
 * @returns {Object} Detection state and controls
 */
export function useFaceDetection(options = {}) {
  const {
    videoRef,
    isVideoReady = false,
    storedFaces = [],
    threshold = DEFAULT_THRESHOLD,
    interval = DEFAULT_INTERVAL,
    autoStart = false,
  } = options;

  const [state, setState] = useState(DETECTION_STATES.IDLE);
  const [detections, setDetections] = useState([]);
  const [error, setError] = useState(null);
  const [lastDetectionTime, setLastDetectionTime] = useState(null);
  const [frameCount, setFrameCount] = useState(0);

  const intervalRef = useRef(null);
  const initialTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false);
  const pendingDetectionRef = useRef(false);
  const mountedRef = useRef(true);
  const stateRef = useRef(state);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Perform a single detection cycle
   */
  const detectOnce = useCallback(async () => {
    const video = videoRef?.current;
    
    if (!video) {
      console.log('Detection: No video element');
      return [];
    }

    // Check if video is actually playing and has valid frame data
    if (video.readyState < 2 || video.paused || video.ended) {
      console.log('Detection: Video not ready, readyState:', video.readyState);
      return [];
    }
    if (!video.videoWidth || !video.videoHeight) {
      console.log('Detection: Video has no dimensions yet');
      return [];
    }

    if (isProcessingRef.current) {
      // Schedule follow-up when current detection finishes (avoids missed frames)
      pendingDetectionRef.current = true;
      return [];
    }

    isProcessingRef.current = true;
    pendingDetectionRef.current = false;

    try {
      console.log('Detection: Running detection on video', video.videoWidth, 'x', video.videoHeight);
      
      const results = await recognizeFaces(
        video,
        storedFaces,
        threshold
      );

      console.log('Detection: Found', results.length, 'faces');

      if (mountedRef.current) {
        setDetections(results);
        setLastDetectionTime(Date.now());
        setFrameCount((prev) => prev + 1);
        setError(null);
      }

      return results;
    } catch (err) {
      console.error('Detection error:', err);
      if (mountedRef.current) {
        setError(err.message);
      }
      return [];
    } finally {
      isProcessingRef.current = false;
      // Run one more detection if we skipped a frame while processing
      if (pendingDetectionRef.current && mountedRef.current && stateRef.current === DETECTION_STATES.DETECTING) {
        pendingDetectionRef.current = false;
        // Schedule immediately but async to avoid stack overflow
        queueMicrotask(() => detectOnce());
      }
    }
  }, [videoRef, storedFaces, threshold]);

  /**
   * Start continuous detection
   */
  const startDetection = useCallback(() => {
    console.log('startDetection called, current intervalRef:', intervalRef.current);
    
    if (intervalRef.current) {
      console.log('Detection already running');
      return; // Already running
    }

    setState(DETECTION_STATES.DETECTING);
    setError(null);

    console.log('Starting detection loop with interval:', interval);

    // Small delay for first frame to decode, then run immediately
    if (initialTimeoutRef.current) clearTimeout(initialTimeoutRef.current);
    initialTimeoutRef.current = setTimeout(() => {
      initialTimeoutRef.current = null;
      if (mountedRef.current && stateRef.current === DETECTION_STATES.DETECTING) {
        detectOnce();
      }
    }, 150);

    // Then start interval
    intervalRef.current = setInterval(() => {
      if (mountedRef.current && stateRef.current === DETECTION_STATES.DETECTING) {
        detectOnce();
      }
    }, interval);
  }, [detectOnce, interval]);

  /**
   * Stop detection loop
   */
  const stopDetection = useCallback(() => {
    console.log('Stopping detection');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (initialTimeoutRef.current) {
      clearTimeout(initialTimeoutRef.current);
      initialTimeoutRef.current = null;
    }

    setState(DETECTION_STATES.IDLE);
    setDetections([]);
  }, []);

  /**
   * Pause detection (keeps state)
   */
  const pauseDetection = useCallback(() => {
    console.log('Pausing detection');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (initialTimeoutRef.current) {
      clearTimeout(initialTimeoutRef.current);
      initialTimeoutRef.current = null;
    }
    setState(DETECTION_STATES.PAUSED);
  }, []);

  /**
   * Resume detection
   */
  const resumeDetection = useCallback(() => {
    if (stateRef.current === DETECTION_STATES.PAUSED) {
      startDetection();
    }
  }, [startDetection]);

  /**
   * Toggle detection on/off
   */
  const toggleDetection = useCallback(() => {
    console.log('Toggle detection, current state:', stateRef.current);
    if (stateRef.current === DETECTION_STATES.DETECTING) {
      pauseDetection();
    } else {
      startDetection();
    }
  }, [pauseDetection, startDetection]);

  // Auto-start if enabled and video is ready
  useEffect(() => {
    if (autoStart && isVideoReady && stateRef.current === DETECTION_STATES.IDLE) {
      console.log('Auto-starting detection');
      startDetection();
    }
  }, [autoStart, isVideoReady, startDetection]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (initialTimeoutRef.current) {
        clearTimeout(initialTimeoutRef.current);
        initialTimeoutRef.current = null;
      }
    };
  }, []);

  // Reset detections when stored faces change
  useEffect(() => {
    // Trigger immediate re-detection when faces are updated
    if (stateRef.current === DETECTION_STATES.DETECTING) {
      detectOnce();
    }
  }, [storedFaces, detectOnce]);

  return {
    state,
    detections,
    error,
    lastDetectionTime,
    frameCount,
    isDetecting: state === DETECTION_STATES.DETECTING,
    isPaused: state === DETECTION_STATES.PAUSED,
    hasDetections: detections.length > 0,
    faceCount: detections.length,
    startDetection,
    stopDetection,
    pauseDetection,
    resumeDetection,
    toggleDetection,
    detectOnce,
  };
}

export default useFaceDetection;
