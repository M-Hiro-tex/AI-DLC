import { Request, Response, NextFunction } from 'express';
import { TemplateService } from '../services/template.service';
import { logger } from '../utils/logger';

/**
 * Template Controller
 * 
 * Handles HTTP requests for template operations.
 * Provides access to predefined project templates.
 */
export class TemplateController {
  constructor(private templateService: TemplateService) {}

  /**
   * List all available templates
   * GET /api/v1/templates
   */
  async listTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { category } = req.query;

      logger.info('Listing templates', { userId, category });

      const templates = await this.templateService.listTemplates(
        category as string | undefined
      );

      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific template by ID
   * GET /api/v1/templates/:id
   */
  async getTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      logger.info('Fetching template', { userId, templateId: id });

      const template = await this.templateService.getTemplate(id);

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
}
