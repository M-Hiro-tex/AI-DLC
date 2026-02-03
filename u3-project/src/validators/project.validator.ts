import { z } from 'zod';

/**
 * Project Validation Schemas
 * 
 * Zod schemas for validating project-related requests.
 * These schemas enforce business rules and data integrity at the API boundary.
 */

// Project Status enum
export const ProjectStatusSchema = z.enum(['Draft', 'Active', 'Completed']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

// Create Project Request
export const CreateProjectRequestSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be at most 100 characters'),
  description: z.string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
  templateId: z.string()
    .uuid('Invalid template ID format')
    .optional(),
  tags: z.array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

// Update Project Request
export const UpdateProjectRequestSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be at most 100 characters')
    .optional(),
  description: z.string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
  status: ProjectStatusSchema.optional(),
  progressRate: z.number()
    .min(0, 'Progress rate must be at least 0')
    .max(100, 'Progress rate must be at most 100')
    .optional(),
  tags: z.array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

// Share Project Request
export const ShareProjectRequestSchema = z.object({
  userIds: z.array(z.string().uuid('Invalid user ID format'))
    .min(1, 'At least one user ID is required')
    .max(50, 'Maximum 50 users can be shared with at once'),
});
export type ShareProjectRequest = z.infer<typeof ShareProjectRequestSchema>;

// List Projects Query Parameters
export const ListProjectsQuerySchema = z.object({
  status: ProjectStatusSchema.optional(),
  limit: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 20)
    .pipe(z.number().min(1).max(100)),
  lastEvaluatedKey: z.string().optional(),
  tags: z.string()
    .optional()
    .transform((val) => val ? val.split(',').map(t => t.trim()) : undefined),
});
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;

// Create from Template Request
export const CreateFromTemplateRequestSchema = z.object({
  templateId: z.string()
    .uuid('Invalid template ID format'),
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be at most 100 characters')
    .optional(),
  description: z.string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
});
export type CreateFromTemplateRequest = z.infer<typeof CreateFromTemplateRequestSchema>;

// UUID Parameter
export const UuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});
export type UuidParam = z.infer<typeof UuidParamSchema>;

// Validate status transition
export function isValidStatusTransition(currentStatus: ProjectStatus, newStatus: ProjectStatus): boolean {
  const allowedTransitions: Record<ProjectStatus, ProjectStatus[]> = {
    Draft: ['Active', 'Completed'],
    Active: ['Completed', 'Draft'],
    Completed: ['Active'],
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
}

// Validate project ownership or sharing
export function canAccessProject(userId: string, ownerId: string, sharedWith: string[]): boolean {
  return userId === ownerId || sharedWith.includes(userId);
}

// Validate project modification rights
export function canModifyProject(userId: string, ownerId: string): boolean {
  return userId === ownerId;
}
