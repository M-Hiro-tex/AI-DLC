/**
 * Project Repository Tests
 */

import { ProjectRepository } from '../../src/repositories/project.repository';
import { ProjectEntity } from '../../src/db/schema';
import * as connection from '../../src/db/connection';

// Mock DynamoDB client
jest.mock('../../src/db/connection');

describe('ProjectRepository', () => {
  let repository: ProjectRepository;
  let mockSend: jest.Mock;

  beforeEach(() => {
    repository = new ProjectRepository();
    mockSend = jest.fn();
    (connection.dynamoDbClient.send as jest.Mock) = mockSend;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should return project when found', async () => {
      const mockProject: ProjectEntity = {
        PK: 'PROJECT#123',
        SK: 'METADATA',
        EntityType: 'Project',
        id: '123',
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'user-1',
        status: 'Draft',
        progressRate: 0,
        tags: [],
        sharedWith: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        GSI1PK: 'OWNER#user-1',
        GSI1SK: '2024-01-01T00:00:00Z',
      };

      mockSend.mockResolvedValueOnce({ Item: mockProject });

      const result = await repository.getById('123');

      expect(result).toEqual(mockProject);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: expect.any(String),
            Key: {
              PK: 'PROJECT#123',
              SK: 'METADATA',
            },
          }),
        })
      );
    });

    it('should return null when project not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const result = await repository.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listByOwner', () => {
    it('should return projects for owner', async () => {
      const mockProjects: ProjectEntity[] = [
        {
          PK: 'PROJECT#1',
          SK: 'METADATA',
          EntityType: 'Project',
          id: '1',
          name: 'Project 1',
          description: 'Description 1',
          ownerId: 'user-1',
          status: 'Active',
          progressRate: 50,
          tags: ['tag1'],
          sharedWith: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          GSI1PK: 'OWNER#user-1',
          GSI1SK: '2024-01-02T00:00:00Z',
        },
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockProjects,
        LastEvaluatedKey: undefined,
      });

      const result = await repository.listByOwner({ ownerId: 'user-1' });

      expect(result.projects).toEqual(mockProjects);
      expect(result.lastEvaluatedKey).toBeUndefined();
    });

    it('should filter out deleted projects when includeDeleted is false', async () => {
      const mockProjects: ProjectEntity[] = [
        {
          PK: 'PROJECT#1',
          SK: 'METADATA',
          EntityType: 'Project',
          id: '1',
          name: 'Active Project',
          description: 'Description',
          ownerId: 'user-1',
          status: 'Active',
          progressRate: 50,
          tags: [],
          sharedWith: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          GSI1PK: 'OWNER#user-1',
          GSI1SK: '2024-01-02T00:00:00Z',
        },
        {
          PK: 'PROJECT#2',
          SK: 'METADATA',
          EntityType: 'Project',
          id: '2',
          name: 'Deleted Project',
          description: 'Description',
          ownerId: 'user-1',
          status: 'Active',
          progressRate: 30,
          tags: [],
          sharedWith: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          deletedAt: '2024-01-03T00:00:00Z',
          GSI1PK: 'OWNER#user-1',
          GSI1SK: '2024-01-02T00:00:00Z',
        },
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockProjects,
      });

      const result = await repository.listByOwner({
        ownerId: 'user-1',
        includeDeleted: false,
      });

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].id).toBe('1');
    });
  });

  describe('create', () => {
    it('should create new project with generated ID', async () => {
      mockSend.mockResolvedValueOnce({});

      const input = {
        name: 'New Project',
        description: 'New Description',
        ownerId: 'user-1',
        tags: ['tag1', 'tag2'],
      };

      const result = await repository.create(input);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.description).toBe(input.description);
      expect(result.ownerId).toBe(input.ownerId);
      expect(result.status).toBe('Draft');
      expect(result.progressRate).toBe(0);
      expect(result.tags).toEqual(input.tags);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update project fields', async () => {
      const updatedProject: ProjectEntity = {
        PK: 'PROJECT#123',
        SK: 'METADATA',
        EntityType: 'Project',
        id: '123',
        name: 'Updated Name',
        description: 'Updated Description',
        ownerId: 'user-1',
        status: 'Active',
        progressRate: 75,
        tags: ['updated'],
        sharedWith: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
        GSI1PK: 'OWNER#user-1',
        GSI1SK: '2024-01-03T00:00:00Z',
      };

      mockSend.mockResolvedValueOnce({ Attributes: updatedProject });

      const result = await repository.update('123', {
        name: 'Updated Name',
        description: 'Updated Description',
        status: 'Active',
        progressRate: 75,
      });

      expect(result.name).toBe('Updated Name');
      expect(result.status).toBe('Active');
      expect(result.progressRate).toBe(75);
    });
  });

  describe('delete', () => {
    it('should soft delete project', async () => {
      const deletedProject: ProjectEntity = {
        PK: 'PROJECT#123',
        SK: 'METADATA',
        EntityType: 'Project',
        id: '123',
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'user-1',
        status: 'Active',
        progressRate: 50,
        tags: [],
        sharedWith: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
        deletedAt: '2024-01-03T00:00:00Z',
        GSI1PK: 'OWNER#user-1',
        GSI1SK: '2024-01-03T00:00:00Z',
      };

      mockSend.mockResolvedValueOnce({ Attributes: deletedProject });

      const result = await repository.delete('123');

      expect(result.deletedAt).toBeDefined();
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('should restore deleted project', async () => {
      const restoredProject: ProjectEntity = {
        PK: 'PROJECT#123',
        SK: 'METADATA',
        EntityType: 'Project',
        id: '123',
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'user-1',
        status: 'Active',
        progressRate: 50,
        tags: [],
        sharedWith: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
        GSI1PK: 'OWNER#user-1',
        GSI1SK: '2024-01-03T00:00:00Z',
      };

      mockSend.mockResolvedValueOnce({ Attributes: restoredProject });

      const result = await repository.restore('123');

      expect(result.deletedAt).toBeUndefined();
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('share', () => {
    it('should share project with users', async () => {
      const sharedProject: ProjectEntity = {
        PK: 'PROJECT#123',
        SK: 'METADATA',
        EntityType: 'Project',
        id: '123',
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'user-1',
        status: 'Active',
        progressRate: 50,
        tags: [],
        sharedWith: ['user-2', 'user-3'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
        GSI1PK: 'OWNER#user-1',
        GSI1SK: '2024-01-03T00:00:00Z',
      };

      mockSend.mockResolvedValueOnce({ Attributes: sharedProject });

      const result = await repository.share('123', ['user-2', 'user-3']);

      expect(result.sharedWith).toEqual(['user-2', 'user-3']);
      expect(mockSend).toHaveBeenCalled();
    });
  });
});