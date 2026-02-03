/**
 * Template Repository Tests
 */

import { TemplateRepository } from '../../src/repositories/template.repository';
import { TemplateEntity } from '../../src/db/schema';
import * as connection from '../../src/db/connection';

// Mock DynamoDB client
jest.mock('../../src/db/connection');

describe('TemplateRepository', () => {
  let repository: TemplateRepository;
  let mockSend: jest.Mock;

  beforeEach(() => {
    repository = new TemplateRepository();
    mockSend = jest.fn();
    (connection.dynamoDbClient.send as jest.Mock) = mockSend;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should return active template when found', async () => {
      const mockTemplate: TemplateEntity = {
        PK: 'TEMPLATE#tpl-1',
        SK: 'METADATA',
        EntityType: 'Template',
        id: 'tpl-1',
        name: 'Simple REST API',
        description: 'Build a REST API',
        category: 'WebDevelopment',
        difficulty: 'Beginner',
        estimatedTime: '2 hours',
        tags: ['api', 'rest'],
        content: {
          specification: {
            title: 'REST API',
            description: 'Build a simple REST API',
            requirements: ['Create endpoints', 'Handle errors'],
          },
        },
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        GSI2PK: 'TEMPLATE',
        GSI2SK: 'WebDevelopment#Simple REST API',
      };

      mockSend.mockResolvedValueOnce({ Item: mockTemplate });

      const result = await repository.getById('tpl-1');

      expect(result).toEqual(mockTemplate);
    });

    it('should return null for inactive template', async () => {
      const inactiveTemplate: TemplateEntity = {
        PK: 'TEMPLATE#tpl-2',
        SK: 'METADATA',
        EntityType: 'Template',
        id: 'tpl-2',
        name: 'Inactive Template',
        description: 'Not active',
        category: 'WebDevelopment',
        difficulty: 'Beginner',
        estimatedTime: '1 hour',
        tags: [],
        content: {},
        isActive: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        GSI2PK: 'TEMPLATE',
        GSI2SK: 'WebDevelopment#Inactive Template',
      };

      mockSend.mockResolvedValueOnce({ Item: inactiveTemplate });

      const result = await repository.getById('tpl-2');

      expect(result).toBeNull();
    });

    it('should return null when template not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const result = await repository.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listTemplates', () => {
    it('should return all active templates', async () => {
      const mockTemplates: TemplateEntity[] = [
        {
          PK: 'TEMPLATE#tpl-1',
          SK: 'METADATA',
          EntityType: 'Template',
          id: 'tpl-1',
          name: 'Template 1',
          description: 'Description 1',
          category: 'WebDevelopment',
          difficulty: 'Beginner',
          estimatedTime: '1 hour',
          tags: ['tag1'],
          content: {},
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          GSI2PK: 'TEMPLATE',
          GSI2SK: 'WebDevelopment#Template 1',
        },
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockTemplates,
        LastEvaluatedKey: undefined,
      });

      const result = await repository.listTemplates();

      expect(result.templates).toEqual(mockTemplates);
      expect(result.lastEvaluatedKey).toBeUndefined();
    });

    it('should filter out inactive templates', async () => {
      const mockTemplates: TemplateEntity[] = [
        {
          PK: 'TEMPLATE#tpl-1',
          SK: 'METADATA',
          EntityType: 'Template',
          id: 'tpl-1',
          name: 'Active Template',
          description: 'Active',
          category: 'WebDevelopment',
          difficulty: 'Beginner',
          estimatedTime: '1 hour',
          tags: [],
          content: {},
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          GSI2PK: 'TEMPLATE',
          GSI2SK: 'WebDevelopment#Active Template',
        },
        {
          PK: 'TEMPLATE#tpl-2',
          SK: 'METADATA',
          EntityType: 'Template',
          id: 'tpl-2',
          name: 'Inactive Template',
          description: 'Inactive',
          category: 'WebDevelopment',
          difficulty: 'Beginner',
          estimatedTime: '1 hour',
          tags: [],
          content: {},
          isActive: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          GSI2PK: 'TEMPLATE',
          GSI2SK: 'WebDevelopment#Inactive Template',
        },
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockTemplates,
      });

      const result = await repository.listTemplates();

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].id).toBe('tpl-1');
    });

    it('should filter by category', async () => {
      const mockTemplates: TemplateEntity[] = [
        {
          PK: 'TEMPLATE#tpl-1',
          SK: 'METADATA',
          EntityType: 'Template',
          id: 'tpl-1',
          name: 'API Template',
          description: 'API',
          category: 'APIDesign',
          difficulty: 'Intermediate',
          estimatedTime: '3 hours',
          tags: ['api'],
          content: {},
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          GSI2PK: 'TEMPLATE',
          GSI2SK: 'APIDesign#API Template',
        },
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockTemplates,
      });

      const result = await repository.listTemplates({ category: 'APIDesign' });

      expect(result.templates[0].category).toBe('APIDesign');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            IndexName: 'TemplateIndex',
            KeyConditionExpression: expect.stringContaining('begins_with'),
          }),
        })
      );
    });
  });

  describe('listByCategory', () => {
    it('should return templates for specific category', async () => {
      const mockTemplates: TemplateEntity[] = [
        {
          PK: 'TEMPLATE#tpl-1',
          SK: 'METADATA',
          EntityType: 'Template',
          id: 'tpl-1',
          name: 'Testing Template',
          description: 'Testing',
          category: 'Testing',
          difficulty: 'Beginner',
          estimatedTime: '2 hours',
          tags: ['testing'],
          content: {},
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          GSI2PK: 'TEMPLATE',
          GSI2SK: 'Testing#Testing Template',
        },
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockTemplates,
      });

      const result = await repository.listByCategory('Testing');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Testing');
    });
  });

  describe('searchByTags', () => {
    it('should find templates matching tags', async () => {
      const mockTemplates: TemplateEntity[] = [
        {
          PK: 'TEMPLATE#tpl-1',
          SK: 'METADATA',
          EntityType: 'Template',
          id: 'tpl-1',
          name: 'REST API Template',
          description: 'REST',
          category: 'WebDevelopment',
          difficulty: 'Beginner',
          estimatedTime: '2 hours',
          tags: ['rest', 'api', 'nodejs'],
          content: {},
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          GSI2PK: 'TEMPLATE',
          GSI2SK: 'WebDevelopment#REST API Template',
        },
        {
          PK: 'TEMPLATE#tpl-2',
          SK: 'METADATA',
          EntityType: 'Template',
          id: 'tpl-2',
          name: 'GraphQL Template',
          description: 'GraphQL',
          category: 'WebDevelopment',
          difficulty: 'Intermediate',
          estimatedTime: '3 hours',
          tags: ['graphql', 'api'],
          content: {},
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          GSI2PK: 'TEMPLATE',
          GSI2SK: 'WebDevelopment#GraphQL Template',
        },
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockTemplates,
      });

      const result = await repository.searchByTags(['rest']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tpl-1');
    });
  });

  describe('getByDifficulty', () => {
    it('should return templates of specified difficulty', async () => {
      const mockTemplates: TemplateEntity[] = [
        {
          PK: 'TEMPLATE#tpl-1',
          SK: 'METADATA',
          EntityType: 'Template',
          id: 'tpl-1',
          name: 'Beginner Template',
          description: 'Easy',
          category: 'Tutorial',
          difficulty: 'Beginner',
          estimatedTime: '1 hour',
          tags: ['beginner'],
          content: {},
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          GSI2PK: 'TEMPLATE',
          GSI2SK: 'Tutorial#Beginner Template',
        },
        {
          PK: 'TEMPLATE#tpl-2',
          SK: 'METADATA',
          EntityType: 'Template',
          id: 'tpl-2',
          name: 'Advanced Template',
          description: 'Hard',
          category: 'Tutorial',
          difficulty: 'Advanced',
          estimatedTime: '5 hours',
          tags: ['advanced'],
          content: {},
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          GSI2PK: 'TEMPLATE',
          GSI2SK: 'Tutorial#Advanced Template',
        },
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockTemplates,
      });

      const result = await repository.getByDifficulty('Beginner');

      expect(result).toHaveLength(1);
      expect(result[0].difficulty).toBe('Beginner');
    });
  });

  describe('getRandomTemplate', () => {
    it('should return random template', async () => {
      const mockTemplates: TemplateEntity[] = [
        {
          PK: 'TEMPLATE#tpl-1',
          SK: 'METADATA',
          EntityType: 'Template',
          id: 'tpl-1',
          name: 'Template 1',
          description: 'Description 1',
          category: 'WebDevelopment',
          difficulty: 'Beginner',
          estimatedTime: '1 hour',
          tags: [],
          content: {},
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          GSI2PK: 'TEMPLATE',
          GSI2SK: 'WebDevelopment#Template 1',
        },
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockTemplates,
      });

      const result = await repository.getRandomTemplate();

      expect(result).toBeDefined();
      expect(result?.id).toBe('tpl-1');
    });

    it('should return null when no templates available', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [],
      });

      const result = await repository.getRandomTemplate();

      expect(result).toBeNull();
    });
  });
});