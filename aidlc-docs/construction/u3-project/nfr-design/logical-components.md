# U3: Project Domain - Logical Components

## Overview

本ドキュメントでは、U3: Project Domainの論理コンポーネント設計を定義します。

**Focus**: レイヤー構成、コンポーネント責務、データフロー

---

## 1. System Architecture

### 1.1 Layer Architecture

**Pattern**: 3-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     API Layer                           │
│  - Controllers (Thin: Request/Response handling)        │
│  - Middleware (Auth, Validation, Error Handling)        │
│  - Routes Definition                                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Business Logic Layer                   │
│  - Services (Rich: Business logic + Orchestration)      │
│  - Business Rules Validation                            │
│  - Authorization Logic                                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 Data Access Layer                       │
│  - Repositories (Aggregate-based)                       │
│  - DynamoDB Operations                                  │
│  - Data Marshalling/Unmarshalling                       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Infrastructure                         │
│  - DynamoDB                                             │
│  - CloudWatch Logs/Metrics                              │
│  - AWS X-Ray                                            │
└─────────────────────────────────────────────────────────┘
```

---

### 1.2 Request Flow

```
Client Request
      ↓
API Gateway
      ↓
Lambda Handler
      ↓
Express Application
      ↓
┌─────────────────────────┐
│ Middleware Chain        │
│ 1. Logging              │
│ 2. Authentication       │
│ 3. Validation           │
└─────────────────────────┘
      ↓
Controller (Thin)
  - Parse request
  - Extract parameters
  - Call service
  - Format response
      ↓
Service (Rich)
  - Business logic
  - Authorization check
  - Orchestration
  - Business rules validation
      ↓
Repository (Aggregate)
  - DynamoDB operations
  - Data marshalling
  - Consistency control
      ↓
DynamoDB
      ↓
Response Flow (reverse)
      ↓
Client Response
```

---

## 2. API Layer Components

### 2.1 Controllers

**Responsibility**: Thin Controllers
- リクエストパラメータの抽出
- Serviceレイヤーへの委譲
- レスポンスの整形
- HTTP status codeの設定

**Example**:
```typescript
// src/controllers/project.controller.ts
export class ProjectController {
  constructor(private projectService: ProjectService) {}
  
  async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const input = req.body; // Already validated by middleware
      
      const project = await this.projectService.createProject(userId, input);
      
      res.status(201).json({
        data: project
      });
    } catch (error) {
      next(error); // Pass to global error handler
    }
  }
  
  async listProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { pageSize = 20, cursor, fields } = req.query;
      
      const result = await this.projectService.listProjects(userId, {
        pageSize: Number(pageSize),
        cursor: cursor as string
      });
      
      // Apply field selection if requested
      const items = fields
        ? result.items.map(p => pickFields(p, (fields as string).split(',')))
        : result.items;
      
      res.json({
        data: {
          items,
          pageSize: result.pageSize,
          nextCursor: result.nextCursor,
          hasNext: result.hasNext
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const project = await this.projectService.getProject(userId, id);
      
      res.json({
        data: project
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const updates = req.body;
      
      const project = await this.projectService.updateProject(userId, id, updates);
      
      res.json({
        data: project
      });
    } catch (error) {
      next(error);
    }
  }
  
  async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      await this.projectService.deleteProject(userId, id);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
```

---

### 2.2 Middleware Components

**2.2.1 Authentication Middleware**

```typescript
// src/middleware/auth.middleware.ts
import jwt from 'jsonwebtoken';

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(ErrorType.UNAUTHORIZED, 'Missing token', 401);
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    next(error);
  }
};
```

**2.2.2 Validation Middleware**

```typescript
// src/middleware/validation.middleware.ts
import { z } from 'zod';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(
          ErrorType.VALIDATION_ERROR,
          'Validation failed',
          400,
          error.errors
        ));
      } else {
        next(error);
      }
    }
  };
}
```

**2.2.3 Logging Middleware**

```typescript
// src/middleware/logging.middleware.ts
import { logger } from '../config';

