# Context-Ware Personal Memory Assistant

A fully client-side face recognition application that runs entirely in the browser. Your data never leaves your device - complete privacy guaranteed.

## Features

- **Live Face Detection**: Real-time face detection using your webcam
- **Face Recognition**: Match detected faces against your stored contacts
- **100% Client-Side**: No server, no cloud, no data transmission
- **Offline Support**: Works offline after initial load via Service Worker
- **Privacy First**: All data stored locally in IndexedDB
- **Mobile Friendly**: Responsive design with front camera support

## Tech Stack

- React 18 (Functional Components + Hooks)
- face-api.js (TensorFlow.js-based face detection)
- IndexedDB (via idb library)
- Service Worker for offline caching
- Modern ES6+ JavaScript

## Project Structure

```
src/
├── components/          # React UI components
│   ├── AddPersonModal.jsx
│   ├── CameraView.jsx
│   ├── ConfirmDialog.jsx
│   ├── Controls.jsx
│   ├── EditPersonModal.jsx
│   ├── ErrorMessage.jsx
│   ├── LoadingIndicator.jsx
│   ├── OfflineIndicator.jsx
│   ├── PersonCard.jsx
│   ├── PersonList.jsx
│   ├── StatusBar.jsx
│   └── index.js
├── hooks/               # Custom React hooks
│   ├── useCamera.js
│   ├── useFaceDetection.js
│   ├── useModelLoader.js
│   ├── useOfflineStatus.js
│   ├── useStoredFaces.js
│   └── index.js
├── services/            # Business logic services
│   ├── faceDetection.js
│   ├── recognition.js
│   └── index.js
├── db/                  # Database layer
│   ├── faceDB.js
│   └── index.js
├── utils/               # Utility functions
│   ├── similarity.js
│   ├── serviceWorker.js
│   └── index.js
├── models/              # (empty - models go in public/)
├── App.jsx              # Main application component
├── App.css              # Application styles
└── index.js             # Entry point

public/
├── models/              # face-api.js model files
├── service-worker.js    # Offline caching
├── index.html
└── manifest.json
```

## Installation

### 1. Install Dependencies

```bash
cd "Context-ware personal memory assistant"
npm install
```

### 2. Download Face-API Models

Download the required model files from the face-api.js repository:

**Option A: Using the included script (Recommended)**
```bash
npm run download-models
```

**Option B: Using curl/wget**
```bash
# Create models directory
mkdir -p public/models

# Download TinyFaceDetector model
curl -o public/models/tiny_face_detector_model-weights_manifest.json \
  https://raw.githubusercontent.com/vladmandic/face-api/master/model/tiny_face_detector_model-weights_manifest.json
curl -o public/models/tiny_face_detector_model.bin \
  https://raw.githubusercontent.com/vladmandic/face-api/master/model/tiny_face_detector_model.bin

# Download FaceLandmark68 model
curl -o public/models/face_landmark_68_model-weights_manifest.json \
  https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model-weights_manifest.json
curl -o public/models/face_landmark_68_model.bin \
  https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_landmark_68_model.bin

# Download FaceRecognition model
curl -o public/models/face_recognition_model-weights_manifest.json \
  https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model-weights_manifest.json
curl -o public/models/face_recognition_model.bin \
  https://raw.githubusercontent.com/vladmandic/face-api/master/model/face_recognition_model.bin
```

