import axios from 'axios';

describe('Smoke Tests - Health Check', () => {
  const API_URL = process.env.API_URL || 'http://localhost:3000';

  it('should return 200 OK from health endpoint', async () => {
    const response = await axios.get(`${API_URL}/health`);
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status');
    expect(response.data.status).toBe('healthy');
  });

  it('should have database connectivity', async () => {
    const response = await axios.get(`${API_URL}/health`);
    
    expect(response.data).toHaveProperty('database');
    expect(response.data.database).toBe('connected');
  });

  it('should respond within acceptable time', async () => {
    const start = Date.now();
    await axios.get(`${API_URL}/health`);
    const duration = Date.now() - start;
    
    // Health check should respond within 1 second
    expect(duration).toBeLessThan(1000);
  });
});