export const loggingMiddleware: RequestHandler = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
  });
  
  next();
};
```

**2.2.4 Error Handler Middleware**

```typescript
// src/middleware/error.middleware.ts
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Log error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  // Handle known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.type,
        message: err.message,
        details: err.details
      }
    });
  }
  
  // Handle unknown errors
  res.status(500).json({
    error: {
      code: ErrorType.INTERNAL_ERROR,
      message: 'An unexpected error occurred'
    }
  });
};
```

---

### 2.3 Routes

```typescript
// src/routes/project.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { ProjectCreateSchema, ProjectUpdateSchema } from '../schemas';

const router = Router();
const projectController = new ProjectController(projectService);

// All routes require authentication
router.use(authenticate);

router.post('/', 
  validate(ProjectCreateSchema),
  projectController.createProject
);

router.get('/', 
  projectController.listProjects
);

router.get('/:id', 
  projectController.getProject
);

router.put('/:id', 
  validate(ProjectUpdateSchema),
  projectController.updateProject
);

router.delete('/:id', 
  projectController.deleteProject
);

router.post('/:id/share',
  validate(ProjectShareSchema),
  projectController.shareProject
);

export default router;
```

---

## 3. Business Logic Layer Components

### 3.1 Services

**Responsibility**: Rich Services
- ビジネスロジックの実装
- オーケストレーション（複数Repository呼び出し）
- Authorization check
- ビジネスルールの検証
- トランザクション境界の定義

**Example**:
```typescript
// src/services/project.service.ts
export class ProjectService {
  constructor(
    private projectRepository: ProjectRepository,
    private templateRepository: TemplateRepository,
    private metricsService: MetricsService,
    private tracer: Tracer
  ) {}
  
