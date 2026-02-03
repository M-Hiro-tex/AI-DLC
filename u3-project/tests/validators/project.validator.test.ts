import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  ShareProjectRequestSchema,
  ListProjectsQuerySchema,
  CreateFromTemplateRequestSchema,
  UuidParamSchema,
  isValidStatusTransition,
  canAccessProject,
  canModifyProject,
} from '../../src/validators/project.validator';

describe('Project Validators', () => {
  describe('CreateProjectRequestSchema', () => {
    it('should validate a valid create project request', () => {
      const validData = {
        name: 'My Project',
        description: 'A test project',
        tags: ['learning', 'typescript'],
      };

      const result = CreateProjectRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should apply default empty array for tags if not provided', () => {
      const data = { name: 'My Project' };
      const result = CreateProjectRequestSchema.parse(data);
      expect(result.tags).toEqual([]);
    });

    it('should reject name that is too long', () => {
      const invalidData = {
        name: 'a'.repeat(101),
      };

      const result = CreateProjectRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('100 characters');
      }
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
      };

      const result = CreateProjectRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject description that is too long', () => {
      const invalidData = {
        name: 'My Project',
        description: 'a'.repeat(501),
      };

      const result = CreateProjectRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject more than 10 tags', () => {
      const invalidData = {
        name: 'My Project',
        tags: Array(11).fill('tag'),
      };

      const result = CreateProjectRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid templateId format', () => {
      const invalidData = {
        name: 'My Project',
        templateId: 'not-a-uuid',
      };

      const result = CreateProjectRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid templateId', () => {
      const validData = {
        name: 'My Project',
        templateId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CreateProjectRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateProjectRequestSchema', () => {
    it('should validate a valid update request with all fields', () => {
      const validData = {
        name: 'Updated Project',
        description: 'Updated description',
        status: 'Active' as const,
        progressRate: 50,
        tags: ['updated'],
      };

      const result = UpdateProjectRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate a partial update', () => {
      const validData = {
        name: 'Updated Name',
      };

      const result = UpdateProjectRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty update object', () => {
      const invalidData = {};

      const result = UpdateProjectRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least one field');
      }
    });

    it('should reject invalid status value', () => {
      const invalidData = {
        status: 'InvalidStatus',
      };

      const result = UpdateProjectRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject progressRate below 0', () => {
      const invalidData = {
        progressRate: -1,
      };

      const result = UpdateProjectRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject progressRate above 100', () => {
      const invalidData = {
        progressRate: 101,
      };

      const result = UpdateProjectRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('ShareProjectRequestSchema', () => {
    it('should validate a valid share request', () => {
      const validData = {
        userIds: ['123e4567-e89b-12d3-a456-426614174000'],
      };

      const result = ShareProjectRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty userIds array', () => {
      const invalidData = {
        userIds: [],
      };

      const result = ShareProjectRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject more than 50 userIds', () => {
      const invalidData = {
        userIds: Array(51).fill('123e4567-e89b-12d3-a456-426614174000'),
      };

      const result = ShareProjectRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const invalidData = {
        userIds: ['not-a-uuid'],
      };

      const result = ShareProjectRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('ListProjectsQuerySchema', () => {
    it('should parse query with default limit', () => {
      const query = {};
      const result = ListProjectsQuerySchema.parse(query);
      expect(result.limit).toBe(20);
    });

    it('should parse custom limit', () => {
      const query = { limit: '50' };
      const result = ListProjectsQuerySchema.parse(query);
      expect(result.limit).toBe(50);
    });

    it('should parse status filter', () => {
      const query = { status: 'Active' };
      const result = ListProjectsQuerySchema.parse(query);
      expect(result.status).toBe('Active');
    });

    it('should parse comma-separated tags', () => {
      const query = { tags: 'learning,typescript,aws' };
      const result = ListProjectsQuerySchema.parse(query);
      expect(result.tags).toEqual(['learning', 'typescript', 'aws']);
    });

    it('should reject limit below 1', () => {
      const query = { limit: '0' };
      const result = ListProjectsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should reject limit above 100', () => {
      const query = { limit: '101' };
      const result = ListProjectsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateFromTemplateRequestSchema', () => {
    it('should validate a valid request', () => {
      const validData = {
        templateId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'My Project from Template',
      };

      const result = CreateFromTemplateRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate request without optional name', () => {
      const validData = {
        templateId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = CreateFromTemplateRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid templateId', () => {
      const invalidData = {
        templateId: 'not-a-uuid',
      };

      const result = CreateFromTemplateRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('UuidParamSchema', () => {
    it('should validate a valid UUID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = UuidParamSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        id: 'not-a-uuid',
      };

      const result = UuidParamSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('isValidStatusTransition', () => {
    it('should allow Draft to Active', () => {
      expect(isValidStatusTransition('Draft', 'Active')).toBe(true);
    });

    it('should allow Draft to Completed', () => {
      expect(isValidStatusTransition('Draft', 'Completed')).toBe(true);
    });

    it('should allow Active to Completed', () => {
      expect(isValidStatusTransition('Active', 'Completed')).toBe(true);
    });

    it('should allow Active to Draft', () => {
      expect(isValidStatusTransition('Active', 'Draft')).toBe(true);
    });

    it('should allow Completed to Active', () => {
      expect(isValidStatusTransition('Completed', 'Active')).toBe(true);
    });

    it('should reject Completed to Draft', () => {
      expect(isValidStatusTransition('Completed', 'Draft')).toBe(false);
    });

    it('should allow same status transition', () => {
      expect(isValidStatusTransition('Draft', 'Draft')).toBe(false);
      expect(isValidStatusTransition('Active', 'Active')).toBe(false);
      expect(isValidStatusTransition('Completed', 'Completed')).toBe(false);
    });
  });

  describe('canAccessProject', () => {
    const ownerId = 'owner-123';
    const userId1 = 'user-456';
    const userId2 = 'user-789';

    it('should allow owner to access', () => {
      expect(canAccessProject(ownerId, ownerId, [])).toBe(true);
    });

    it('should allow shared user to access', () => {
      expect(canAccessProject(userId1, ownerId, [userId1, userId2])).toBe(true);
    });

    it('should reject non-owner and non-shared user', () => {
      expect(canAccessProject('other-user', ownerId, [userId1, userId2])).toBe(false);
    });
  });

  describe('canModifyProject', () => {
    const ownerId = 'owner-123';
    const userId = 'user-456';

    it('should allow owner to modify', () => {
      expect(canModifyProject(ownerId, ownerId)).toBe(true);
    });

    it('should reject non-owner from modifying', () => {
      expect(canModifyProject(userId, ownerId)).toBe(false);
    });
  });
});
