import { Request, Response, NextFunction } from 'express';
import { TemplateController } from '../../src/controllers/template.controller';
import { TemplateService } from '../../src/services/template.service';

// Mock services
jest.mock('../../src/services/template.service');
jest.mock('../../src/utils/logger');

describe('TemplateController', () => {
  let templateController: TemplateController;
  let mockTemplateService: jest.Mocked<TemplateService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockUserId = 'user-123';
  const mockTemplateId = 'template-456';

  beforeEach(() => {
    mockTemplateService = new TemplateService({} as any, {} as any) as jest.Mocked<TemplateService>;
    templateController = new TemplateController(mockTemplateService);

    mockRequest = {
      user: { id: mockUserId },
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('listTemplates', () => {
    it('should list all templates successfully', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Basic Web App',
          description: 'A basic web application template',
          category: 'web',
          structure: {},
          createdAt: new Date().toISOString(),
        },
        {
          id: 'template-2',
          name: 'REST API',
          description: 'A REST API template',
          category: 'api',
          structure: {},
          createdAt: new Date().toISOString(),
        },
      ];

      mockTemplateService.listTemplates = jest.fn().mockResolvedValue(mockTemplates);

      await templateController.listTemplates(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTemplateService.listTemplates).toHaveBeenCalledWith(undefined);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTemplates,
      });
    });

    it('should filter templates by category', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Basic Web App',
          description: 'A basic web application template',
          category: 'web',
          structure: {},
          createdAt: new Date().toISOString(),
        },
      ];

      mockRequest.query = { category: 'web' };
      mockTemplateService.listTemplates = jest.fn().mockResolvedValue(mockTemplates);

      await templateController.listTemplates(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTemplateService.listTemplates).toHaveBeenCalledWith('web');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTemplates,
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await templateController.listTemplates(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockTemplateService.listTemplates = jest.fn().mockRejectedValue(error);

      await templateController.listTemplates(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getTemplate', () => {
    it('should get a template successfully', async () => {
      const mockTemplate = {
        id: mockTemplateId,
        name: 'Basic Web App',
        description: 'A basic web application template',
        category: 'web',
        structure: {
          folders: ['src', 'tests', 'docs'],
          files: ['README.md', 'package.json'],
        },
        createdAt: new Date().toISOString(),
      };

      mockRequest.params = { id: mockTemplateId };
      mockTemplateService.getTemplate = jest.fn().mockResolvedValue(mockTemplate);

      await templateController.getTemplate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTemplateService.getTemplate).toHaveBeenCalledWith(mockTemplateId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTemplate,
      });
    });

    it('should return 404 if template not found', async () => {
      mockRequest.params = { id: mockTemplateId };
      mockTemplateService.getTemplate = jest.fn().mockResolvedValue(null);

      await templateController.getTemplate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Template not found' });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await templateController.getTemplate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockRequest.params = { id: mockTemplateId };
      mockTemplateService.getTemplate = jest.fn().mockRejectedValue(error);

      await templateController.getTemplate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