  @tracer.captureMethod()
  async createProject(
    userId: string,
    input: CreateProjectInput
  ): Promise<Project> {
    // Business rule: Validate template if provided
    if (input.templateId) {
      const template = await this.templateRepository.getById(input.templateId);
      if (!template) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          'Template not found',
          400
        );
      }
    }
    
    // Business rule: Check user project limit (max 3 projects per user)
    const userProjects = await this.projectRepository.listByOwner(userId);
    if (userProjects.length >= 3) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'User project limit reached (max 3)',
        400
      );
    }
    
    // Create project
    const project = await this.projectRepository.create({
      ...input,
      ownerId: userId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Get project with strong consistency (immediately after create)
    const createdProject = await this.projectRepository.getByIdAfterCreate(
      project.id
    );
    
    // Record business metric
    this.metricsService.recordProjectCreated(project);
    
    logger.info('Project created', {
      projectId: project.id,
      ownerId: userId,
      hasTemplate: !!input.templateId
    });
    
    return createdProject;
  }
  
  @tracer.captureMethod()
  async listProjects(
    userId: string,
    params: PaginationParams
  ): Promise<PaginatedResponse<Project>> {
    return this.projectRepository.listByOwner(userId, params);
  }
  
  @tracer.captureMethod()
  async getProject(userId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepository.getById(projectId);
    
    if (!project) {
      throw new AppError(ErrorType.NOT_FOUND, 'Project not found', 404);
    }
    
    // Authorization: Owner or shared user
    this.checkProjectAccess(userId, project);
    
    return project;
  }
  
  @tracer.captureMethod()
  async updateProject(
    userId: string,
    projectId: string,
    updates: UpdateProjectInput
  ): Promise<Project> {
    const project = await this.projectRepository.getById(projectId);
    
    if (!project) {
      throw new AppError(ErrorType.NOT_FOUND, 'Project not found', 404);
    }
    
    // Authorization: Owner only for updates
    if (project.ownerId !== userId) {
      throw new AppError(
        ErrorType.FORBIDDEN,
        'Only owner can update project',
        403
      );
    }
    
    // Business rule: Cannot change owner
    if (updates.ownerId && updates.ownerId !== project.ownerId) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Cannot change project owner',
        400
      );
    }
    
    // Update project
    const updatedProject = await this.projectRepository.update(projectId, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    // Get with strong consistency (immediately after update)
    const result = await this.projectRepository.getByIdAfterUpdate(projectId);
    
    logger.info('Project updated', { projectId, ownerId: userId });
    
    return result;
  }
  
  @tracer.captureMethod()
  async deleteProject(userId: string, projectId: string): Promise<void> {
    const project = await this.projectRepository.getById(projectId);
    
    if (!project) {
      throw new AppError(ErrorType.NOT_FOUND, 'Project not found', 404);
    }
    
    // Authorization: Owner only for deletion
    if (project.ownerId !== userId) {
      throw new AppError(
        ErrorType.FORBIDDEN,
        'Only owner can delete project',
        403
      );
    }
    
    // Soft delete
    await this.projectRepository.softDelete(projectId);
    
    logger.info('Project deleted', { projectId, ownerId: userId });
  }
  
  @tracer.captureMethod()
  async shareProject(
    userId: string,
    projectId: string,
    targetUserId: string
  ): Promise<Project> {
    const project = await this.projectRepository.getById(projectId);
    
    if (!project) {
      throw new AppError(ErrorType.NOT_FOUND, 'Project not found', 404);
    }
    
    // Authorization: Owner only for sharing
    if (project.ownerId !== userId) {
      throw new AppError(
        ErrorType.FORBIDDEN,
        'Only owner can share project',
        403
      );
    }
    
    // Business rule: Cannot share with self
    if (targetUserId === userId) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Cannot share project with yourself',
        400
      );
    }
    
    // Add to shared users
    const sharedWith = project.sharedWith || [];
    if (!sharedWith.includes(targetUserId)) {
      sharedWith.push(targetUserId);
    }
    
    const updatedProject = await this.projectRepository.update(projectId, {
      sharedWith,
      updatedAt: new Date().toISOString()
    });
    
    logger.info('Project shared', {
      projectId,
      ownerId: userId,
      targetUserId
    });
    
    return updatedProject;
  }
  
  // Private helper methods
  private checkProjectAccess(userId: string, project: Project): void {
    const isOwner = project.ownerId === userId;
    const isSharedUser = project.sharedWith?.includes(userId);
    
    if (!isOwner && !isSharedUser) {
      throw new AppError(ErrorType.FORBIDDEN, 'Access denied', 403);
    }
  }
}
```

---

## 4. Data Access Layer Components

### 4.1 Repositories

**Responsibility**: Aggregate-based Repositories
- DynamoDB操作のカプセル化
- データマーシャリング/アンマーシャリング
- 一貫性レベルの制御
- クエリ最適化

**Repository Pattern**: Aggregate単位
- `ProjectRepository`: Project + 関連エンティティ（Template reference等）
- `TemplateRepository`: ProjectTemplate
- `MilestoneRepository`: UserMilestone

**Example**:
```typescript
// src/repositories/project.repository.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  QueryCommand
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export class ProjectRepository {
  private tableName = 'ProjectDomain';
  
  constructor(private ddbClient: DynamoDBClient) {}
  
  async create(project: Omit<Project, 'id'>): Promise<Project> {
    const id = generateUUID();
    const fullProject: Project = { ...project, id };
    
    await this.ddbClient.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: marshall({
          PK: `PROJECT#${id}`,
          SK: 'METADATA',
          EntityType: 'Project',
          GSI1PK: `OWNER#${project.ownerId}`,
          GSI1SK: project.updatedAt,
          ...fullProject
        })
      })
    );
    
    return fullProject;
  }
  
  async getById(id: string): Promise<Project | null> {
    const result = await this.ddbClient.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: `PROJECT#${id}`,
          SK: 'METADATA'
        }),
        ConsistentRead: false // Eventually consistent
      })
    );
    
    return result.Item ? this.unmarshallProject(result.Item) : null;
  }
  
  async getByIdAfterCreate(id: string): Promise<Project> {
    const result = await this.ddbClient.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: `PROJECT#${id}`,
          SK: 'METADATA'
        }),
        ConsistentRead: true // Strongly consistent after create
      })
    );
    
    if (!result.Item) {
      throw new Error('Project not found after creation');
    }
    
    return this.unmarshallProject(result.Item);
  }
  
  async getByIdAfterUpdate(id: string): Promise<Project> {
    const result = await this.ddbClient.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: `PROJECT#${id}`,
          SK: 'METADATA'
        }),
        ConsistentRead: true // Strongly consistent after update
      })
    );
    
    if (!result.Item) {
      throw new Error('Project not found after update');
    }
    
    return this.unmarshallProject(result.Item);
  }
  
  async listByOwner(
    ownerId: string,
    params: PaginationParams = { pageSize: 20 }
  ): Promise<PaginatedResponse<Project>> {
    const result = await this.ddbClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'OwnerIndex',
        KeyConditionExpression: 'GSI1PK = :ownerId',
        ExpressionAttributeValues: marshall({
          ':ownerId': `OWNER#${ownerId}`
        }),
        Limit: params.pageSize,
        ExclusiveStartKey: params.cursor
          ? JSON.parse(Buffer.from(params.cursor, 'base64').toString())
          : undefined,
        ScanIndexForward: false, // Newest first
        ConsistentRead: false // Eventually consistent for list
      })
    );
    
    return {
      items: result.Items?.map(item => this.unmarshallProject(item)) || [],
      pageSize: params.pageSize,
      nextCursor: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : undefined,
      hasNext: !!result.LastEvaluatedKey
    };
  }
  
  async update(
    id: string,
    updates: Partial<Project>
  ): Promise<Project> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    Object.entries(updates).forEach(([key, value], index) => {
      updateExpressions.push(`#attr${index} = :val${index}`);
      expressionAttributeNames[`#attr${index}`] = key;
      expressionAttributeValues[`:val${index}`] = value;
    });
    
    // Also update GSI1SK if updatedAt is being updated
    if (updates.updatedAt) {
      updateExpressions.push(`GSI1SK = :updatedAt`);
      expressionAttributeValues[':updatedAt'] = updates.updatedAt;
    }
    
    await this.ddbClient.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: `PROJECT#${id}`,
          SK: 'METADATA'
        }),
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues)
      })
    );
    
    // Return updated project (will be fetched with strong consistency by service)
    return this.getById(id) as Promise<Project>;
  }
  
  async softDelete(id: string): Promise<void> {
    await this.ddbClient.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: `PROJECT#${id}`,
          SK: 'METADATA'
        }),
        UpdateExpression: 'SET #status = :status, deletedAt = :deletedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':status': 'deleted',
          ':deletedAt': new Date().toISOString()
        })
      })
    );
  }
  
  private unmarshallProject(item: Record<string, any>): Project {
    const unmarshalled = unmarshall(item);
    
    // Remove DynamoDB-specific fields
    delete unmarshalled.PK;
    delete unmarshalled.SK;
    delete unmarshalled.GSI1PK;
    delete unmarshalled.GSI1SK;
    delete unmarshalled.EntityType;
    
    return unmarshalled as Project;
  }
}
```

---

## 5. Data Transfer Objects (DTOs)

### 5.1 DTO Strategy

**Pattern**: 共通DTOを再利用

- Controller DTOとService DTOは同じ
- Domain Modelも同じ型を使用
- TypeScript interfaceで型安全性を確保

**DTOs**:
```typescript
// src/types/project.types.ts

