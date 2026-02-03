import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  isOperationalError,
  errorToResponse,
  createValidationErrorFromZod,
  wrapError
} from '../../src/utils/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with correct properties', () => {
      const error = new AppError('Test error', 500, true, { key: 'value' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.context).toEqual({ key: 'value' });
      expect(error.name).toBe('AppError');
    });
  });

  describe('BadRequestError', () => {
    it('should create 400 error', () => {
      const error = new BadRequestError('Invalid input');
      
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create 401 error', () => {
      const error = new UnauthorizedError();
      
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });
  });

  describe('ForbiddenError', () => {
    it('should create 403 error', () => {
      const error = new ForbiddenError('Access denied');
      
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error with resource and ID', () => {
      const error = new NotFoundError('Project', 'proj-123');
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Project with ID \'proj-123\' not found');
      expect(error.context).toEqual({ resource: 'Project', resourceId: 'proj-123' });
    });

    it('should create 404 error without ID', () => {
      const error = new NotFoundError('Project');
      
      expect(error.message).toBe('Project not found');
    });
  });

  describe('ConflictError', () => {
    it('should create 409 error', () => {
      const error = new ConflictError('Resource already exists');
      
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource already exists');
    });
  });

  describe('ValidationError', () => {
    it('should create 422 error with validation errors', () => {
      const errors = [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Invalid email format', code: 'invalid_format' }
      ];
      
      const error = new ValidationError(errors);
      
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
    });
  });

  describe('isOperationalError', () => {
    it('should return true for operational errors', () => {
      const error = new BadRequestError();
      
      expect(isOperationalError(error)).toBe(true);
    });

    it('should return false for non-AppError', () => {
      const error = new Error('Generic error');
      
      expect(isOperationalError(error)).toBe(false);
    });
  });

  describe('errorToResponse', () => {
    it('should convert AppError to response format', () => {
      const error = new BadRequestError('Invalid input', { field: 'name' });
      
      const response = errorToResponse(error);
      
      expect(response).toEqual({
        error: 'BadRequestError',
        message: 'Invalid input',
        statusCode: 400
      });
    });

    it('should include validation errors', () => {
      const errors = [{ field: 'name', message: 'Required' }];
      const error = new ValidationError(errors);
      
      const response = errorToResponse(error);
      
      expect(response.errors).toEqual(errors);
    });
  });

  describe('createValidationErrorFromZod', () => {
    it('should convert Zod error to ValidationError', () => {
      const zodError = {
        errors: [
          { path: ['name'], message: 'Required', code: 'invalid_type' },
          { path: ['email'], message: 'Invalid email', code: 'invalid_string' }
        ]
      };
      
      const error = createValidationErrorFromZod(zodError);
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.errors).toHaveLength(2);
      expect(error.errors[0].field).toBe('name');
    });
  });

  describe('wrapError', () => {
    it('should return AppError as is', () => {
      const error = new BadRequestError();
      
      const wrapped = wrapError(error);
      
      expect(wrapped).toBe(error);
    });

    it('should wrap Error as InternalServerError', () => {
      const error = new Error('Generic error');
      
      const wrapped = wrapError(error);
      
      expect(wrapped.statusCode).toBe(500);
      expect(wrapped.message).toBe('Generic error');
    });

    it('should wrap unknown as InternalServerError', () => {
      const wrapped = wrapError('unknown');
      
      expect(wrapped.statusCode).toBe(500);
      expect(wrapped.message).toBe('An unknown error occurred');
    });
  });
});