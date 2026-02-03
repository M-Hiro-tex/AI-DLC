import { Router } from 'express';
import { ProjectService } from '../services/project.service';
import { TemplateService } from '../services/template.service';
import { createProjectRoutes } from './project.routes';
import { createTemplateRoutes } from './template.routes';
import { createHealthRoutes } from './health.routes';

/**
 * Main Routes Configuration
 * 
 * Combines all route modules and exports a single router.
 * API versioning is handled here.
 */

export function createRoutes(
  projectService: ProjectService,
  templateService: TemplateService
): Router {
  const router = Router();

  // API version prefix
  const apiV1 = Router();

  // Mount route modules
  apiV1.use('/projects', createProjectRoutes(projectService, templateService));
  apiV1.use('/templates', createTemplateRoutes(templateService));
  apiV1.use('/health', createHealthRoutes());

  // Mount versioned API
  router.use('/api/v1', apiV1);

  // Root endpoint
  router.get('/', (_req, res) => {
    res.json({
      service: 'u3-project',
      version: '1.0.0',
      description: 'Project Domain Service',
      endpoints: {
        health: '/api/v1/health',
        projects: '/api/v1/projects',
        templates: '/api/v1/templates',
      },
    });
  });

  return router;
}

// Export as default for app.ts compatibility
export default createRoutes;
