/**
 * Project Repository
 * 
 * Handles all DynamoDB operations for Project entities
 * Uses Single-Table Design with GSI for efficient queries
 */

import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDbClient, tableName } from '../db/connection';
import { ProjectEntity, ProjectStatus, KeyPatterns } from '../db/schema';

export interface CreateProjectInput {
  name: string;
  description: string;
  ownerId: string;
  tags?: string[];
  templateId?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  progressRate?: number;
  tags?: string[];
}

export interface ListProjectsOptions {
  ownerId: string;
  includeDeleted?: boolean;
  limit?: number;
  lastEvaluatedKey?: Record<string, unknown>;
}

export interface ListProjectsResult {
  projects: ProjectEntity[];
  lastEvaluatedKey?: Record<string, unknown>;
}

export class ProjectRepository {
  /**
   * Get project by ID
   */
  async getById(projectId: string): Promise<ProjectEntity | null> {
    const command = new GetCommand({
      TableName: tableName,
      Key: {
        PK: KeyPatterns.projectPK(projectId),
        SK: KeyPatterns.projectSK(),
      },
    });

    const result = await dynamoDbClient.send(command);
    return (result.Item as ProjectEntity) || null;
  }

  /**
   * List projects by owner with pagination
   * Uses GSI1 (OwnerIndex) for efficient querying
   */
  async listByOwner(options: ListProjectsOptions): Promise<ListProjectsResult> {
    const { ownerId, includeDeleted = false, limit = 20, lastEvaluatedKey } = options;

    const command = new QueryCommand({
      TableName: tableName,
      IndexName: 'OwnerIndex',
      KeyConditionExpression: 'GSI1PK = :ownerPK',
      ExpressionAttributeValues: {
        ':ownerPK': KeyPatterns.projectGSI1PK(ownerId),
      },
      ScanIndexForward: false, // Sort by updatedAt descending (most recent first)
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const result = await dynamoDbClient.send(command);
    let projects = (result.Items as ProjectEntity[]) || [];

    // Filter out deleted projects if includeDeleted is false
    if (!includeDeleted) {
      projects = projects.filter((p) => !p.deletedAt);
    }

    return {
      projects,
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  /**
   * Create new project
   */
  async create(input: CreateProjectInput): Promise<ProjectEntity> {
    const projectId = uuidv4();
    const now = new Date().toISOString();

    const project: ProjectEntity = {
      PK: KeyPatterns.projectPK(projectId),
      SK: KeyPatterns.projectSK(),
      EntityType: 'Project',
      id: projectId,
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
      status: 'Draft',
      progressRate: 0,
      tags: input.tags || [],
      sharedWith: [],
      templateId: input.templateId,
      createdAt: now,
      updatedAt: now,
      // GSI1 keys for OwnerIndex
      GSI1PK: KeyPatterns.projectGSI1PK(input.ownerId),
      GSI1SK: KeyPatterns.projectGSI1SK(now),
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: project,
    });

    await dynamoDbClient.send(command);
    return project;
  }

  /**
   * Update project
   */
  async update(projectId: string, input: UpdateProjectInput): Promise<ProjectEntity> {
    const now = new Date().toISOString();

    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    // Always update updatedAt and GSI1SK (for proper sorting)
    updateExpressions.push('#updatedAt = :updatedAt');
    updateExpressions.push('#gsi1sk = :gsi1sk');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeNames['#gsi1sk'] = 'GSI1SK';
    expressionAttributeValues[':updatedAt'] = now;
    expressionAttributeValues[':gsi1sk'] = now;

    // Add optional fields if provided
    if (input.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = input.name;
    }

    if (input.description !== undefined) {
      updateExpressions.push('#description = :description');
      expressionAttributeNames['#description'] = 'description';
      expressionAttributeValues[':description'] = input.description;
    }

    if (input.status !== undefined) {
      updateExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = input.status;
    }

    if (input.progressRate !== undefined) {
      updateExpressions.push('#progressRate = :progressRate');
      expressionAttributeNames['#progressRate'] = 'progressRate';
      expressionAttributeValues[':progressRate'] = input.progressRate;
    }

    if (input.tags !== undefined) {
      updateExpressions.push('#tags = :tags');
      expressionAttributeNames['#tags'] = 'tags';
      expressionAttributeValues[':tags'] = input.tags;
    }

    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: KeyPatterns.projectPK(projectId),
        SK: KeyPatterns.projectSK(),
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamoDbClient.send(command);
    return result.Attributes as ProjectEntity;
  }

  /**
   * Delete project (soft delete)
   */
  async delete(projectId: string): Promise<ProjectEntity> {
    const now = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: KeyPatterns.projectPK(projectId),
        SK: KeyPatterns.projectSK(),
      },
      UpdateExpression: 'SET deletedAt = :deletedAt, updatedAt = :updatedAt, #gsi1sk = :gsi1sk',
      ExpressionAttributeNames: {
        '#gsi1sk': 'GSI1SK',
      },
      ExpressionAttributeValues: {
        ':deletedAt': now,
        ':updatedAt': now,
        ':gsi1sk': now,
      },
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamoDbClient.send(command);
    return result.Attributes as ProjectEntity;
  }

  /**
   * Restore deleted project
   */
  async restore(projectId: string): Promise<ProjectEntity> {
    const now = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: KeyPatterns.projectPK(projectId),
        SK: KeyPatterns.projectSK(),
      },
      UpdateExpression: 'REMOVE deletedAt SET updatedAt = :updatedAt, #gsi1sk = :gsi1sk',
      ExpressionAttributeNames: {
        '#gsi1sk': 'GSI1SK',
      },
      ExpressionAttributeValues: {
        ':updatedAt': now,
        ':gsi1sk': now,
      },
      ConditionExpression: 'attribute_exists(deletedAt)',
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamoDbClient.send(command);
    return result.Attributes as ProjectEntity;
  }

  /**
   * Share project with users
   */
  async share(projectId: string, userIds: string[]): Promise<ProjectEntity> {
    const now = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: KeyPatterns.projectPK(projectId),
        SK: KeyPatterns.projectSK(),
      },
      UpdateExpression: 'SET sharedWith = :sharedWith, updatedAt = :updatedAt, #gsi1sk = :gsi1sk',
      ExpressionAttributeNames: {
        '#gsi1sk': 'GSI1SK',
      },
      ExpressionAttributeValues: {
        ':sharedWith': userIds,
        ':updatedAt': now,
        ':gsi1sk': now,
      },
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamoDbClient.send(command);
    return result.Attributes as ProjectEntity;
  }
}

// Export singleton instance
export const projectRepository = new ProjectRepository();