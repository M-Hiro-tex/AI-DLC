import { TemplateService, ListTemplatesQuery, InstantiateTemplateInput } from '../../src/services/template.service';
import { TemplateRepository } from '../../src/repositories/template.repository';
import { ProjectService } from '../../src/services/project.service';
import { TemplateEntity, TemplateCategory } from '../../src/db/schema';

// Mock dependencies
jest.mock('../../src/repositories/template.repository');
jest.mock('../../src/services/project.service');

describe('TemplateService', () => {
  let templateService: TemplateService;
  let mockTemplateRepository: jest.Mocked<TemplateRepository>;
  let mockProjectService: jest.Mocked<ProjectService>;

  beforeEach(() => {
    mockTemplateRepository = new TemplateRepository() as jest.Mocked<TemplateRepository>;
    mockProjectService = {} as jest.Mocked<ProjectService>;
    mockProjectService.createProject = jest.fn();
    
    templateService = new TemplateService(mockTemplateRepository, mockProjectService);
    jest.clearAllMocks();
  });

  const mockTemplates: TemplateEntity[] = [
    {
      PK: 'TEMPLATE#template-1',
      SK: 'METADATA',
      EntityType: 'Template',
      id: 'template-1',
      name: 'Simple Todo App',
      description: 'Basic todo list application',
      category: 'WebDevelopment' as TemplateCategory,
      difficulty: 'Beginner',
      estimatedTime: '30 minutes',
      tags: ['beginner', 'todo', 'web'],
      content: {
        specification: {
          title: 'Todo Application',
          description: 'Simple task management',
          requirements: ['Add tasks', 'Complete tasks', 'Delete tasks'],
        },
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      GSI2PK: 'TEMPLATE',
      GSI2SK: 'WebDevelopment#Simple Todo App',
    },
    {
      PK: 'TEMPLATE#template-2',
      SK: 'METADATA',
      EntityType: 'Template',
      id: 'template-2',
      name: 'REST API Design',
      description: 'Design a RESTful API',
      category: 'APIDesign' as TemplateCategory,
      difficulty: 'Intermediate',
      estimatedTime: '60 minutes',
      tags: ['api', 'rest', 'intermediate'],
      content: {
        codeHints: {
          language: 'typescript',
          framework: 'express',
          patterns: ['REST', 'CRUD'],
        },
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      GSI2PK: 'TEMPLATE',
      GSI2SK: 'APIDesign#REST API Design',
    },
  ];

  describe('listTemplates', () => {
    it('should list all active templates', async () => {
      mockTemplateRepository.listTemplates.mockResolvedValue({
        templates: mockTemplates,
        lastEvaluatedKey: undefined,
      });

      const result = await templateService.listTemplates();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Simple Todo App');
      expect(mockTemplateRepository.listTemplates).toHaveBeenCalledWith({ limit: 50 });
    });

    it('should filter templates by category', async () => {
      mockTemplateRepository.listTemplates.mockResolvedValue({
        templates: mockTemplates,
        lastEvaluatedKey: undefined,
      });

      const query: ListTemplatesQuery = {
        category: 'WebDevelopment',
      };

      const result = await templateService.listTemplates(query);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('WebDevelopment');
    });

    it('should filter templates by difficulty', async () => {
      mockTemplateRepository.listTemplates.mockResolvedValue({
        templates: mockTemplates,
        lastEvaluatedKey: undefined,
      });

      const query: ListTemplatesQuery = {
        difficulty: 'Beginner',
      };

      const result = await templateService.listTemplates(query);

      expect(result).toHaveLength(1);
      expect(result[0].difficulty).toBe('Beginner');
    });

    it('should filter templates by tags', async () => {
      mockTemplateRepository.listTemplates.mockResolvedValue({
        templates: mockTemplates,
        lastEvaluatedKey: undefined,
      });

      const query: ListTemplatesQuery = {
        tags: ['api'],
      };

      const result = await templateService.listTemplates(query);

      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('api');
    });

    it('should exclude inactive templates', async () => {
      const inactiveTemplate = { ...mockTemplates[0], isActive: false };
      mockTemplateRepository.listTemplates.mockResolvedValue({
        templates: [inactiveTemplate, mockTemplates[1]],
        lastEvaluatedKey: undefined,
      });

      const result = await templateService.listTemplates();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('template-2');
    });
  });

  describe('getTemplate', () => {
    it('should get template by ID successfully', async () => {
      mockTemplateRepository.getById.mockResolvedValue(mockTemplates[0]);

      const result = await templateService.getTemplate('template-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('template-1');
      expect(result?.name).toBe('Simple Todo App');
    });

    it('should return null if template not found', async () => {
      mockTemplateRepository.getById.mockResolvedValue(null);

      const result = await templateService.getTemplate('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if template is inactive', async () => {
      const inactiveTemplate = { ...mockTemplates[0], isActive: false };
      mockTemplateRepository.getById.mockResolvedValue(inactiveTemplate);

      const result = await templateService.getTemplate('template-1');

      expect(result).toBeNull();
    });
  });

  describe('instantiateTemplate', () => {
    const input: InstantiateTemplateInput = {
      templateId: 'template-1',
      projectName: 'My Todo App',
      projectDescription: 'My personal todo list',
      ownerId: 'user-123',
    };

    const mockProject = {
      id: 'project-123',
      name: 'My Todo App',
      description: 'My personal todo list',
      ownerId: 'user-123',
      status: 'Draft' as const,
      progressRate: 0,
      tags: ['beginner', 'todo', 'web'],
      sharedWith: [],
      templateId: 'template-1',
      specificationIds: [],
      generatedCodeIds: [],
      specificationChangeCount: 0,
      codeGenerationCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: 'WebDevelopment',
    };

    it('should instantiate template successfully', async () => {
      mockTemplateRepository.getById.mockResolvedValue(mockTemplates[0]);
      mockProjectService.createProject.mockResolvedValue(mockProject);

      const result = await templateService.instantiateTemplate(input);

      expect(result.project.id).toBe('project-123');
      expect(result.project.name).toBe('My Todo App');
      expect(result.project.templateId).toBe('template-1');
      expect(result.template.id).toBe('template-1');
      expect(mockProjectService.createProject).toHaveBeenCalledWith({
        name: input.projectName,
        description: input.projectDescription,
        ownerId: input.ownerId,
        tags: mockTemplates[0].tags,
        category: mockTemplates[0].category,
        templateId: mockTemplates[0].id,
      });
    });

    it('should use template description if project description not provided', async () => {
      const inputWithoutDesc = { ...input, projectDescription: undefined };
      mockTemplateRepository.getById.mockResolvedValue(mockTemplates[0]);
      mockProjectService.createProject.mockResolvedValue(mockProject);

      await templateService.instantiateTemplate(inputWithoutDesc);

      expect(mockProjectService.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          description: mockTemplates[0].description,
        })
      );
    });

    it('should reject if template not found', async () => {
      mockTemplateRepository.getById.mockResolvedValue(null);

      await expect(templateService.instantiateTemplate(input)).rejects.toThrow(
        'テンプレートが存在しないか、利用できません'
      );
    });

    it('should reject if template is inactive', async () => {
      const inactiveTemplate = { ...mockTemplates[0], isActive: false };
      mockTemplateRepository.getById.mockResolvedValue(inactiveTemplate);

      await expect(templateService.instantiateTemplate(input)).rejects.toThrow(
        'テンプレートが存在しないか、利用できません'
      );
    });
  });

  describe('getPopularTemplates', () => {
    it('should get popular templates with default limit', async () => {
      mockTemplateRepository.listTemplates.mockResolvedValue({
        templates: mockTemplates,
        lastEvaluatedKey: undefined,
      });

      const result = await templateService.getPopularTemplates();

      expect(result).toHaveLength(2);
      expect(mockTemplateRepository.listTemplates).toHaveBeenCalledWith({ limit: 10 });
    });

    it('should respect custom limit', async () => {
      mockTemplateRepository.listTemplates.mockResolvedValue({
        templates: mockTemplates,
        lastEvaluatedKey: undefined,
      });

      const result = await templateService.getPopularTemplates(5);

      expect(mockTemplateRepository.listTemplates).toHaveBeenCalledWith({ limit: 5 });
    });

    it('should slice results to limit', async () => {
      const manyTemplates = Array(20).fill(mockTemplates[0]).map((t, i) => ({
        ...t,
        id: `template-${i}`,
        PK: `TEMPLATE#template-${i}`,
      }));

      mockTemplateRepository.listTemplates.mockResolvedValue({
        templates: manyTemplates,
        lastEvaluatedKey: undefined,
      });

      const result = await templateService.getPopularTemplates(10);

      expect(result).toHaveLength(10);
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should get templates by specific category', async () => {
      mockTemplateRepository.listTemplates.mockResolvedValue({
        templates: [mockTemplates[0]],
        lastEvaluatedKey: undefined,
      });

      const result = await templateService.getTemplatesByCategory('WebDevelopment');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('WebDevelopment');
    });
  });

  describe('getBeginnerTemplates', () => {
    it('should get only beginner templates', async () => {
      mockTemplateRepository.listTemplates.mockResolvedValue({
        templates: mockTemplates,
        lastEvaluatedKey: undefined,
      });

      const result = await templateService.getBeginnerTemplates();

      expect(result).toHaveLength(1);
      expect(result[0].difficulty).toBe('Beginner');
    });
  });
});