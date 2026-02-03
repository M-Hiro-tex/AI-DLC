import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service';
import { logger } from '../utils/logger';

/**
 * Ownership Middleware
 * 
 * Verifies that the authenticated user is the owner of the requested project.
 * Used to protect modification operations (update, delete, share).
 */

/**
 * Middleware to verify project ownership
 * 
 * Prerequisites:
 * - User must be authenticated (req.user must be set)
 * - Project ID must be in req.params.id
 * 
 * @param projectService Project service instance
 */
export function verifyProjectOwnership(projectService: ProjectService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = req.params.id;
      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      logger.info('Verifying project ownership', { userId, projectId });

      const project = await projectService.getProject(projectId, userId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.ownerId !== userId) {
        logger.warn('Ownership verification failed', { 
          userId, 
          projectId, 
          ownerId: project.ownerId 
        });
        res.status(403).json({ error: 'You do not have permission to modify this project' });
        return;
      }

      // Attach project to request for downstream use
      (req as any).project = project;

      next();
    } catch (error) {
      logger.error('Ownership verification error', { error });
      next(error);
    }
  };
}

/**
 * Middleware to verify project access (owner or shared user)
 * 
 * More permissive than ownership check - allows both owners and shared users.
 * Used for read operations.
 * 
 * @param projectService Project service instance
 */
export function verifyProjectAccess(projectService: ProjectService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = req.params.id;
      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      logger.info('Verifying project access', { userId, projectId });

      const project = await projectService.getProject(projectId, userId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const hasAccess = 
        project.ownerId === userId || 
        (project.sharedWith || []).includes(userId);

      if (!hasAccess) {
        logger.warn('Access verification failed', { 
          userId, 
          projectId, 
          ownerId: project.ownerId,
          sharedWith: project.sharedWith 
        });
        res.status(403).json({ error: 'You do not have access to this project' });
        return;
      }

      // Attach project to request for downstream use
      (req as any).project = project;

      next();
    } catch (error) {
      logger.error('Access verification error', { error });
      next(error);
    }
  };
}
