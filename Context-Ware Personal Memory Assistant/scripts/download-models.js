/**
 * Model Download Script
 * Downloads face-api.js models to public/models folder
 * 
 * Run with: node scripts/download-models.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';
const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');

const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
];

function downloadFile(filename) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${filename}`;
    const filePath = path.join(MODELS_DIR, filename);

    console.log(`Downloading: ${filename}`);

    const file = fs.createWriteStream(filePath);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`  Downloaded: ${filename}`);
            resolve();
          });
        }).on('error', reject);
      } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`  Downloaded: ${filename}`);
          resolve();
        });
      } else {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('Face-API Model Downloader');
  console.log('=========================\n');

  // Create models directory if it doesn't exist
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log(`Created directory: ${MODELS_DIR}\n`);
  }

  console.log(`Downloading ${FILES.length} model files...\n`);

  let success = 0;
  let failed = 0;

  for (const file of FILES) {
    try {
      await downloadFile(file);
      success++;
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n=========================');
  console.log(`Download complete: ${success} succeeded, ${failed} failed`);

  if (failed === 0) {
    console.log('\nModels are ready! You can now run: npm start');
  } else {
    console.log('\nSome downloads failed. Please try again or download manually.');
  }
}

main().catch(console.error);
