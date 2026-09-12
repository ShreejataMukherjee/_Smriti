/**
 * SMRITI MEDIA CLIENT SERVICE
 * Client interface for uploading private media to Firebase Cloud Storage and registering Firestore metadata.
 * Tracks true upload progress from 0% to 100% without artificial caps or freezes.
 */

const MediaClient = {
  /**
   * Uploads a file (photo, video, audio) with real byte-level progress tracking
   * @param {Object} params
   * @param {File} params.file
   * @param {string} params.elderlyUserId
   * @param {string} params.title
   * @param {string} params.description
   * @param {string} params.type - 'photo' | 'video' | 'audio'
   * @param {Array} params.tags
   * @param {Function} params.onProgress - Progress callback (percentage 0-100)
   */
  async uploadMedia({ file, elderlyUserId, title, description, type, tags = [], onProgress = () => {} }) {
    if (!file) throw new Error('No file provided for upload');
    if (!elderlyUserId) throw new Error('Target elderlyUserId is required');

    // 1. Determine media type and validate size
    let mediaType = type;
    if (!mediaType) {
      if (file.type.startsWith('image/')) mediaType = 'photo';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';
      else mediaType = 'photo';
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 50MB limit.`);
    }

    // Initialize progress at 0%
    onProgress(0);

    // 2. Perform multipart upload via authoritative backend endpoint with real progress tracking
    const formData = new FormData();
    formData.append('file', file);
    formData.append('elderlyUserId', elderlyUserId);
    formData.append('type', mediaType);
    formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));
    formData.append('description', description || '');
    formData.append('tags', JSON.stringify(tags));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const token = window.ApiClient ? window.ApiClient.getToken() : null;

      xhr.open('POST', `${window.location.origin}/api/media/upload`);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('x-session-token', token);
      }

      // Track real byte upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.memory) {
              onProgress(100);
              resolve(data.memory);
            } else {
              reject(new Error(data.error || "Upload transferred successfully, but Smriti couldn't save the memory record. Please retry."));
            }
          } catch (e) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            const serverError = data.error || `Status ${xhr.status}`;
            if (xhr.status === 500) {
              reject(new Error(`Upload transferred successfully, but Smriti couldn't save the memory record (${serverError}). Please retry.`));
            } else {
              reject(new Error(serverError));
            }
          } catch (e) {
            if (xhr.status === 500) {
              reject(new Error("Upload transferred successfully, but Smriti couldn't save the memory record (Server Error 500). Please retry."));
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during file upload. Please check connection and try again.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timed out. Please try again.'));
      };

      xhr.send(formData);
    });
  },

  /**
   * Batch upload multiple photos with progress callback
   */
  async uploadBatchPhotos({ files, elderlyUserId, onFileProgress, onOverallProgress }) {
    const results = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      const mem = await this.uploadMedia({
        file,
        elderlyUserId,
        type: 'photo',
        title: file.name.replace(/\.[^/.]+$/, ''),
        onProgress: (pct) => {
          if (onFileProgress) onFileProgress(i, pct);
          if (onOverallProgress) onOverallProgress(Math.round(((i + (pct / 100)) / total) * 100));
        }
      });
      results.push(mem);
    }
    return results;
  },

  /**
   * Retrieves memories for an elderly user and resolves secure runtime URLs
   */
  async getMemories(elderlyUserId) {
    if (!window.ApiClient) throw new Error('ApiClient not loaded');
    const res = await window.ApiClient.request(`/api/media/elderly/${elderlyUserId}`);
    return res.memories || [];
  },

  /**
   * Deletes a memory item
   */
  async deleteMemory(memoryId) {
    if (!window.ApiClient) throw new Error('ApiClient not loaded');
    return window.ApiClient.request(`/api/media/${memoryId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Triggers or retrieves Face Detection results on a photo memory
   */
  async analyzeFaces(memoryId, options = {}) {
    if (!window.ApiClient) throw new Error('ApiClient not loaded');
    return window.ApiClient.request(`/api/vision/faces/${memoryId}`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  },

  /**
   * Saves caretaker assignments of detected faces to family members
   */
  async saveFaceAssociations({ memoryId, elderlyUserId, associations = [] }) {
    if (!window.ApiClient) throw new Error('ApiClient not loaded');
    return window.ApiClient.request('/api/vision/associations', {
      method: 'POST',
      body: JSON.stringify({ memoryId, elderlyUserId, associations })
    });
  },

  /**
   * Retrieves all face associations for an elderly user
   */
  async getFaceAssociations(elderlyUserId) {
    if (!window.ApiClient) throw new Error('ApiClient not loaded');
    const res = await window.ApiClient.request(`/api/vision/associations/${elderlyUserId}`);
    return res.associations || [];
  },

  /**
   * Retrieves face associations for a specific memory
   */
  async getMemoryFaceAssociations(memoryId) {
    if (!window.ApiClient) throw new Error('ApiClient not loaded');
    const res = await window.ApiClient.request(`/api/vision/faces/${memoryId}`);
    return res.associations || [];
  }
};

window.MediaClient = MediaClient;

