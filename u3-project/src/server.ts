import { createApp } from './app';

/**
 * Local Development Server
 * 
 * Starts the Express application on a local port for development and testing.
 * This is NOT used in Lambda deployment.
 */

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp();

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log('\n🚀 U3-Project Service Started');
  console.log('================================');
  console.log(`📍 Server:    http://localhost:${PORT}`);
  console.log(`🏥 Health:    http://localhost:${PORT}/api/v1/health`);
  console.log(`📚 API Base:  http://localhost:${PORT}/api/v1`);
  console.log(`⚙️  Mode:      ${process.env.NODE_ENV || 'development'}`);
  console.log('================================\n');
  console.log('Available endpoints:');
  console.log('  GET    /api/v1/projects');
  console.log('  POST   /api/v1/projects');
  console.log('  GET    /api/v1/projects/:id');
  console.log('  PUT    /api/v1/projects/:id');
  console.log('  DELETE /api/v1/projects/:id');
  console.log('  POST   /api/v1/projects/:id/restore');
  console.log('  POST   /api/v1/projects/:id/share');
  console.log('  GET    /api/v1/templates');
  console.log('  POST   /api/v1/projects/from-template');
  console.log('  GET    /api/v1/health');
  console.log('\n👉 Press Ctrl+C to stop\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default server;