// Domain Model = DTO (no separation)
export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  status: 'active' | 'archived' | 'deleted';
  category?: string;
  tags?: string[];
  templateId?: string;
  sharedWith?: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// Input DTOs
export interface CreateProjectInput {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  templateId?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  status?: 'active' | 'archived';
}

export interface ProjectShareInput {
  userId: string;
}

// Pagination
export interface PaginationParams {
  pageSize: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageSize: number;
  nextCursor?: string;
  hasNext: boolean;
}
```

---

## 6. Shared Utilities

### 6.1 Error Classes

```typescript
// src/utils/errors.ts
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  DYNAMODB_ERROR = 'DYNAMODB_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

---

### 6.2 Field Selection Utility

```typescript
// src/utils/field-selector.ts
export function pickFields<T extends object>(
  obj: T,
  fields: string[]
): Partial<T> {
  const picked: any = {};
  fields.forEach(field => {
    if (field in obj) {
      picked[field] = obj[field as keyof T];
    }
  });
  return picked;
}
```

---

## 7. Component Dependencies

```
┌─────────────────────────────────────────────────────────┐
│                    Express App                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     Middleware                          │
│  - Logging                                              │
│  - Authentication                                       │
│  - Validation                                           │
│  - Error Handler                                        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Controllers                          │
│  ProjectController ──────────────┐                      │
│  TemplateController ─────────────┤                      │
│  HealthController ───────────────┤                      │
└──────────────────────────────────┼──────────────────────┘
                                   ↓
┌──────────────────────────────────┼──────────────────────┐
│                     Services     ↓                      │
│  ProjectService ←────────────────┘                      │
│    ↓                ↓                                   │
│    ↓                TemplateService                     │
│    ↓                MetricsService                      │
│    ↓                                                    │
└────┼────────────────────────────────────────────────────┘
     ↓
┌────┼────────────────────────────────────────────────────┐
│    ↓            Repositories                            │
│  ProjectRepository                                      │
│  TemplateRepository                                     │
│  MilestoneRepository                                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 DynamoDB Client                         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Observability Components

### 8.1 Logger

```typescript
// src/config/logger.ts
import { Logger } from '@aws-lambda-powertools/logger';

