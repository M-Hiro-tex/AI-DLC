import request from 'supertest';
import { app } from '../../src/app';

/**
 * Smoke Test: Health Check
 * 
 * Basic smoke tests to verify deployment and service availability.
 * These tests should run immediately after deployment to ensure
 * the service is operational.
 */

describe('Health Check Smoke Tests', () => {
  describe('Service Health', () => {
    it('should return 200 OK for health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'u3-project');
    });

    it('should include uptime in health response', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should include environment information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('environment');
      expect(['development', 'staging', 'production']).toContain(
        response.body.environment
      );
    });

    it('should include version information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(typeof response.body.version).toBe('string');
    });
  });

  describe('API Routes Availability', () => {
    it('should have project routes available', async () => {
      // Test without authentication - should return 401
      await request(app)
        .get('/api/v1/projects')
        .expect(401);
    });

    it('should have template routes available', async () => {
      // Templates should be publicly accessible
      await request(app)
        .get('/api/v1/templates')
        .expect(200);
    });

    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/api/v1/non-existent')
        .expect(404);
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle OPTIONS preflight requests', async () => {
      await request(app)
        .options('/api/v1/projects')
        .expect(204);
    });
  });

  describe('Error Handling', () => {
    it('should return JSON error for invalid routes', async () => {
      const response = await request(app)
        .get('/invalid-route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return JSON error for method not allowed', async () => {
      const response = await request(app)
        .post('/health')
        .expect(404);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Response Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    });

    it('should include content-type header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Performance', () => {
    it('should respond to health check within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      // Health check should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle concurrent health check requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/health').expect(200)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('Database Connectivity', () => {
    it('should indicate database connection status in health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('dependencies');
      expect(response.body.dependencies).toHaveProperty('database');
      expect(['connected', 'disconnected', 'unknown']).toContain(
        response.body.dependencies.database
      );
    });
  });

  describe('Service Metadata', () => {
    it('should include service name', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.service).toBe('u3-project');
    });

    it('should include timestamp in ISO format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = response.body.timestamp;
      const date = new Date(timestamp);
      
      expect(date.toISOString()).toBe(timestamp);
    });
  });
});