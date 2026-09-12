/**
 * SMRITI BACKEND STRUCTURED LOGGER
 * Formats diagnostic and security audit logs with timestamps and log levels.
 */

export const logger = {
  info: (msg, meta = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? meta : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? meta : '');
  },
  error: (msg, error = {}) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, error);
  },
  auth: (msg, meta = {}) => {
    console.log(`[AUTH-AUDIT] [${new Date().toISOString()}] ${msg}`, meta);
  }
};
