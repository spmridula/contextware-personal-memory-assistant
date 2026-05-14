/**
 * CameraView Component
 * Displays camera feed with face detection overlay
 */

import React, { useRef, useEffect, useCallback } from 'react';

/**
 * Camera view with overlay canvas
 * @param {Object} props - Component props
 */
function CameraView({ 
  videoRef, 
  detections = [], 
  isActive = false,
  showOverlay = true,
  onVideoReady = null,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);

  /**
   * Draw detection overlays on canvas
   */
  const drawOverlays = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef?.current;

    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    
    // Match canvas size to video display size
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showOverlay || detections.length === 0) return;

    // Calculate scale factors
    const scaleX = rect.width / video.videoWidth;
    const scaleY = rect.height / video.videoHeight;

    // Mirror x to match video's scaleX(-1) selfie view (video is mirrored, coords are not)
    const mirrorX = (px) => canvas.width - px;

    // Draw each detection
    detections.forEach((detection) => {
      const { box, isKnown, match } = detection;
      
      // Scale box coordinates
      const x = box.x * scaleX;
      const y = box.y * scaleY;
      const width = box.width * scaleX;
      const height = box.height * scaleY;

      // Mirrored coordinates for selfie view (video uses scaleX(-1))
      const xMirror = mirrorX(x + width);
      const widthMirror = width;

      // Draw bounding box (mirrored)
      ctx.strokeStyle = isKnown ? '#00ff00' : '#ff9900';
      ctx.lineWidth = 2;
      ctx.strokeRect(xMirror, y, widthMirror, height);

      // Draw label background
      const name = isKnown ? match.name : 'Unknown';
      const note = isKnown && match.note ? match.note : '';
      const confidence = isKnown ? `${match.confidence}%` : '';
      
      const labelText = confidence ? `${name} (${confidence})` : name;
      
      ctx.font = '14px Arial';
      const textMetrics = ctx.measureText(labelText);
      const labelHeight = note ? 40 : 24;
      const labelWidth = Math.max(textMetrics.width + 10, 100);

      // Position label above box, or below if too close to top
      const labelY = y > labelHeight + 5 ? y - labelHeight - 5 : y + height + 5;
      const labelX = xMirror; // Align with box left in mirrored space

      // Background (text stays readable - no canvas flip)
      ctx.fillStyle = isKnown ? 'rgba(0, 128, 0, 0.8)' : 'rgba(128, 80, 0, 0.8)';
      ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

      // Text (renders correctly, not inverted)
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, labelX + 5, labelY + 16);
      
      if (note) {
        ctx.font = '12px Arial';
        ctx.fillStyle = '#dddddd';
        // Truncate long notes
        const truncatedNote = note.length > 20 ? note.substring(0, 17) + '...' : note;
        ctx.fillText(truncatedNote, labelX + 5, labelY + 32);
      }
    });
  }, [videoRef, detections, showOverlay]);

  /**
   * Animation loop for smooth overlay updates
   */
  const animate = useCallback(() => {
    drawOverlays();
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [drawOverlays]);

  // Start animation loop when active
  useEffect(() => {
    if (isActive && showOverlay) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, showOverlay, animate]);

  // Handle video ready event
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const handleLoadedData = () => {
      onVideoReady?.({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.addEventListener('loadeddata', handleLoadedData);
    
    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [videoRef, onVideoReady]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawOverlays();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [drawOverlays]);

  return (
    <div className="camera-view" ref={containerRef}>
      <video
        ref={videoRef}
        className="camera-video"
        autoPlay
        playsInline
        muted
      />
      <canvas 
        ref={canvasRef} 
        className="camera-overlay"
      />
      {!isActive && (
        <div className="camera-placeholder">
          <span>Camera not active</span>
        </div>
      )}
    </div>
  );
}

export default CameraView;
