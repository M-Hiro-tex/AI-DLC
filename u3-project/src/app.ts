import express, { Application } from 'express';
import { errorMiddleware } from './middleware/error.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { createRoutes } from './routes';
import { ProjectService } from './services/project.service';
import { TemplateService } from './services/template.service';
import { projectRepository } from './repositories/project.repository';
import { templateRepository } from './repositories/template.repository';

/**
 * Express Application Configuration
 * 
 * Sets up the Express application with middleware and routes.
 * This app can be used both for Lambda (via serverless-http) and local development.
 */
export function createApp(): Application {
  const app = express();

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS configuration
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
  // Handle preflight
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Request logging middleware
  app.use(loggingMiddleware);

  // Initialize services
  const projectService = new ProjectService(projectRepository);
  const templateService = new TemplateService(templateRepository, projectService);

  // API routes
  const routes = createRoutes(projectService, templateService);
  app.use(routes);

  // Root health check
  app.get('/', (_req, res) => {
    res.json({
      service: 'U3-Project',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0'
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString()
    });
  });

  // Global error handler (must be last)
  app.use(errorMiddleware);

  return app;
}

export default createApp();