**Option C: Manual Download**
1. Go to https://github.com/vladmandic/face-api/tree/master/model
2. Download these files to your `public/models/` folder:
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model.bin`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model.bin`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model.bin`

### 3. Run the Application

```bash
npm start
```

The application will open at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

The built files will be in the `build/` directory. You can serve them with any static file server.

## Usage

### Starting Face Detection

1. Click "Start Camera" to enable your webcam
2. Detection automatically starts when camera is active
3. Detected faces show bounding boxes (green = known, orange = unknown)

### Adding a Person

1. Position a face clearly in the camera view
2. Wait for the face to be detected (face count badge appears)
3. Click "Add Person"
4. Enter the person's name and optional note
5. Click "Save Person"

### Editing a Person

1. Find the person in the list on the right
2. Click the edit (pencil) icon
3. Update name or note
4. Click "Save Changes"

### Deleting a Person

1. Find the person in the list
2. Click the delete (trash) icon
3. Confirm deletion

### Offline Mode

After the first load, the application works completely offline:
- All JS/CSS bundles are cached
- Face detection models are cached
- Your data is stored in IndexedDB

An "Offline Mode" indicator appears when disconnected.

## Configuration

### Recognition Threshold

The default recognition threshold is `0.55` (55% similarity). You can adjust this in `src/utils/similarity.js`:

```javascript
export const DEFAULT_THRESHOLD = 0.55;
```

- Lower values (0.45): More matches, more false positives
- Higher values (0.65+): Fewer matches, more strict

### Detection Interval

Face detection runs every 500ms by default. Adjust in `src/hooks/useFaceDetection.js`:

```javascript
const DEFAULT_INTERVAL = 500; // milliseconds
```

### Storage Limit

Maximum 50 people can be stored. Adjust in `src/db/faceDB.js`:

```javascript
const MAX_STORED_FACES = 50;
```

## Performance Tuning

### For Better Performance

1. **Use WebGL**: Ensure your browser supports WebGL for GPU acceleration
2. **Good Lighting**: Well-lit faces are detected faster and more accurately
3. **Stable Camera**: Keep the camera steady for consistent detection
4. **Reduce Resolution**: The app automatically uses 640x480, which is optimal

### Performance Targets

- Model loading: ~2-5 seconds (cached after first load)
- Face detection: <500ms per frame
- Recognition matching: <100ms
- Total recognition cycle: <800ms

## Browser Support

- Chrome 80+ (recommended)
- Firefox 75+
- Safari 14+
- Edge 80+

**Requirements:**
- WebGL support (falls back to CPU if unavailable)
- IndexedDB support
- Service Worker support (for offline mode)
- Camera/getUserMedia support

## Security & Privacy

- **No Network Requests**: After initial load, zero network activity
- **Local Storage Only**: All face data stored in browser's IndexedDB
- **No Telemetry**: No analytics, no tracking, no data collection
- **No Cloud**: No server-side processing whatsoever
- **Your Data**: Completely under your control

## Error Handling

The application handles these error scenarios:

| Error | Handling |
|-------|----------|
| Camera denied | Shows permission request message with retry |
| Camera unavailable | Shows device not found message |
| Camera in use | Shows busy message |
| No face detected | Shows positioning guidance |
| Multiple faces | Processes all faces |
| Model loading failed | Shows retry option |
| IndexedDB unavailable | Shows storage error |
| WebGL unavailable | Falls back to CPU (slower) |
| Storage quota exceeded | Shows limit reached message |

## Known Limitations

1. **Lighting Sensitivity**: Poor lighting reduces accuracy
2. **Angle Sensitivity**: Works best with frontal faces
3. **Storage Limit**: Maximum 50 people (IndexedDB constraint)
4. **Browser Tab**: Detection pauses when tab is hidden
5. **Mobile Performance**: Slower on low-end mobile devices
6. **Single Embedding**: Each person has one stored embedding

## Future Improvements

1. **Multiple Embeddings**: Store multiple angles per person
2. **Face Quality Score**: Reject poor quality captures
3. **Export/Import**: Backup and restore face data
4. **Threshold Slider**: UI control for recognition sensitivity
5. **Face Grouping**: Automatic clustering of unknown faces
6. **Statistics**: Recognition accuracy metrics
7. **PWA Install**: Add to home screen functionality
8. **Dark Mode**: Theme toggle support

## Troubleshooting

### Camera Not Working
1. Check browser permissions (click lock icon in URL bar)
2. Ensure no other app is using the camera
3. Try a different browser
4. Check if camera works in other apps

### Models Not Loading
1. Check internet connection (first load only)
2. Verify model files exist in `public/models/`
3. Check browser console for errors
4. Try clearing browser cache

### Recognition Not Working
1. Ensure good lighting
2. Face the camera directly
3. Check if the person was added correctly
4. Try lowering the threshold

### Offline Mode Not Working
1. Service worker requires HTTPS or localhost
2. Clear site data and reload
3. Check browser supports service workers

## License

MIT License - Use freely for personal and educational purposes.

## Credits

- [face-api.js](https://github.com/vladmandic/face-api) by Vladimir Mandic
- [TensorFlow.js](https://www.tensorflow.org/js) by Google
- [idb](https://github.com/jakearchibald/idb) by Jake Archibald
