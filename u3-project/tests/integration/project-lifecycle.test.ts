import request from 'supertest';
import { app } from '../../src/app';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Integration Test: Project Lifecycle
 * 
 * Tests the complete lifecycle of a project from creation to deletion.
 * This test requires a DynamoDB table to be available (local or AWS).
 */

describe('Project Lifecycle Integration Tests', () => {
  let testUserId: string;
  let testProjectId: string;
  let authToken: string;

  // Mock DynamoDB client for cleanup
  const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const tableName = process.env.DYNAMODB_TABLE_NAME || 'ProjectDomain-test';

  beforeAll(() => {
    // Setup test user and mock JWT token
    testUserId = 'test-user-123';
    authToken = 'Bearer mock-jwt-token'; // In real scenario, generate valid JWT
  });

  afterAll(async () => {
    // Cleanup test data
    if (testProjectId) {
      try {
        await dynamoClient.send(new DeleteCommand({
          TableName: tableName,
          Key: {
            PK: `PROJECT#${testProjectId}`,
            SK: 'METADATA'
          }
        }));
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    }
  });

  describe('Complete Project Lifecycle', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Integration Test Project',
        description: 'Testing project lifecycle',
        tags: ['test', 'integration']
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', authToken)
        .send(projectData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(projectData.name);
      expect(response.body.description).toBe(projectData.description);
      expect(response.body.status).toBe('Draft');
      expect(response.body.ownerId).toBe(testUserId);
      expect(response.body.progressRate).toBe(0);

      testProjectId = response.body.id;
    });

    it('should retrieve the created project', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.id).toBe(testProjectId);
      expect(response.body.name).toBe('Integration Test Project');
      expect(response.body.status).toBe('Draft');
    });

    it('should list projects for the user', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
      
      const createdProject = response.body.projects.find(
        (p: any) => p.id === testProjectId
      );
      expect(createdProject).toBeDefined();
    });

    it('should update the project', async () => {
      const updateData = {
        name: 'Updated Integration Test Project',
        description: 'Updated description',
        status: 'Active',
        progressRate: 25,
        tags: ['test', 'integration', 'updated']
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.status).toBe('Active');
      expect(response.body.progressRate).toBe(25);
      expect(response.body.tags).toEqual(updateData.tags);
    });

    it('should not allow invalid status transitions', async () => {
      const invalidUpdate = {
        status: 'InvalidStatus'
      };

      await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', authToken)
        .send(invalidUpdate)
        .expect(400);
    });

    it('should share the project with another user', async () => {
      const shareData = {
        userIds: ['user-456', 'user-789']
      };

      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/share`)
        .set('Authorization', authToken)
        .send(shareData)
        .expect(200);

      expect(response.body.sharedWith).toContain('user-456');
      expect(response.body.sharedWith).toContain('user-789');
    });

    it('should complete the project', async () => {
      const completeData = {
        status: 'Completed',
        progressRate: 100
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', authToken)
        .send(completeData)
        .expect(200);

      expect(response.body.status).toBe('Completed');
      expect(response.body.progressRate).toBe(100);
    });

    it('should soft delete the project', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.message).toContain('deleted');
    });

    it('should not find the deleted project in active list', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', authToken)
        .expect(200);

      const deletedProject = response.body.projects.find(
        (p: any) => p.id === testProjectId
      );
      expect(deletedProject).toBeUndefined();
    });

    it('should restore the deleted project', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${testProjectId}/restore`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.id).toBe(testProjectId);
      expect(response.body).not.toHaveProperty('deletedAt');
    });

    it('should find the restored project', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.id).toBe(testProjectId);
      expect(response.body).not.toHaveProperty('deletedAt');
    });
  });

  describe('Project Validation', () => {
    it('should reject project creation without required fields', async () => {
      const invalidProject = {
        description: 'Missing name'
      };

      await request(app)
        .post('/api/v1/projects')
        .set('Authorization', authToken)
        .send(invalidProject)
        .expect(400);
    });

    it('should reject invalid progress rate', async () => {
      const invalidUpdate = {
        progressRate: 150 // > 100
      };

      await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', authToken)
        .send(invalidUpdate)
        .expect(400);
    });

    it('should reject negative progress rate', async () => {
      const invalidUpdate = {
        progressRate: -10
      };

      await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', authToken)
        .send(invalidUpdate)
        .expect(400);
    });
  });

  describe('Authorization', () => {
    it('should reject requests without authentication token', async () => {
      await request(app)
        .get('/api/v1/projects')
        .expect(401);
    });

    it('should reject project access by non-owner', async () => {
      const otherUserToken = 'Bearer other-user-token';

      await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', otherUserToken)
        .send({ name: 'Unauthorized update' })
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent project', async () => {
      await request(app)
        .get('/api/v1/projects/non-existent-id')
        .set('Authorization', authToken)
        .expect(404);
    });

    it('should handle malformed project IDs gracefully', async () => {
      await request(app)
        .get('/api/v1/projects/invalid@id#format')
        .set('Authorization', authToken)
        .expect(400);
    });
  });
});