export const logger = new Logger({
  serviceName: 'project-service',
  logLevel: process.env.LOG_LEVEL || 'INFO'
});
```

### 8.2 Metrics

```typescript
// src/config/metrics.ts
import { Metrics } from '@aws-lambda-powertools/metrics';

export const metrics = new Metrics({
  namespace: 'ProjectDomain',
  serviceName: 'project-service'
});

// src/services/metrics.service.ts
export class MetricsService {
  recordProjectCreated(project: Project) {
    metrics.addMetric('ProjectCreated', MetricUnits.Count, 1);
    metrics.addMetadata('category', project.category || 'none');
    metrics.addMetadata('hasTemplate', !!project.templateId);
  }
  
  recordAPILatency(endpoint: string, latency: number) {
    metrics.addMetric('APILatency', MetricUnits.Milliseconds, latency);
    metrics.addDimension('Endpoint', endpoint);
  }
}
```

### 8.3 Tracer

```typescript
// src/config/tracer.ts
import { Tracer } from '@aws-lambda-powertools/tracer';

export const tracer = new Tracer({
  serviceName: 'project-service'
});
```

---

## Summary

### Component Responsibilities

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| **API** | Controllers | Request/Response handling |
| **API** | Middleware | Auth, Validation, Error handling |
| **API** | Routes | Endpoint definitions |
| **Business** | Services | Business logic, Orchestration, Authorization |
| **Data** | Repositories | DynamoDB operations, Data marshalling |
| **Shared** | Utilities | Error classes, Field selection |
| **Observability** | Logger/Metrics/Tracer | Monitoring, Debugging |

### Key Design Decisions

1. **3-Layer Architecture**: Controller → Service → Repository
2. **Thin Controllers**: Request handling only
3. **Rich Services**: Business logic + Orchestration
4. **Aggregate Repositories**: Entity + related data
5. **