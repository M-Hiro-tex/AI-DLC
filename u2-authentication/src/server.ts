/**
 * HTTP Server Entry Point
 * 
 * Starts the Express application as an HTTP server for local development
 * and traditional server deployments (EC2, ECS, etc.)
 */

import { Server } from 'http';
import { createApp, shutdown } from './app';
import { getConfig } from './config';
import { logger } from './utils/logger';

/**
 * Start the HTTP server
 */
async function startServer(): Promise<Server> {
  try {
    const app = createApp();
    const config = getConfig();
    const port = config.port;

    // Start listening
    const server = app.listen(port, () => {
      logger.info(`🚀 Server started successfully`);
      logger.info(`📡 Environment: ${config.nodeEnv}`);
      logger.info(`🌐 Listening on port: ${port}`);
      logger.info(`📍 API Base URL: http://localhost:${port}/api/v1`);
      logger.info(`❤️  Health check: http://localhost:${port}/ping`);
      logger.info(`⏰ Started at: ${new Date().toISOString()}`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${port} is already in use`);
      } else {
        logger.error('❌ Server error', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
      }
      process.exit(1);
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
      await shutdown(server, 'SIGTERM');
    });

    process.on('SIGINT', async () => {
      await shutdown(server, 'SIGINT');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('❌ Uncaught Exception', {
        message: error.message,
        stack: error.stack
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('❌ Unhandled Rejection', { reason, promise: promise.toString() });
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error('❌ Failed to start server', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('❌ Fatal error during server startup', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  });
}

export default startServer;