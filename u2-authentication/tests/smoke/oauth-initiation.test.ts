import axios from 'axios';

describe('Smoke Tests - OAuth Initiation', () => {
  const API_URL = process.env.API_URL || 'http://localhost:3000';

  describe('Google OAuth', () => {
    it('should generate Google OAuth URL', async () => {
      const response = await axios.post(`${API_URL}/api/v1/auth/google/login`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('authUrl');
      expect(response.data).toHaveProperty('state');
      expect(response.data).toHaveProperty('provider', 'google');
      expect(response.data.authUrl).toContain('accounts.google.com');
    });

    it('should include required OAuth parameters', async () => {
      const response = await axios.post(`${API_URL}/api/v1/auth/google/login`);
      const authUrl = new URL(response.data.authUrl);
      
      expect(authUrl.searchParams.has('client_id')).toBe(true);
      expect(authUrl.searchParams.has('redirect_uri')).toBe(true);
      expect(authUrl.searchParams.has('response_type')).toBe(true);
      expect(authUrl.searchParams.get('response_type')).toBe('code');
      expect(authUrl.searchParams.has('scope')).toBe(true);
      expect(authUrl.searchParams.has('state')).toBe(true);
    });
  });

  describe('GitHub OAuth', () => {
    it('should generate GitHub OAuth URL', async () => {
      const response = await axios.post(`${API_URL}/api/v1/auth/github/login`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('authUrl');
      expect(response.data).toHaveProperty('state');
      expect(response.data).toHaveProperty('provider', 'github');
      expect(response.data.authUrl).toContain('github.com');
    });

    it('should include required OAuth parameters', async () => {
      const response = await axios.post(`${API_URL}/api/v1/auth/github/login`);
      const authUrl = new URL(response.data.authUrl);
      
      expect(authUrl.searchParams.has('client_id')).toBe(true);
      expect(authUrl.searchParams.has('redirect_uri')).toBe(true);
      expect(authUrl.searchParams.has('scope')).toBe(true);
      expect(authUrl.searchParams.has('state')).toBe(true);
    });
  });

  describe('API Response Time', () => {
    it('should respond within acceptable time for OAuth initiation', async () => {
      const start = Date.now();
      await axios.post(`${API_URL}/api/v1/auth/google/login`);
      const duration = Date.now() - start;
      
      // OAuth URL generation should be fast (< 500ms)
      expect(duration).toBeLessThan(500);
    });
  });
});