/**
 * DynamoDB Single-Table Design Schema
 * 
 * Table: ProjectDomain
 * - Main table for projects, templates, and related entities
 * - Uses Single-Table Design pattern for optimal performance
 * 
 * Indexes:
 * - GSI1: OwnerIndex - Query projects by owner
 * - GSI2: TemplateIndex - Query available templates
 */

export interface ProjectEntity {
  PK: string;                    // Partition Key: PROJECT#{uuid}
  SK: string;                    // Sort Key: METADATA
  EntityType: 'Project';
  id: string;                    // Project ID (uuid)
  name: string;                  // Project name
  description: string;           // Project description
  ownerId: string;               // User ID who owns the project
  status: ProjectStatus;         // Project status
  progressRate: number;          // Progress percentage (0-100)
  tags: string[];                // Project tags for categorization
  sharedWith: string[];          // User IDs with whom project is shared
  templateId?: string;           // Optional: Template used to create project
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  deletedAt?: string;            // Soft delete timestamp
  
  // GSI1 Keys for OwnerIndex
  GSI1PK: string;                // OWNER#{userId}
  GSI1SK: string;                // {updatedAt} (for sorting by recent)
  
  // GSI2 Keys (not used for projects, but included for schema consistency)
  GSI2PK?: string;
  GSI2SK?: string;
}

export interface TemplateEntity {
  PK: string;                    // Partition Key: TEMPLATE#{id}
  SK: string;                    // Sort Key: METADATA
  EntityType: 'Template';
  id: string;                    // Template ID
  name: string;                  // Template name
  description: string;           // Template description
  category: TemplateCategory;    // Template category
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;         // Estimated completion time
  tags: string[];                // Template tags
  content: TemplateContent;      // Template content structure
  isActive: boolean;             // Whether template is available
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  
  // GSI2 Keys for TemplateIndex
  GSI2PK: string;                // TEMPLATE
  GSI2SK: string;                // {category}#{name}
  
  // GSI1 Keys (not used for templates, but included for schema consistency)
  GSI1PK?: string;
  GSI1SK?: string;
}

export type ProjectStatus = 
  | 'Draft'      // Initial creation, not started
  | 'Active'     // Currently working on
  | 'Completed'  // Finished
  | 'Archived';  // Archived (but not deleted)

export type TemplateCategory = 
  | 'WebDevelopment'
  | 'APIDesign'
  | 'DataModeling'
  | 'Testing'
  | 'Documentation'
  | 'Tutorial';

export interface TemplateContent {
  // Specification template structure
  specification?: {
    title: string;
    description: string;
    requirements: string[];
    examples?: string[];
  };
  
  // Code generation hints
  codeHints?: {
    language: string;
    framework?: string;
    patterns: string[];
  };
  
  // Learning objectives
  objectives?: string[];
  
  // Resources
  resources?: {
    title: string;
    url: string;
    type: 'documentation' | 'tutorial' | 'example';
  }[];
}

// DynamoDB Table Configuration
export const TABLE_CONFIG = {
  tableName: process.env.DYNAMODB_TABLE_NAME || 'ProjectDomain',
  region: process.env.AWS_REGION || 'ap-northeast-1',
  
  // GSI Names
  gsi1Name: 'OwnerIndex',
  gsi2Name: 'TemplateIndex',
  
  // Key attributes
  partitionKey: 'PK',
  sortKey: 'SK',
  gsi1PartitionKey: 'GSI1PK',
  gsi1SortKey: 'GSI1SK',
  gsi2PartitionKey: 'GSI2PK',
  gsi2SortKey: 'GSI2SK',
} as const;

// Key generation utilities
export const KeyPatterns = {
  // Project keys
  projectPK: (projectId: string) => `PROJECT#${projectId}`,
  projectSK: () => 'METADATA',
  projectGSI1PK: (ownerId: string) => `OWNER#${ownerId}`,
  projectGSI1SK: (updatedAt: string) => updatedAt,
  
  // Template keys
  templatePK: (templateId: string) => `TEMPLATE#${templateId}`,
  templateSK: () => 'METADATA',
  templateGSI2PK: () => 'TEMPLATE',
  templateGSI2SK: (category: string, name: string) => `${category}#${name}`,
} as const;

// Type guards
export function isProjectEntity(entity: ProjectEntity | TemplateEntity): entity is ProjectEntity {
  return entity.EntityType === 'Project';
}

export function isTemplateEntity(entity: ProjectEntity | TemplateEntity): entity is TemplateEntity {
  return entity.EntityType === 'Template';
}

// Domain model types (for business logic layer)
export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  status: ProjectStatus;
  progressRate: number;
  tags: string[];
  sharedWith: string[];
  templateId?: string;
  specificationIds: string[];
  generatedCodeIds: string[];
  specificationChangeCount: number;
  codeGenerationCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  category?: string;
}

// Search and pagination types
export interface ProjectSearchQuery {
  nameQuery?: string;
  tags?: string[];
  category?: string;
  sortBy: 'updatedAt' | 'createdAt' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Conversion utilities
export function projectEntityToProject(entity: ProjectEntity): Project {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    ownerId: entity.ownerId,
    status: entity.status,
    progressRate: entity.progressRate,
    tags: entity.tags,
    sharedWith: entity.sharedWith,
    templateId: entity.templateId,
    specificationIds: [], // TODO: Add to entity
    generatedCodeIds: [], // TODO: Add to entity
    specificationChangeCount: 0, // TODO: Add to entity
    codeGenerationCount: 0, // TODO: Add to entity
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
    deletedAt: entity.deletedAt ? new Date(entity.deletedAt) : undefined,
    category: undefined, // TODO: Add to entity if needed
  };
}
