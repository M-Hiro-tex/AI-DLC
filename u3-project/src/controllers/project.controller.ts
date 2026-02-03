import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service';
import { TemplateService } from '../services/template.service';
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  ShareProjectRequestSchema,
  ListProjectsQuerySchema,
  CreateFromTemplateRequestSchema,
} from '../validators/project.validator';
import { logger } from '../utils/logger';

/**
 * Project Controller
 * 
 * Handles HTTP requests for project management operations.
 * Validates requests, coordinates with services, and formats responses.
 */
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private templateService: TemplateService
  ) {}

  /**
   * Create a new project
   * POST /api/v1/projects
   */
  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = CreateProjectRequestSchema.parse(req.body);
      
      logger.info('Creating project', { userId, projectName: validatedData.name });

      const project = await this.projectService.createProject({
        ...validatedData,
        ownerId: userId,
      });

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a project by ID
   * GET /api/v1/projects/:id
   */
  async getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      logger.info('Fetching project', { userId, projectId: id });

      const project = await this.projectService.getProject(id, userId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List projects for the current user
   * GET /api/v1/projects
   */
  async listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const query = ListProjectsQuerySchema.parse(req.query);

      logger.info('Listing projects', { userId, filters: query });

      const result = await this.projectService.listProjects(userId, {
        status: query.status,
        page: 1,
        pageSize: query.limit,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        tags: query.tags,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrevious: result.hasPrevious,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a project
   * PUT /api/v1/projects/:id
   */
  async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const validatedData = UpdateProjectRequestSchema.parse(req.body);

      logger.info('Updating project', { userId, projectId: id, updates: validatedData });

      const project = await this.projectService.updateProject(id, userId, validatedData);

      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a project (soft delete)
   * DELETE /api/v1/projects/:id
   */
  async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      logger.info('Deleting project', { userId, projectId: id });

      await this.projectService.deleteProject(id, userId);

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restore a deleted project
   * POST /api/v1/projects/:id/restore
   */
  async restoreProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      logger.info('Restoring project', { userId, projectId: id });

      const project = await this.projectService.getProject(id, userId);
      if (!project || !project.deletedAt) {
        res.status(404).json({ error: 'Deleted project not found' });
        return;
      }

      const restoredProject = await this.projectService.restoreProject(id, userId);

      res.status(200).json({
        success: true,
        data: restoredProject,
        message: 'Project restored successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Share a project with other users
   * POST /api/v1/projects/:id/share
   */
  async shareProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const validatedData = ShareProjectRequestSchema.parse(req.body);

      logger.info('Sharing project', { userId, projectId: id, shareWith: validatedData.userIds });

      const project = await this.projectService.getProject(id, userId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Verify ownership
      if (project.ownerId !== userId) {
        res.status(403).json({ error: 'Only the owner can share a project' });
        return;
      }

      // Share project with users
      const updatedProject = await this.projectService.shareProject(
        id,
        userId,
        validatedData.userIds
      );

      res.status(200).json({
        success: true,
        data: updatedProject,
        message: 'Project shared successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a project from a template
   * POST /api/v1/projects/from-template
   */
  async createFromTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = CreateFromTemplateRequestSchema.parse(req.body);

      logger.info('Creating project from template', { userId, templateId: validatedData.templateId });

      const result = await this.templateService.instantiateTemplate({
        templateId: validatedData.templateId,
        projectName: validatedData.name || 'Untitled Project',
        projectDescription: validatedData.description,
        ownerId: userId,
      });

      res.status(201).json({
        success: true,
        data: result.project,
        template: result.template,
        message: 'Project created from template successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
