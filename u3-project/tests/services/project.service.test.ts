import { ProjectService, CreateProjectInput, UpdateProjectInput } from '../../src/services/project.service';
import { ProjectRepository } from '../../src/repositories/project.repository';
import { ProjectEntity, ProjectStatus } from '../../src/db/schema';

// Mock ProjectRepository
jest.mock('../../src/repositories/project.repository');

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockProjectRepository: jest.Mocked<ProjectRepository>;

  beforeEach(() => {
    mockProjectRepository = new ProjectRepository() as jest.Mocked<ProjectRepository>;
    projectService = new ProjectService(mockProjectRepository);
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    const validInput: CreateProjectInput = {
      name: 'Test Project',
      description: 'Test Description',
      ownerId: 'user-123',
      tags: ['test', 'demo'],
    };

    const mockProjectEntity: ProjectEntity = {
      PK: 'PROJECT#project-123',
      SK: 'METADATA',
      EntityType: 'Project',
      id: 'project-123',
      name: 'Test Project',
      description: 'Test Description',
      ownerId: 'user-123',
      status: 'Draft',
      progressRate: 0,
      tags: ['test', 'demo'],
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      GSI1PK: 'OWNER#user-123',
      GSI1SK: new Date().toISOString(),
    };

    it('should create project successfully with valid input', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({ projects: [], lastEvaluatedKey: undefined });
      mockProjectRepository.create.mockResolvedValue(mockProjectEntity);

      const result = await projectService.createProject(validInput);

      expect(result.name).toBe('Test Project');
      expect(result.ownerId).toBe('user-123');
      expect(result.status).toBe('Draft');
      expect(mockProjectRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should reject project name less than 3 characters', async () => {
      const invalidInput = { ...validInput, name: 'AB' };

      await expect(projectService.createProject(invalidInput)).rejects.toThrow(
        'プロジェクト名は3文字以上である必要があります'
      );
    });

    it('should reject project name more than 100 characters', async () => {
      const invalidInput = { ...validInput, name: 'A'.repeat(101) };

      await expect(projectService.createProject(invalidInput)).rejects.toThrow(
        'プロジェクト名は100文字以下である必要があります'
      );
    });

    it('should reject project name with invalid characters', async () => {
      const invalidInput = { ...validInput, name: 'Test@Project!' };

      await expect(projectService.createProject(invalidInput)).rejects.toThrow(
        'プロジェクト名には英数字、スペース、ハイフン、アンダースコアのみ使用できます'
      );
    });

    it('should reject description longer than 1000 characters', async () => {
      const invalidInput = { ...validInput, description: 'A'.repeat(1001) };

      await expect(projectService.createProject(invalidInput)).rejects.toThrow(
        '説明は1000文字以下である必要があります'
      );
    });

    it('should reject more than 10 tags', async () => {
      const invalidInput = { 
        ...validInput, 
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10', 'tag11']
      };

      await expect(projectService.createProject(invalidInput)).rejects.toThrow(
        'タグは最大10個までです'
      );
    });

    it('should reject tag longer than 20 characters', async () => {
      const invalidInput = { ...validInput, tags: ['A'.repeat(21)] };

      await expect(projectService.createProject(invalidInput)).rejects.toThrow(
        '各タグは1-20文字である必要があります'
      );
    });

    it('should reject duplicate project name for same owner', async () => {
      const existingProject = { ...mockProjectEntity };
      mockProjectRepository.listByOwner.mockResolvedValue({ 
        projects: [existingProject], 
        lastEvaluatedKey: undefined 
      });

      await expect(projectService.createProject(validInput)).rejects.toThrow(
        'このプロジェクト名は既に使用されています。別の名前を選択してください。'
      );
    });
  });

  describe('updateProject', () => {
    const projectId = 'project-123';
    const currentUserId = 'user-123';

    const mockProjectEntity: ProjectEntity = {
      PK: 'PROJECT#project-123',
      SK: 'METADATA',
      EntityType: 'Project',
      id: projectId,
      name: 'Original Name',
      description: 'Original Description',
      ownerId: currentUserId,
      status: 'Draft',
      progressRate: 0,
      tags: ['test'],
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      GSI1PK: 'OWNER#user-123',
      GSI1SK: new Date().toISOString(),
    };

    it('should update project successfully', async () => {
      const updateInput: UpdateProjectInput = {
        name: 'Updated Name',
        description: 'Updated Description',
      };

      const updatedEntity = { ...mockProjectEntity, ...updateInput, updatedAt: new Date().toISOString() };

      mockProjectRepository.getById.mockResolvedValue(mockProjectEntity);
      mockProjectRepository.listByOwner.mockResolvedValue({ projects: [], lastEvaluatedKey: undefined });
      mockProjectRepository.update.mockResolvedValue(updatedEntity);

      const result = await projectService.updateProject(projectId, currentUserId, updateInput);

      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated Description');
      expect(mockProjectRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should reject update if project not found', async () => {
      mockProjectRepository.getById.mockResolvedValue(null);

      await expect(
        projectService.updateProject(projectId, currentUserId, { name: 'New Name' })
      ).rejects.toThrow('プロジェクトが見つかりません');
    });

    it('should reject update if user is not owner', async () => {
      mockProjectRepository.getById.mockResolvedValue(mockProjectEntity);

      await expect(
        projectService.updateProject(projectId, 'other-user', { name: 'New Name' })
      ).rejects.toThrow('このプロジェクトを編集する権限がありません');
    });

    it('should allow status transition from Draft to Active', async () => {
      const updateInput: UpdateProjectInput = { status: 'Active' };
      const updatedEntity = { ...mockProjectEntity, status: 'Active' as ProjectStatus };

      mockProjectRepository.getById.mockResolvedValue(mockProjectEntity);
      mockProjectRepository.update.mockResolvedValue(updatedEntity);

      const result = await projectService.updateProject(projectId, currentUserId, updateInput);

      expect(result.status).toBe('Active');
    });

    it('should reject status transition to Completed without specifications', async () => {
      const activeProject = { ...mockProjectEntity, status: 'Active' as ProjectStatus };
      const updateInput: UpdateProjectInput = { status: 'Completed' };

      mockProjectRepository.getById.mockResolvedValue(activeProject);

      await expect(
        projectService.updateProject(projectId, currentUserId, updateInput)
      ).rejects.toThrow('プロジェクトを完了するには、少なくとも1つの仕様が必要です');
    });
  });

  describe('deleteProject', () => {
    const projectId = 'project-123';
    const currentUserId = 'user-123';

    const mockProjectEntity: ProjectEntity = {
      PK: 'PROJECT#project-123',
      SK: 'METADATA',
      EntityType: 'Project',
      id: projectId,
      name: 'Test Project',
      description: 'Test Description',
      ownerId: currentUserId,
      status: 'Draft',
      progressRate: 0,
      tags: [],
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      GSI1PK: 'OWNER#user-123',
      GSI1SK: new Date().toISOString(),
    };

    it('should delete project successfully (soft delete)', async () => {
      const deletedEntity = { ...mockProjectEntity, deletedAt: new Date().toISOString() };

      mockProjectRepository.getById.mockResolvedValue(mockProjectEntity);
      mockProjectRepository.delete.mockResolvedValue(deletedEntity);

      await projectService.deleteProject(projectId, currentUserId);

      expect(mockProjectRepository.delete).toHaveBeenCalledWith(projectId);
    });

    it('should reject delete if project not found', async () => {
      mockProjectRepository.getById.mockResolvedValue(null);

      await expect(
        projectService.deleteProject(projectId, currentUserId)
      ).rejects.toThrow('プロジェクトが見つかりません');
    });

    it('should reject delete if user is not owner', async () => {
      mockProjectRepository.getById.mockResolvedValue(mockProjectEntity);

      await expect(
        projectService.deleteProject(projectId, 'other-user')
      ).rejects.toThrow('このプロジェクトを削除する権限がありません');
    });
  });

  describe('restoreProject', () => {
    const projectId = 'project-123';
    const currentUserId = 'user-123';

    const mockDeletedEntity: ProjectEntity = {
      PK: 'PROJECT#project-123',
      SK: 'METADATA',
      EntityType: 'Project',
      id: projectId,
      name: 'Deleted Project',
      description: 'Test Description',
      ownerId: currentUserId,
      status: 'Draft',
      progressRate: 0,
      tags: [],
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: new Date().toISOString(),
      GSI1PK: 'OWNER#user-123',
      GSI1SK: new Date().toISOString(),
    };

    it('should restore deleted project successfully', async () => {
      const restoredEntity = { ...mockDeletedEntity };
      delete restoredEntity.deletedAt;

      mockProjectRepository.getById.mockResolvedValue(mockDeletedEntity);
      mockProjectRepository.restore.mockResolvedValue(restoredEntity);

      const result = await projectService.restoreProject(projectId, currentUserId);

      expect(result.deletedAt).toBeUndefined();
      expect(mockProjectRepository.restore).toHaveBeenCalledWith(projectId);
    });

    it('should reject restore if project is not deleted', async () => {
      const activeEntity = { ...mockDeletedEntity };
      delete activeEntity.deletedAt;

      mockProjectRepository.getById.mockResolvedValue(activeEntity);

      await expect(
        projectService.restoreProject(projectId, currentUserId)
      ).rejects.toThrow('このプロジェクトは削除されていません');
    });
  });

  describe('getProject', () => {
    const projectId = 'project-123';
    const ownerId = 'user-123';

    const mockProjectEntity: ProjectEntity = {
      PK: 'PROJECT#project-123',
      SK: 'METADATA',
      EntityType: 'Project',
      id: projectId,
      name: 'Test Project',
      description: 'Test Description',
      ownerId,
      status: 'Draft',
      progressRate: 0,
      tags: [],
      sharedWith: ['user-456'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      GSI1PK: 'OWNER#user-123',
      GSI1SK: new Date().toISOString(),
    };

    it('should get project successfully for owner', async () => {
      mockProjectRepository.getById.mockResolvedValue(mockProjectEntity);

      const result = await projectService.getProject(projectId, ownerId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(projectId);
      expect(result?.name).toBe('Test Project');
    });

    it('should get project successfully for shared user', async () => {
      mockProjectRepository.getById.mockResolvedValue(mockProjectEntity);

      const result = await projectService.getProject(projectId, 'user-456');

      expect(result).not.toBeNull();
      expect(result?.id).toBe(projectId);
    });

    it('should return null if project not found', async () => {
      mockProjectRepository.getById.mockResolvedValue(null);

      const result = await projectService.getProject(projectId, ownerId);

      expect(result).toBeNull();
    });

    it('should reject access if user is not owner or shared with', async () => {
      mockProjectRepository.getById.mockResolvedValue(mockProjectEntity);

      await expect(
        projectService.getProject(projectId, 'other-user')
      ).rejects.toThrow('このプロジェクトにアクセスする権限がありません');
    });
  });

  describe('listProjects', () => {
    const ownerId = 'user-123';

    const mockProjects: ProjectEntity[] = [
      {
        PK: 'PROJECT#project-1',
        SK: 'METADATA',
        EntityType: 'Project',
        id: 'project-1',
        name: 'Project Alpha',
        description: 'Description 1',
        ownerId,
        status: 'Active',
        progressRate: 50,
        tags: ['tag1'],
        sharedWith: [],
        createdAt: new Date('2024-01-01').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString(),
        GSI1PK: 'OWNER#user-123',
        GSI1SK: new Date('2024-01-15').toISOString(),
      },
      {
        PK: 'PROJECT#project-2',
        SK: 'METADATA',
        EntityType: 'Project',
        id: 'project-2',
        name: 'Project Beta',
        description: 'Description 2',
        ownerId,
        status: 'Draft',
        progressRate: 0,
        tags: ['tag2'],
        sharedWith: [],
        createdAt: new Date('2024-01-02').toISOString(),
        updatedAt: new Date('2024-01-20').toISOString(),
        GSI1PK: 'OWNER#user-123',
        GSI1SK: new Date('2024-01-20').toISOString(),
      },
    ];

    it('should list all projects for user', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: mockProjects,
        lastEvaluatedKey: undefined,
      });

      const result = await projectService.listProjects(ownerId);

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter projects by name query', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: mockProjects,
        lastEvaluatedKey: undefined,
      });

      const result = await projectService.listProjects(ownerId, {
        nameQuery: 'Alpha',
        page: 1,
        pageSize: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Project Alpha');
    });

    it('should apply pagination correctly', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: mockProjects,
        lastEvaluatedKey: undefined,
      });

      const result = await projectService.listProjects(ownerId, {
        page: 1,
        pageSize: 1,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      expect(result.items).toHaveLength(1);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(false);
    });

    it('should enforce maximum page size of 100', async () => {
      mockProjectRepository.listByOwner.mockResolvedValue({
        projects: mockProjects,
        lastEvaluatedKey: undefined,
      });

      const result = await projectService.listProjects(ownerId, {
        page: 1,
        pageSize: 150, // Exceeds max
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      expect(result.pageSize).toBe(100);
    });
  });

  describe('shareProject', () => {
    const projectId = 'project-123';
    const ownerId = 'user-123';

    const mockProjectEntity: ProjectEntity = {
      PK: 'PROJECT#project-123',
      SK: 'METADATA',
      EntityType: 'Project',
      id: projectId,
      name: 'Test Project',
      description: 'Test Description',
      ownerId,
      status: 'Draft',
      progressRate: 0,
      tags: [],
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      GSI1PK: 'OWNER#user-123',
      GSI1SK: new Date().toISOString(),
    };

    it('should share project with users successfully', async () => {
      const sharedEntity = { ...mockProjectEntity, sharedWith: ['user-456', 'user-789'] };

      mockProjectRepository.getById.mockResolvedValue(mockProjectEntity);
      mockProjectRepository.share.mockResolvedValue(sharedEntity);

      const result = await projectService.shareProject(projectId, ownerId, ['user-456', 'user-789']);

      expect(result.sharedWith).toContain('user-456');
      expect(result.sharedWith).toContain('user-789');
      expect(mockProjectRepository.share).toHaveBeenCalledWith(projectId, ['user-456', 'user-789']);
    });

    it('should filter out owner from shared users (self-sharing prevention)', async () => {
      const sharedEntity = { ...mockProjectEntity, sharedWith: ['user-456'] };

      mockProjectRepository.getById.mockResolvedValue(mockProjectEntity);
      mockProjectRepository.share.mockResolvedValue(sharedEntity);

      await projectService.shareProject(projectId, ownerId, ['user-456', ownerId]);

      expect(mockProjectRepository.share).toHaveBeenCalledWith(projectId, ['user-456']);
    });

    it('should reject sharing if user is not owner', async () => {
      mockProjectRepository.getById.mockResolvedValue(mockProjectEntity);

      await expect(
        projectService.shareProject(projectId, 'other-user', ['user-456'])
      ).rejects.toThrow('このプロジェクトの共有設定を変更する権限がありません');
    });
  });
});