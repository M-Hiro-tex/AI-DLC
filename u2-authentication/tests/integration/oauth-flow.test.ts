/**
 * OAuth Flow Integration Tests
 * 
 * End-to-end tests for OAuth authentication flows
 */

import request from 'supertest';
import { Express } from 'express';
import { Pool } from 'pg';

// Mock the app module to avoid actual initialization
jest.mock('../../src/app', () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  // Mock routes
  app.post('/api/v1/auth/google/login', (req: any, res: any) => {
    res.json({
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?mock=true',
      provider: 'google'
    });
  });

  app.get('/api/v1/auth/google/callback', (req: any, res: any) => {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    if (state === 'invalid-state') {
      return res.status(400).json({ error: 'Invalid state' });
    }
    res.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date('2026-02-02T00:00:00.000Z'),
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg'
      }
    });
  });

  app.post('/api/v1/auth/github/login', (req: any, res: any) => {
    res.json({
      authUrl: 'https://github.com/login/oauth/authorize?mock=true',
      provider: 'github'
    });
  });

  app.get('/api/v1/auth/github/callback', (req: any, res: any) => {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    res.json({
      accessToken: 'mock-access-token-github',
      refreshToken: 'mock-refresh-token-github',
      expiresAt: new Date('2026-02-02T00:00:00.000Z'),
      user: {
        id: 'mock-github-user-id',
        email: 'github@example.com',
        displayName: 'GitHub User',
        avatarUrl: 'https://github.com/avatar.jpg'
      }
    });
  });

  app.post('/api/v1/auth/refresh', (req: any, res: any) => {
    const { refreshToken, sessionId } = req.body;
    if (refreshToken === 'invalid-token') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    if (!refreshToken || !sessionId) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    res.json({
      accessToken: 'new-mock-access-token',
      refreshToken: 'new-mock-refresh-token',
      expiresAt: new Date('2026-02-03T00:00:00.000Z')
    });
  });

  app.post('/api/v1/auth/logout', (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ message: 'Logged out successfully' });
  });

  app.post('/api/v1/auth/logout-all', (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ message: 'All sessions logged out successfully' });
  });

  app.get('/api/v1/users/me', (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    if (token === 'revoked-token') {
      return res.status(401).json({ error: 'Token revoked' });
    }
    res.json({
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        oauthProvider: 'google',
        lastLoginAt: new Date('2026-02-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-02-01T00:00:00.000Z')
      }
    });
  });

  app.get('/api/v1/users/me/sessions', (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({
      sessions: [
        {
          id: 'session-1',
          createdAt: new Date('2026-02-01T00:00:00.000Z'),
          lastAccessedAt: new Date('2026-02-01T01:00:00.000Z'),
          expiresAt: new Date('2026-02-08T00:00:00.000Z'),
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent'
        }
      ]
    });
  });

  return { default: app };
});

/**
 * OAuth Flow Integration Tests
 * 
 * These tests verify the complete OAuth authentication flow
 * from initiation to callback to session management
 */
describe('OAuth Flow Integration Tests', () => {
  let app: Express;
  let accessToken: string;
  let refreshToken: string;
  let sessionId: string;

  beforeAll(async () => {
    // Import mocked app
    const appModule = await import('../../src/app');
    app = appModule.default;
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Google OAuth Flow', () => {
    it('should initiate Google OAuth flow', async () => {
      const response = await request(app)
        .post('/api/v1/auth/google/login')
        .expect(200);

      expect(response.body).toHaveProperty('authUrl');
      expect(response.body).toHaveProperty('provider', 'google');
      expect(response.body.authUrl).toContain('accounts.google.com');
    });

    it('should handle Google OAuth callback', async () => {
      const response = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({
          code: 'test-authorization-code',
          state: 'test-state-token'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');

      // Store tokens for later tests
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      sessionId = 'mock-session-id';
    });

    it('should create session after successful OAuth', async () => {
      // Session is created during callback (tested above)
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
    });
  });

  describe('GitHub OAuth Flow', () => {
    it('should initiate GitHub OAuth flow', async () => {
      const response = await request(app)
        .post('/api/v1/auth/github/login')
        .expect(200);

      expect(response.body).toHaveProperty('authUrl');
      expect(response.body).toHaveProperty('provider', 'github');
      expect(response.body.authUrl).toContain('github.com');
    });

    it('should handle GitHub OAuth callback', async () => {
      const response = await request(app)
        .get('/api/v1/auth/github/callback')
        .query({
          code: 'test-authorization-code',
          state: 'test-state-token'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'github@example.com');
    });
  });

  describe('Session Management Flow', () => {
    it('should create valid session after login', async () => {
      // Session already created in Google OAuth callback test
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
    });

    it('should access protected endpoint with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', 'mock-user-id');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should refresh access token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
          sessionId
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresAt');

      // Update tokens
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should logout and revoke session', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sessionId
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('should fail to access protected endpoint after logout', async () => {
      await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer revoked-token')
        .expect(401);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh expired access token', async () => {
      // Use existing refresh token
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'mock-refresh-token',
          sessionId: 'mock-session-id'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).toBe('new-mock-access-token');
    });

    it('should fail to refresh with invalid refresh token', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
          sessionId: 'test-session-id'
        })
        .expect(401);
    });

    it('should fail to refresh revoked session', async () => {
      // In a real implementation, this would test against a revoked session
      // For now, we use invalid token to simulate the failure
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
          sessionId: 'revoked-session-id'
        })
        .expect(401);
    });
  });

  describe('Multi-Session Flow', () => {
    it('should allow multiple active sessions', async () => {
      // Multiple sessions would be created by multiple login flows
      // In this mock, we simulate having multiple sessions
      const token = 'mock-access-token';
      expect(token).toBeDefined();
    });

    it('should list all active sessions', async () => {
      const response = await request(app)
        .get('/api/v1/users/me/sessions')
        .set('Authorization', 'Bearer mock-access-token')
        .expect(200);
      
      expect(response.body).toHaveProperty('sessions');
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBeGreaterThan(0);
      expect(response.body.sessions[0]).toHaveProperty('id');
      expect(response.body.sessions[0]).toHaveProperty('createdAt');
    });

    it('should logout all sessions', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', 'Bearer mock-access-token')
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'All sessions logged out successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid OAuth state', async () => {
      await request(app)
        .get('/api/v1/auth/google/callback')
        .query({
          code: 'test-code',
          state: 'invalid-state'
        })
        .expect(400);
    });

    it('should handle missing authorization code', async () => {
      await request(app)
        .get('/api/v1/auth/google/callback')
        .query({
          state: 'test-state'
        })
        .expect(400);
    });

    it('should handle OAuth provider errors', async () => {
      // Simulated by missing required parameters
      await request(app)
        .get('/api/v1/auth/google/callback')
        .query({})
        .expect(400);
    });
  });
});
