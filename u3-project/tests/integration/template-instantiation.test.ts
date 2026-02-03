import request from 'supertest';
import { app } from '../../src/app';

/**
 * Integration Test: Template Instantiation
 * 
 * Tests the template listing and project creation from templates.
 */

describe('Template Instantiation Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let createdProjectIds: string[] = [];

  beforeAll(() => {
    testUserId = 'test-user-123';
    authToken = 'Bearer mock-jwt-token';
  });

  afterAll(async () => {
    // Cleanup created projects
    for (const projectId of createdProjectIds) {
      try {
        await request(app)
          .delete(`/api/v1/projects/${projectId}`)
          .set('Authorization', authToken);
      } catch (error) {
        console.error(`Cleanup failed for project ${projectId}:`, error);
      }
    }
  });

  describe('Template Listing', () => {
    it('should list all available templates', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .expect(200);

      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.templates.length).toBeGreaterThan(0);
    });

    it('should filter templates by category', async () => {
      const response = await request(app)
        .get('/api/v1/templates?category=web')
        .expect(200);

      expect(response.body).toHaveProperty('templates');
      response.body.templates.forEach((template: any) => {
        expect(template.category).toBe('web');
      });
    });

    it('should filter templates by difficulty', async () => {
      const response = await request(app)
        .get('/api/v1/templates?difficulty=beginner')
        .expect(200);

      expect(response.body).toHaveProperty('templates');
      response.body.templates.forEach((template: any) => {
        expect(template.difficulty).toBe('beginner');
      });
    });

    it('should return empty list for non-existent category', async () => {
      const response = await request(app)
        .get('/api/v1/templates?category=non-existent')
        .expect(200);

      expect(response.body.templates).toEqual([]);
    });

    it('should include template metadata', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .expect(200);

      const template = response.body.templates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('category');
      expect(template).toHaveProperty('difficulty');
      expect(template).toHaveProperty('estimatedHours');
      expect(template).toHaveProperty('tags');
    });
  });

  describe('Project Creation from Template', () => {
    let templateId: string;

    beforeAll(async () => {
      // Get a template to use for testing
      const response = await request(app)
        .get('/api/v1/templates')
        .expect(200);

      templateId = response.body.templates[0].id;
    });

    it('should create a project from a template', async () => {
      const projectData = {
        templateId,
        name: 'My Project from Template',
        description: 'Testing template instantiation'
      };

      const response = await request(app)
        .post('/api/v1/projects/from-template')
        .set('Authorization', authToken)
        .send(projectData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(projectData.name);
      expect(response.body.description).toBe(projectData.description);
      expect(response.body.status).toBe('Draft');
      expect(response.body.ownerId).toBe(testUserId);
      expect(response.body.progressRate).toBe(0);
      expect(response.body).toHaveProperty('templateId', templateId);

      createdProjectIds.push(response.body.id);
    });

    it('should create project with template name when no custom name provided', async () => {
      const projectData = {
        templateId
      };

      const response = await request(app)
        .post('/api/v1/projects/from-template')
        .set('Authorization', authToken)
        .send(projectData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBeTruthy();
      expect(response.body.templateId).toBe(templateId);

      createdProjectIds.push(response.body.id);
    });

    it('should copy template tags to new project', async () => {
      const projectData = {
        templateId,
        name: 'Project with Template Tags'
      };

      const response = await request(app)
        .post('/api/v1/projects/from-template')
        .set('Authorization', authToken)
        .send(projectData)
        .expect(201);

      expect(response.body.tags).toBeDefined();
      expect(Array.isArray(response.body.tags)).toBe(true);
      expect(response.body.tags.length).toBeGreaterThan(0);

      createdProjectIds.push(response.body.id);
    });

    it('should reject project creation with non-existent template', async () => {
      const projectData = {
        templateId: 'non-existent-template',
        name: 'Invalid Template Project'
      };

      await request(app)
        .post('/api/v1/projects/from-template')
        .set('Authorization', authToken)
        .send(projectData)
        .expect(404);
    });

    it('should reject project creation without authentication', async () => {
      const projectData = {
        templateId,
        name: 'Unauthorized Project'
      };

      await request(app)
        .post('/api/v1/projects/from-template')
        .send(projectData)
        .expect(401);
    });

    it('should reject project creation without templateId', async () => {
      const projectData = {
        name: 'Project without Template'
      };

      await request(app)
        .post('/api/v1/projects/from-template')
        .set('Authorization', authToken)
        .send(projectData)
        .expect(400);
    });
  });

  describe('Template Statistics', () => {
    it('should track template usage in created projects', async () => {
      // Create multiple projects from the same template
      const response = await request(app)
        .get('/api/v1/templates')
        .expect(200);

      const templateId = response.body.templates[0].id;

      // Create 3 projects from this template
      for (let i = 0; i < 3; i++) {
        const projectData = {
          templateId,
          name: `Bulk Project ${i}`
        };

        const createResponse = await request(app)
          .post('/api/v1/projects/from-template')
          .set('Authorization', authToken)
          .send(projectData)
          .expect(201);

        createdProjectIds.push(createResponse.body.id);
      }

      // Verify all projects reference the template
      for (const projectId of createdProjectIds.slice(-3)) {
        const projectResponse = await request(app)
          .get(`/api/v1/projects/${projectId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(projectResponse.body.templateId).toBe(templateId);
      }
    });
  });

  describe('Multiple Template Creation', () => {
    it('should allow creating multiple projects from different templates', async () => {
      const templatesResponse = await request(app)
        .get('/api/v1/templates')
        .expect(200);

      const templates = templatesResponse.body.templates.slice(0, 3);

      for (const template of templates) {
        const projectData = {
          templateId: template.id,
          name: `Project from ${template.name}`
        };

        const response = await request(app)
          .post('/api/v1/projects/from-template')
          .set('Authorization', authToken)
          .send(projectData)
          .expect(201);

        expect(response.body.templateId).toBe(template.id);
        createdProjectIds.push(response.body.id);
      }
    });
  });

  describe('Template Content Validation', () => {
    it('should ensure template has all required fields', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .expect(200);

      const template = response.body.templates[0];

      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.category).toBeTruthy();
      expect(template.difficulty).toMatch(/^(beginner|intermediate|advanced)$/);
      expect(template.estimatedHours).toBeGreaterThan(0);
      expect(Array.isArray(template.tags)).toBe(true);
    });

    it('should validate difficulty levels', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .expect(200);

      const validDifficulties = ['beginner', 'intermediate', 'advanced'];
      response.body.templates.forEach((template: any) => {
        expect(validDifficulties).toContain(template.difficulty);
      });
    });

    it('should validate categories', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .expect(200);

      const validCategories = ['web', 'mobile', 'backend', 'data', 'ml', 'devops'];
      response.body.templates.forEach((template: any) => {
        expect(validCategories).toContain(template.category);
      });
    });
  });
});