/**
 * SMRITI BACKEND SERVER ENTRYPOINT (LOCAL DEVELOPMENT & SELF-HOSTED RUNTIME)
 * Starts the HTTP server listener for local development.
 */

import app from './app.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');

app.listen(config.port, () => {
  logger.info(`=======================================================`);
  logger.info(`  SMRITI PLATFORM RUNNING AT http://localhost:${config.port}`);
  logger.info(`  Environment: ${config.nodeEnv}`);
  logger.info(`  Frontend:    ${FRONTEND_DIR}`);
  logger.info(`=======================================================`);
});

export default app;
