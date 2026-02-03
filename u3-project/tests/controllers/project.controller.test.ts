import { Request, Response, NextFunction } from 'express';
import { ProjectController } from '../../src/controllers/project.controller';
import { ProjectService } from '../../src/services/project.service';
import { TemplateService } from '../../src/services/template.service';

// Mock services
jest.mock('../../src/services/project.service');
jest.mock('../../src/services/template.service');
jest.mock('../../src/utils/logger');

describe('ProjectController', () => {
  let projectController: ProjectController;
  let mockProjectService: jest.Mocked<ProjectService>;
  let mockTemplateService: jest.Mocked<TemplateService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockUserId = 'user-123';
  const mockProjectId = 'project-456';

  beforeEach(() => {
    mockProjectService = new ProjectService({} as any) as jest.Mocked<ProjectService>;
    mockTemplateService = new TemplateService({} as any, {} as any) as jest.Mocked<TemplateService>;
    projectController = new ProjectController(mockProjectService, mockTemplateService);

    mockRequest = {
      user: { id: mockUserId },
      params: {},
      query: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const createData = {
        name: 'Test Project',
        description: 'Test Description',
        tags: ['test'],
      };

      const createdProject = {
        id: mockProjectId,
        ...createData,
        ownerId: mockUserId,
        status: 'Draft' as const,
        progressRate: 0,
        sharedWith: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRequest.body = createData;
      mockProjectService.createProject = jest.fn().mockResolvedValue(createdProject);

      await projectController.createProject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockProjectService.createProject).toHaveBeenCalledWith({
        ...createData,
        ownerId: mockUserId,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: createdProject,
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await projectController.createProject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle validation errors', async () => {
      mockRequest.body = { name: '' }; // Invalid name

      await projectController.createProject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getProject', () => {
    it('should get a project successfully', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        ownerId: mockUserId,
        status: 'Active' as const,
        progressRate: 50,
        sharedWith: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRequest.params = { id: mockProjectId };
      mockProjectService.getProject = jest.fn().mockResolvedValue(mockProject);

      await projectController.getProject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockProjectService.getProject).toHaveBeenCalledWith(mockProjectId, mockUserId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockProject,
      });
    });

    it('should return 404 if project not found', async () => {
      mockRequest.params = { id: mockProjectId };
      mockProjectService.getProject = jest.fn().mockResolvedValue(null);

      await projectController.getProject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Project not found' });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await projectController.getProject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe('listProjects', () => {
    it('should list projects successfully', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          ownerId: mockUserId,
          status: 'Active' as const,
          progressRate: 30,
          sharedWith: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockRequest.query = { limit: '20' };
      mockProjectService.listProjects = jest.fn().mockResolvedValue({
        items: mockProjects,
        lastEvaluatedKey: undefined,
      });

      await projectController.listProjects(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should apply filters when provided', async () => {
      mockRequest.query = {
        status: 'Active',
        tags: 'learning,typescript',
        limit: '50',
      };

      mockProjectService.listProjects = jest.fn().mockResolvedValue({
        items: [],
        lastEvaluatedKey: undefined,
      });

      await projectController.listProjects(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockProjectService.listProjects).toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    it('should update a project successfully', async () => {
      const updateData = {
        name: 'Updated Project',
        progressRate: 75,
      };

      const updatedProject = {
        id: mockProjectId,
        ...updateData,
        ownerId: mockUserId,
        status: 'Active' as const,
        sharedWith: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRequest.params = { id: mockProjectId };
      mockRequest.body = updateData;
      mockProjectService.updateProject = jest.fn().mockResolvedValue(updatedProject);

      await projectController.updateProject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockProjectService.updateProject).toHaveBeenCalledWith(
        mockProjectId,
        mockUserId,
        updateData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedProject,
      });
    });

    it('should reject empty update', async () => {
      mockRequest.params = { id: mockProjectId };
      mockRequest.body = {};

      await projectController.updateProject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('deleteProject', () => {
    it('should delete a project successfully', async () => {
      mockRequest.params = { id: mockProjectId };
      mockProjectService.deleteProject = jest.fn().mockResolvedValue(undefined);

      await projectController.deleteProject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockProjectService.deleteProject).toHaveBeenCalledWith(mockProjectId, mockUserId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Project deleted successfully',
      });
    });
  });

  describe('shareProject', () => {
    it('should share a project successfully', async () => {
      const shareData = {
        userIds: ['user-789', 'user-101'],
      };

      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        ownerId: mockUserId,
        status: 'Active' as const,
        progressRate: 50,
        sharedWith: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRequest.params = { id: mockProjectId };
      mockRequest.body = shareData;
      mockProjectService.getProject = jest.fn().mockResolvedValue(mockProject);
      mockProjectService.updateProject = jest.fn().mockResolvedValue({
        ...mockProject,
        sharedWith: shareData.userIds,
      });

      await projectController.shareProject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 if user is not the owner', async () => {
      const mockProject = {
        id: mockProjectId,
        name: 'Test Project',
        ownerId: 'other-user',
        status: 'Active' as const,
        progressRate: 50,
        sharedWith: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRequest.params = { id: mockProjectId };
      mockRequest.body = { userIds: ['user-789'] };
      mockProjectService.getProject = jest.fn().mockResolvedValue(mockProject);

      await projectController.shareProject(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('createFromTemplate', () => {
    it('should create a project from template successfully', async () => {
      const templateData = {
        templateId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'My Project from Template',
      };

      const createdProject = {
        id: mockProjectId,
        name: templateData.name,
        ownerId: mockUserId,
        status: 'Draft' as const,
        progressRate: 0,
        sharedWith: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRequest.body = templateData;
      mockTemplateService.instantiateTemplate = jest.fn().mockResolvedValue(createdProject);

      await projectController.createFromTemplate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockTemplateService.instantiateTemplate).toHaveBeenCalledWith(
        templateData.templateId,
        mockUserId,
        {
          name: templateData.name,
          description: undefined,
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });
});
