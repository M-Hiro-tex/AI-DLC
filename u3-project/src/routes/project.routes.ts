import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { ProjectService } from '../services/project.service';
import { TemplateService } from '../services/template.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { verifyProjectOwnership } from '../middleware/ownership.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  ShareProjectRequestSchema,
  ListProjectsQuerySchema,
  CreateFromTemplateRequestSchema,
  UuidParamSchema,
} from '../validators/project.validator';

/**
 * Project Routes
 * 
 * Defines all routes for project management operations.
 * All routes require authentication.
 */

export function createProjectRoutes(
  projectService: ProjectService,
  templateService: TemplateService
): Router {
  const router = Router();
  const projectController = new ProjectController(projectService, templateService);

  /**
   * GET /api/v1/projects
   * List projects for the authenticated user
   */
  router.get(
    '/',
    authenticateToken,
    validateQuery(ListProjectsQuerySchema),
    projectController.listProjects.bind(projectController)
  );

  /**
   * POST /api/v1/projects
   * Create a new project
   */
  router.post(
    '/',
    authenticateToken,
    validateBody(CreateProjectRequestSchema),
    projectController.createProject.bind(projectController)
  );

  /**
   * POST /api/v1/projects/from-template
   * Create a project from a template
   */
  router.post(
    '/from-template',
    authenticateToken,
    validateBody(CreateFromTemplateRequestSchema),
    projectController.createFromTemplate.bind(projectController)
  );

  /**
   * GET /api/v1/projects/:id
   * Get a specific project
   */
  router.get(
    '/:id',
    authenticateToken,
    validateParams(UuidParamSchema),
    projectController.getProject.bind(projectController)
  );

  /**
   * PUT /api/v1/projects/:id
   * Update a project (owner only)
   */
  router.put(
    '/:id',
    authenticateToken,
    validateParams(UuidParamSchema),
    validateBody(UpdateProjectRequestSchema),
    verifyProjectOwnership(projectService),
    projectController.updateProject.bind(projectController)
  );

  /**
   * DELETE /api/v1/projects/:id
   * Delete a project (soft delete, owner only)
   */
  router.delete(
    '/:id',
    authenticateToken,
    validateParams(UuidParamSchema),
    verifyProjectOwnership(projectService),
    projectController.deleteProject.bind(projectController)
  );

  /**
   * POST /api/v1/projects/:id/restore
   * Restore a deleted project (owner only)
   */
  router.post(
    '/:id/restore',
    authenticateToken,
    validateParams(UuidParamSchema),
    verifyProjectOwnership(projectService),
    projectController.restoreProject.bind(projectController)
  );

  /**
   * POST /api/v1/projects/:id/share
   * Share a project with other users (owner only)
   */
  router.post(
    '/:id/share',
    authenticateToken,
    validateParams(UuidParamSchema),
    validateBody(ShareProjectRequestSchema),
    verifyProjectOwnership(projectService),
    projectController.shareProject.bind(projectController)
  );

  return router;
}
