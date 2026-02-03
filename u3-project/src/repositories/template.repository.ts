/**
 * Template Repository
 * 
 * Handles all DynamoDB operations for Template entities
 * Templates are pre-defined project structures for learning
 */

import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDbClient, tableName } from '../db/connection';
import { TemplateEntity, TemplateCategory, KeyPatterns } from '../db/schema';

export interface ListTemplatesOptions {
  category?: TemplateCategory;
  limit?: number;
  lastEvaluatedKey?: Record<string, unknown>;
}

export interface ListTemplatesResult {
  templates: TemplateEntity[];
  lastEvaluatedKey?: Record<string, unknown>;
}

export class TemplateRepository {
  /**
   * Get template by ID
   */
  async getById(templateId: string): Promise<TemplateEntity | null> {
    const command = new GetCommand({
      TableName: tableName,
      Key: {
        PK: KeyPatterns.templatePK(templateId),
        SK: KeyPatterns.templateSK(),
      },
    });

    const result = await dynamoDbClient.send(command);
    const template = result.Item as TemplateEntity | undefined;

    // Only return active templates
    if (template && template.isActive) {
      return template;
    }

    return null;
  }

  /**
   * List all templates with optional filtering
   * Uses GSI2 (TemplateIndex) for efficient querying
   */
  async listTemplates(options: ListTemplatesOptions = {}): Promise<ListTemplatesResult> {
    const { category, limit = 50, lastEvaluatedKey } = options;

    let command: QueryCommand;

    if (category) {
      // Query by specific category
      command = new QueryCommand({
        TableName: tableName,
        IndexName: 'TemplateIndex',
        KeyConditionExpression: 'GSI2PK = :templatePK AND begins_with(GSI2SK, :category)',
        ExpressionAttributeValues: {
          ':templatePK': KeyPatterns.templateGSI2PK(),
          ':category': `${category}#`,
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      });
    } else {
      // Query all templates
      command = new QueryCommand({
        TableName: tableName,
        IndexName: 'TemplateIndex',
        KeyConditionExpression: 'GSI2PK = :templatePK',
        ExpressionAttributeValues: {
          ':templatePK': KeyPatterns.templateGSI2PK(),
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      });
    }

    const result = await dynamoDbClient.send(command);
    let templates = (result.Items as TemplateEntity[]) || [];

    // Filter to only active templates
    templates = templates.filter((t) => t.isActive);

    return {
      templates,
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  /**
   * List templates by category
   * Convenience method for category-specific queries
   */
  async listByCategory(category: TemplateCategory, limit = 50): Promise<TemplateEntity[]> {
    const result = await this.listTemplates({ category, limit });
    return result.templates;
  }

  /**
   * Search templates by tags
   * Note: This performs a scan, so use sparingly in production
   * For production, consider adding a GSI for tags or using a search service
   */
  async searchByTags(tags: string[]): Promise<TemplateEntity[]> {
    // For MVP, we'll fetch all templates and filter in-memory
    // In production, consider using a proper search index (OpenSearch, Algolia, etc.)
    const { templates } = await this.listTemplates({ limit: 100 });

    return templates.filter((template) => {
      // Check if template has any of the search tags
      return tags.some((searchTag) =>
        template.tags.some((templateTag) => templateTag.toLowerCase().includes(searchTag.toLowerCase()))
      );
    });
  }

  /**
   * Get templates by difficulty level
   */
  async getByDifficulty(
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced',
    limit = 20
  ): Promise<TemplateEntity[]> {
    // For MVP, fetch all and filter
    // In production, consider adding a GSI for difficulty
    const { templates } = await this.listTemplates({ limit: 100 });

    return templates.filter((t) => t.difficulty === difficulty).slice(0, limit);
  }

  /**
   * Get random template for suggestions
   * Useful for "Try this template" features
   */
  async getRandomTemplate(category?: TemplateCategory): Promise<TemplateEntity | null> {
    const { templates } = await this.listTemplates({ category, limit: 50 });

    if (templates.length === 0) {
      return null;
    }

    // Return random template
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }
}

// Export singleton instance
export const templateRepository = new TemplateRepository();