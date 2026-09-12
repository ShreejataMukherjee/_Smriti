/**
 * SMRITI OFFLINE SYNC SERVICE
 * Manages local caching of personalized cognitive activities and queues offline sessions
 * for automatic synchronization when connectivity is restored.
 */

const QUEUE_KEY = 'smriti_offline_session_queue';
const CACHE_PREFIX = 'smriti_cached_activity_pack_';

class OfflineSyncService {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.listeners = new Set();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  onStatusChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notifyStatus(status, message) {
    this.listeners.forEach(fn => fn({ isOnline: this.isOnline, status, message }));
  }

  handleOffline() {
    this.isOnline = false;
    this.notifyStatus('offline', 'Offline mode — your activities are still available.');
  }

  async handleOnline() {
    this.isOnline = true;
    this.notifyStatus('syncing', 'Syncing saved sessions...');
    await this.syncPendingQueue();
  }

  /**
   * Caches a personalized activity pack locally
   */
  cacheActivityPack(elderlyUserId, pack) {
    try {
      localStorage.setItem(`${CACHE_PREFIX}${elderlyUserId}`, JSON.stringify({
        cachedAt: new Date().toISOString(),
        pack
      }));
    } catch (e) {
      console.warn('[OfflineSync] Failed to cache activity pack:', e);
    }
  }

  /**
   * Retrieves cached activity pack when offline
   */
  getCachedActivityPack(elderlyUserId) {
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${elderlyUserId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.pack;
      }
    } catch (e) {
      console.warn('[OfflineSync] Failed to read cached activity pack:', e);
    }
    return null;
  }

  /**
   * Queues an offline session locally
   */
  queueOfflineSession(session) {
    try {
      const queue = this.getPendingQueue();
      // Deduplicate by ID
      if (!queue.some(s => s.id === session.id)) {
        queue.push({
          ...session,
          offlineRecorded: true,
          queuedAt: new Date().toISOString()
        });
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      }
      this.notifyStatus('queued', 'Session saved locally.');
    } catch (e) {
      console.error('[OfflineSync] Failed to queue offline session:', e);
    }
  }

  /**
   * Gets list of pending sessions in queue
   */
  getPendingQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Synchronizes pending sessions with backend API
   */
  async syncPendingQueue() {
    const queue = this.getPendingQueue();
    if (queue.length === 0) {
      this.notifyStatus('online', 'Everything is up to date.');
      return;
    }

    try {
      const token = localStorage.getItem('smriti_session_token') || sessionStorage.getItem('smriti_session_token');
      const res = await fetch('/api/sync/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ sessions: queue })
      });

      const data = await res.json();
      if (data.success || data.syncedCount > 0) {
        localStorage.removeItem(QUEUE_KEY);
        this.notifyStatus('synced', 'Everything is up to date.');
      }
    } catch (e) {
      console.warn('[OfflineSync] Auto-sync failed (network still unstable):', e);
      this.notifyStatus('offline', 'Offline mode — your activities are still available.');
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
