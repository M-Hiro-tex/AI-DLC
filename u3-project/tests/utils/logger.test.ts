import { logger, logError, logRequest, logResponse, logOperation } from '../../src/utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logger instance', () => {
    it('should be defined', () => {
      expect(logger).toBeDefined();
    });

    it('should have correct service name', () => {
      expect(logger).toHaveProperty('serviceName');
    });
  });

  describe('logRequest', () => {
    it('should log request details', () => {
      const spy = jest.spyOn(logger, 'info');
      
      logRequest('GET', '/api/v1/projects', 'user-123');
      
      expect(spy).toHaveBeenCalledWith('Incoming request', {
        http: {
          method: 'GET',
          path: '/api/v1/projects'
        },
        userId: 'user-123'
      });
    });

    it('should log request without userId', () => {
      const spy = jest.spyOn(logger, 'info');
      
      logRequest('POST', '/api/v1/projects');
      
      expect(spy).toHaveBeenCalledWith('Incoming request', {
        http: {
          method: 'POST',
          path: '/api/v1/projects'
        },
        userId: undefined
      });
    });
  });

  describe('logResponse', () => {
    it('should log response details', () => {
      const spy = jest.spyOn(logger, 'info');
      
      logResponse('GET', '/api/v1/projects', 200, 150, 'user-123');
      
      expect(spy).toHaveBeenCalledWith('Response sent', {
        http: {
          method: 'GET',
          path: '/api/v1/projects',
          statusCode: 200
        },
        duration: 150,
        userId: 'user-123'
      });
    });
  });

  describe('logError', () => {
    it('should log error with stack trace', () => {
      const spy = jest.spyOn(logger, 'error');
      const error = new Error('Test error');
      
      logError(error);
      
      expect(spy).toHaveBeenCalledWith('Error occurred', expect.objectContaining({
        error: expect.objectContaining({
          name: 'Error',
          message: 'Test error',
          stack: expect.any(String)
        })
      }));
    });

    it('should log error with context', () => {
      const spy = jest.spyOn(logger, 'error');
      const error = new Error('Test error');
      const context = { userId: 'user-123', action: 'create' };
      
      logError(error, context);
      
      expect(spy).toHaveBeenCalledWith('Error occurred', expect.objectContaining({
        error: expect.any(Object),
        userId: 'user-123',
        action: 'create'
      }));
    });
  });

  describe('logOperation', () => {
    it('should log successful operation', () => {
      const spy = jest.spyOn(logger, 'info');
      
      logOperation('create', 'project', 'proj-123', 'user-123', true);
      
      expect(spy).toHaveBeenCalledWith('Business operation', {
        operation: 'create',
        resource: 'project',
        resourceId: 'proj-123',
        userId: 'user-123',
        success: true
      });
    });

    it('should log failed operation', () => {
      const spy = jest.spyOn(logger, 'info');
      
      logOperation('delete', 'project', 'proj-123', 'user-123', false, {
        reason: 'Not found'
      });
      
      expect(spy).toHaveBeenCalledWith('Business operation', expect.objectContaining({
        operation: 'delete',
        resource: 'project',
        resourceId: 'proj-123',
        userId: 'user-123',
        success: false,
        reason: 'Not found'
      }));
    });
  });
});