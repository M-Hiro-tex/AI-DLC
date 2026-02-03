omport { Router } from 'express';
import { TemplateController } from '../controllers/template.controller';
import { TemplateService } from '../services/template.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateParams } from '../middleware/validation.middleware';
import { UuidParamSchema } from '../validators/project.validator';

/**
 * Template Routes
 * 
 * Defines all routes for template operations.
 * All routes require authentication.
 */

export function createTemplateRoutes(templateService: TemplateService): Router {
  const router = Router();
  const templateController = new TemplateController(templateService);

  /**
   * GET /api/v1/templates
   * List all available templates
   * Optional query parameter: category
   */
  router.get(
    '/',
    authenticateToken,
    templateController.listTemplates.bind(templateController)
  );

  /**
   * GET /api/v1/templates/:id
   * Get a specific template by ID
   */
  router.get(
    '/:id',
    authenticateToken,
    validateParams(UuidParamSchema),
    templateController.getTemplate.bind(templateController)
  );

  return router;
}
