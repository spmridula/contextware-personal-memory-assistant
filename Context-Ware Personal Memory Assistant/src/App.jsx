/**
 * Main App Component
 * Context-Ware Personal Memory Assistant
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  LoadingIndicator,
  ErrorMessage,
  OfflineIndicator,
  CameraView,
  Controls,
  StatusBar,
  AddPersonModal,
  EditPersonModal,
  ConfirmDialog,
  PersonList,
} from './components';
import {
  useCamera,
  useFaceDetection,
  useStoredFaces,
  useModelLoader,
  useOfflineStatus,
  CAMERA_STATES,
} from './hooks';
import { detectSingleFaceWithDescriptor, extractEmbedding } from './services/faceDetection';
import { findDuplicate, DEFAULT_THRESHOLD } from './utils/similarity';
import { registerServiceWorker } from './utils/serviceWorker';
import { MAX_STORED_FACES } from './db/faceDB';
import './App.css';

/**
 * Main Application Component
 */
function App() {
  // Model loading
  const {
    isLoaded: isModelLoaded,
    isLoading: isModelLoading,
    isError: isModelError,
    error: modelError,
    progress: modelProgress,
    info: modelInfo,
    retry: retryModelLoad,
  } = useModelLoader({ autoLoad: true });

  // Camera management
  const {
    videoRef,
    state: cameraState,
    error: cameraError,
    isActive: isCameraActive,
    startCamera,
    stopCamera,
    captureFrame,
  } = useCamera({ autoStart: false });

  // Stored faces management
  const {
    faces: storedFaces,
    loading: facesLoading,
    count: facesCount,
    addFace,
    forceAddFace,
    updateFace,
    deleteFace,
  } = useStoredFaces();

  // Face detection
  const {
    detections,
    isDetecting,
    faceCount,
    startDetection,
    stopDetection,
    toggleDetection,
  } = useFaceDetection({
    videoRef,
    isVideoReady: isCameraActive,
    storedFaces,
    threshold: DEFAULT_THRESHOLD,
    autoStart: false,
  });

  // Offline status
  const { isOffline } = useOfflineStatus();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [capturedData, setCapturedData] = useState({ image: null, embedding: null });
  const [duplicatePerson, setDuplicatePerson] = useState(null);
  const [appError, setAppError] = useState(null);

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  /**
   * Handle camera start
   */
  const handleStartCamera = useCallback(async () => {
    setAppError(null);
    const success = await startCamera();
    if (success) {
      // Auto-start detection when camera starts
      setTimeout(() => startDetection(), 500);
    }
  }, [startCamera, startDetection]);

  /**
   * Handle camera stop
   */
  const handleStopCamera = useCallback(() => {
    stopDetection();
    stopCamera();
  }, [stopDetection, stopCamera]);

  /**
   * Handle face capture for adding new person
   */
  const handleCaptureFace = useCallback(async () => {
    if (!isCameraActive || !isModelLoaded) {
      setAppError('Camera must be active and models loaded');
      return;
    }

    try {
      // Pause detection during capture
      stopDetection();

      // Get current frame
      const canvas = captureFrame();
      if (!canvas) {
        setAppError('Failed to capture frame');
        startDetection();
        return;
      }

      // Detect face in captured frame
      const detection = await detectSingleFaceWithDescriptor(canvas);

      if (!detection) {
        setAppError('No face detected. Please position your face clearly in the camera view.');
        startDetection();
        return;
      }

      const embedding = extractEmbedding(detection);
      if (!embedding) {
        setAppError('Failed to extract face features. Please try again.');
        startDetection();
        return;
      }

      // Check for duplicates
      const duplicate = findDuplicate(embedding, storedFaces);

      // Get image data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

      setCapturedData({
        image: imageDataUrl,
        embedding: embedding,
      });

      if (duplicate) {
        setDuplicatePerson(duplicate);
      } else {
        setDuplicatePerson(null);
      }

      setShowAddModal(true);
    } catch (err) {
      console.error('Capture error:', err);
      setAppError(`Capture failed: ${err.message}`);
      startDetection();
    }
  }, [isCameraActive, isModelLoaded, captureFrame, storedFaces, startDetection, stopDetection]);

  /**
   * Handle saving new person
   */
  const handleSavePerson = useCallback(async (personData, force = false) => {
    try {
      let result;
      
      if (force) {
        result = await forceAddFace(personData);
      } else {
        result = await addFace(personData);
      }

      if (result.success) {
        setCapturedData({ image: null, embedding: null });
        setDuplicatePerson(null);
        setShowAddModal(false);
        startDetection();
        return { success: true };
      }

      // Handle duplicate case
      if (result.isDuplicate) {
        setDuplicatePerson(result.existingFace);
        return result;
      }

      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [addFace, forceAddFace, startDetection]);

  /**
   * Handle closing add modal
   */
  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    setCapturedData({ image: null, embedding: null });
    setDuplicatePerson(null);
    startDetection();
  }, [startDetection]);

  /**
   * Handle edit person
   */
  const handleEditPerson = useCallback((person) => {
    setSelectedPerson(person);
    setShowEditModal(true);
  }, []);

  /**
   * Handle save edit
   */
  const handleSaveEdit = useCallback(async (id, updates) => {
    const result = await updateFace(id, updates);
    if (result.success) {
      setShowEditModal(false);
      setSelectedPerson(null);
    }
    return result;
  }, [updateFace]);

  /**
   * Handle delete person request
   */
  const handleDeleteRequest = useCallback((person) => {
    setSelectedPerson(person);
    setShowDeleteConfirm(true);
  }, []);

  /**
   * Handle confirm delete
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!selectedPerson) return;

    const result = await deleteFace(selectedPerson.id);
    if (result.success) {
      setShowDeleteConfirm(false);
      setSelectedPerson(null);
    } else {
      setAppError(result.error);
    }
  }, [selectedPerson, deleteFace]);

  /**
   * Handle cancel delete
   */
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setSelectedPerson(null);
  }, []);

  /**
   * Clear app error
   */
  const clearAppError = useCallback(() => {
    setAppError(null);
  }, []);

  // Show loading screen while models load
  if (isModelLoading) {
    return (
      <div className="app">
        <div className="app-loading">
          <h1>Context-Ware Personal Memory Assistant</h1>
          <LoadingIndicator
            message="Loading face detection models..."
            stage={modelProgress.stage}
            progress={modelProgress.progress}
          />
          <p className="loading-note">This may take a moment on first load</p>
        </div>
      </div>
    );
  }

  // Show error screen if models fail to load
  if (isModelError) {
    return (
      <div className="app">
        <div className="app-error">
          <h1>Context-Ware Personal Memory Assistant</h1>
          <ErrorMessage
            title="Failed to Load Models"
            message={modelError || 'Unable to load face detection models. Please check your internet connection and try again.'}
            onRetry={retryModelLoad}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <OfflineIndicator isOffline={isOffline} />

      <header className="app-header">
        <h1>Context-Ware Personal Memory Assistant</h1>
        <p>Local-only face recognition - Your data never leaves your device</p>
      </header>

      <main className="app-main">
        <div className="app-camera-section">
          <StatusBar
            isModelLoaded={isModelLoaded}
            hasWebGL={modelInfo.webgl}
            backend={modelInfo.backend}
            faceCount={faceCount}
            storedCount={facesCount.count}
            maxStored={MAX_STORED_FACES}
          />

          <CameraView
            videoRef={videoRef}
            detections={detections}
            isActive={isCameraActive}
            showOverlay={isDetecting}
          />

          {cameraState === CAMERA_STATES.DENIED && (
            <ErrorMessage
              title="Camera Access Denied"
              message="Please allow camera access in your browser settings to use this feature."
              onRetry={handleStartCamera}
              retryText="Request Permission"
            />
          )}

          {cameraState === CAMERA_STATES.ERROR && cameraError && (
            <ErrorMessage
              title="Camera Error"
              message={cameraError}
              onRetry={handleStartCamera}
            />
          )}

          {appError && (
            <div className="app-error-banner">
              <span>{appError}</span>
              <button onClick={clearAppError}>&times;</button>
            </div>
          )}

          <Controls
            isCameraActive={isCameraActive}
            isDetecting={isDetecting}
            isModelLoaded={isModelLoaded}
            canCapture={isCameraActive && faceCount > 0}
            faceCount={faceCount}
            onStartCamera={handleStartCamera}
            onStopCamera={handleStopCamera}
            onToggleDetection={toggleDetection}
            onCaptureFace={handleCaptureFace}
            disabled={!isModelLoaded}
          />
        </div>

        <div className="app-list-section">
          <PersonList
            faces={storedFaces}
            loading={facesLoading}
            onEdit={handleEditPerson}
            onDelete={handleDeleteRequest}
            maxCount={MAX_STORED_FACES}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>All data stored locally in your browser. No server, no cloud, complete privacy.</p>
      </footer>

      {/* Modals */}
      <AddPersonModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        onSave={handleSavePerson}
        capturedImage={capturedData.image}
        embedding={capturedData.embedding}
        existingPerson={duplicatePerson}
      />

      <EditPersonModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPerson(null);
        }}
        onSave={handleSaveEdit}
        person={selectedPerson}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Person"
        message={`Are you sure you want to delete "${selectedPerson?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDangerous={true}
      />
    </div>
  );
}

export default App;
