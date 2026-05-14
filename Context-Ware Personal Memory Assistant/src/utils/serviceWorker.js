/**
 * Service Worker Registration Utility
 */

/**
 * Register the service worker
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New service worker available');
            // Optionally notify user about update
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister all service workers
 * @returns {Promise<boolean>}
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    console.log('Service Worker unregistered:', result);
    return result;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check if service worker is active
 * @returns {boolean}
 */
export function isServiceWorkerActive() {
  return !!(navigator.serviceWorker && navigator.serviceWorker.controller);
}

/**
 * Send message to service worker
 * @param {Object} message - Message to send
 * @returns {Promise<any>}
 */
export function sendMessageToSW(message) {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      reject(new Error('No active service worker'));
      return;
    }

    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

/**
 * Get cache status from service worker
 * @returns {Promise<Object>}
 */
export async function getCacheStatus() {
  try {
    return await sendMessageToSW({ type: 'GET_CACHE_STATUS' });
  } catch {
    return { staticCached: false, modelsCached: false };
  }
}
