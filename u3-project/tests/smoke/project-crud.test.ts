import request from 'supertest';
import { app } from '../../src/app';

/**
 * Smoke Test: Project CRUD Operations
 * 
 * Basic smoke tests to verify core project CRUD functionality
 * immediately after deployment.
 */

describe('Project CRUD Smoke Tests', () => {
  let authToken: string;
  let testProjectId: string;

  beforeAll(() => {
    authToken = 'Bearer mock-jwt-token';
  });

  afterAll(async () => {
    // Cleanup test project if created
    if (testProjectId) {
      try {
        await request(app)
          .delete(`/api/v1/projects/${testProjectId}`)
          .set('Authorization', authToken);
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    }
  });

  describe('Project Creation', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Smoke Test Project',
        description: 'Testing deployment'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', authToken)
        .send(projectData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(projectData.name);
      expect(response.body.status).toBe('Draft');

      testProjectId = response.body.id;
    });

    it('should reject creation without authentication', async () => {
      const projectData = {
        name: 'Unauthorized Project'
      };

      await request(app)
        .post('/api/v1/projects')
        .send(projectData)
        .expect(401);
    });
  });

  describe('Project Retrieval', () => {
    it('should retrieve the created project', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.id).toBe(testProjectId);
      expect(response.body.name).toBe('Smoke Test Project');
    });

    it('should list projects', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
    });
  });

  describe('Project Update', () => {
    it('should update project name', async () => {
      const updateData = {
        name: 'Updated Smoke Test Project'
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
    });
  });

  describe('Project Deletion', () => {
    it('should soft delete the project', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Templates', () => {
    it('should list available templates', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .expect(200);

      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
    });
  });

  describe('Error Responses', () => {
    it('should return 404 for non-existent project', async () => {
      await request(app)
        .get('/api/v1/projects/non-existent-id')
        .set('Authorization', authToken)
        .expect(404);
    });

    it('should return 400 for invalid project data', async () => {
      await request(app)
        .post('/api/v1/projects')
        .set('Authorization', authToken)
        .send({ invalid: 'data' })
        .expect(400);
    });
  });
});