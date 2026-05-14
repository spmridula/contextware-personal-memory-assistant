/**
 * useModelLoader Hook
 * Manages face-api.js model loading state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadModels, areModelsLoaded, checkWebGLSupport, getBackendInfo } from '../services/faceDetection';

/**
 * Model loading states
 */
export const MODEL_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
};

/**
 * Custom hook for managing model loading
 * @param {Object} options - Configuration options
 * @returns {Object} Model loading state and controls
 */
export function useModelLoader(options = {}) {
  const { autoLoad = true } = options;

  const [state, setState] = useState(
    areModelsLoaded() ? MODEL_STATES.LOADED : MODEL_STATES.IDLE
  );
  const [progress, setProgress] = useState({ stage: '', progress: 0 });
  const [error, setError] = useState(null);
  const [info, setInfo] = useState({ 
    webgl: areModelsLoaded() ? checkWebGLSupport() : null, 
    backend: areModelsLoaded() ? getBackendInfo() : null 
  });

  const mountedRef = useRef(true);

  /**
   * Load the models
   */
  const load = useCallback(async () => {
    // Check if already loaded
    if (areModelsLoaded()) {
      setState(MODEL_STATES.LOADED);
      setInfo({
        webgl: checkWebGLSupport(),
        backend: getBackendInfo(),
      });
      return { success: true };
    }

    setState(MODEL_STATES.LOADING);
    setError(null);
    setProgress({ stage: 'Initializing', progress: 0 });

    console.log('useModelLoader: Starting model load...');

    try {
      const result = await loadModels((progressData) => {
        if (mountedRef.current) {
          setProgress(progressData);
        }
      });

      if (!mountedRef.current) {
        console.log('useModelLoader: Component unmounted during load');
        return result;
      }

      console.log('useModelLoader: Load result:', result);

      if (result.success) {
        setState(MODEL_STATES.LOADED);
        setInfo({
          webgl: result.webgl,
          backend: result.backend,
        });
        setProgress({ stage: 'Complete', progress: 100 });
      } else {
        setState(MODEL_STATES.ERROR);
        setError(result.error);
      }

      return result;
    } catch (err) {
      console.error('useModelLoader: Exception:', err);
      if (mountedRef.current) {
        setState(MODEL_STATES.ERROR);
        setError(err.message);
      }
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Retry loading after error
   */
  const retry = useCallback(() => {
    setState(MODEL_STATES.IDLE);
    setError(null);
    load();
  }, [load]);

  // Auto-load if enabled
  useEffect(() => {
    mountedRef.current = true;
    
    // Only start loading if not already loaded and autoLoad is true
    if (autoLoad && !areModelsLoaded() && state === MODEL_STATES.IDLE) {
      load();
    }

    return () => {
      mountedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  return {
    state,
    progress,
    error,
    info,
    isLoading: state === MODEL_STATES.LOADING,
    isLoaded: state === MODEL_STATES.LOADED,
    isError: state === MODEL_STATES.ERROR,
    hasWebGL: info.webgl,
    backend: info.backend,
    load,
    retry,
  };
}

export default useModelLoader;
