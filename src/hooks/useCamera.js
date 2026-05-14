/**
 * useCamera Hook
 * Manages camera access, stream handling, and cleanup
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Camera states
 */
export const CAMERA_STATES = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  ACTIVE: 'active',
  DENIED: 'denied',
  ERROR: 'error',
  NOT_SUPPORTED: 'not_supported',
};

/**
 * Camera facing modes
 */
export const FACING_MODES = {
  USER: 'user', // Front camera
  ENVIRONMENT: 'environment', // Back camera
};

/**
 * Default video constraints
 */
const DEFAULT_CONSTRAINTS = {
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: FACING_MODES.USER,
  },
  audio: false,
};

/**
 * Custom hook for camera management
 * @param {Object} options - Configuration options
 * @returns {Object} Camera state and controls
 */
export function useCamera(options = {}) {
  const { autoStart = false, facingMode = FACING_MODES.USER } = options;

  const [state, setState] = useState(CAMERA_STATES.IDLE);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  /**
   * Stop the camera stream
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState(CAMERA_STATES.IDLE);
  }, []);

  /**
   * Start the camera stream
   */
  const startCamera = useCallback(async () => {
    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState(CAMERA_STATES.NOT_SUPPORTED);
      setError('Camera access is not supported in this browser');
      return false;
    }

    // Stop any existing stream
    stopCamera();

    setState(CAMERA_STATES.REQUESTING);
    setError(null);

    try {
      const constraints = {
        ...DEFAULT_CONSTRAINTS,
        video: {
          ...DEFAULT_CONSTRAINTS.video,
          facingMode: facingMode,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            resolve();
          };
        });

        // Get actual video dimensions
        setDimensions({
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        });
      }

      setState(CAMERA_STATES.ACTIVE);
      return true;
    } catch (err) {
      console.error('Camera error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setState(CAMERA_STATES.DENIED);
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setState(CAMERA_STATES.ERROR);
        setError('No camera found. Please connect a camera and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setState(CAMERA_STATES.ERROR);
        setError('Camera is in use by another application. Please close it and try again.');
      } else {
        setState(CAMERA_STATES.ERROR);
        setError(`Camera error: ${err.message}`);
      }

      return false;
    }
  }, [facingMode, stopCamera]);

  /**
   * Switch between front and back camera
   */
  const switchCamera = useCallback(async () => {
    const newFacingMode =
      facingMode === FACING_MODES.USER ? FACING_MODES.ENVIRONMENT : FACING_MODES.USER;
    
    stopCamera();
    
    // Re-start with new facing mode
    try {
      const constraints = {
        ...DEFAULT_CONSTRAINTS,
        video: {
          ...DEFAULT_CONSTRAINTS.video,
          facingMode: newFacingMode,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState(CAMERA_STATES.ACTIVE);
      return newFacingMode;
    } catch (err) {
      console.error('Camera switch error:', err);
      setError('Failed to switch camera');
      return null;
    }
  }, [facingMode, stopCamera]);

  /**
   * Capture current frame as canvas
   */
  const captureFrame = useCallback(() => {
    if (!videoRef.current || state !== CAMERA_STATES.ACTIVE) {
      return null;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    return canvas;
  }, [state]);

  /**
   * Capture current frame as data URL
   */
  const captureFrameAsDataURL = useCallback((type = 'image/jpeg', quality = 0.8) => {
    const canvas = captureFrame();
    if (!canvas) return null;
    return canvas.toDataURL(type, quality);
  }, [captureFrame]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [autoStart, startCamera, stopCamera]);

  // Handle visibility change (pause when hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state === CAMERA_STATES.ACTIVE) {
        // Optionally pause when tab is hidden to save resources
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state]);

  return {
    videoRef,
    state,
    error,
    dimensions,
    isActive: state === CAMERA_STATES.ACTIVE,
    isRequesting: state === CAMERA_STATES.REQUESTING,
    isDenied: state === CAMERA_STATES.DENIED,
    isError: state === CAMERA_STATES.ERROR,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame,
    captureFrameAsDataURL,
  };
}

export default useCamera;
