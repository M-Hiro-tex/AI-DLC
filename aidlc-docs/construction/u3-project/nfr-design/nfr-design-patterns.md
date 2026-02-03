# U3: Project Domain - NFR Design Patterns

## Overview

本ドキュメントでは、U3: Project DomainのNFR要件を実装するためのデザインパターンを定義します。

**Focus**: 実装可能な具体的なパターンとベストプラクティス

---

## 1. Resilience Patterns（耐障害性パターン）

### 1.1 Error Handling Strategy

**Pattern**: Centralized Error Handling with Classification

**Implementation**:
```typescript
// Error classification
enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  DYNAMODB_ERROR = 'DYNAMODB_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// Custom error classes
class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
  }
}

// Global error handler (Express middleware)
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.type,
        message: err.message,
        details: err.details
      }
    });
  }
  
  // Unexpected errors
  logger.error('Unexpected error', { error: err });
  return res.status(500).json({
    error: {
      code: ErrorType.INTERNAL_ERROR,
      message: 'An unexpected error occurred'
    }
  });
};
```

---

### 1.2 Retry Policy

**Pattern**: Exponential Backoff for DynamoDB Operations

**Strategy**: AWS SDK標準のExponential Backoff使用

**Implementation**:
```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// AWS SDK v3 has built-in retry with exponential backoff
const ddbClient = new DynamoDBClient({
  region: 'ap-northeast-1',
  maxAttempts: 3, // Maximum retry attempts
  retryMode: 'standard' // Exponential backoff
});

// Retry configuration:
// - Attempt 1: Immediate
// - Attempt 2: Wait ~100ms
// - Attempt 3: Wait ~400ms
// - After 3 attempts: Throw error
```

**Retry Conditions**:
- `ProvisionedThroughputExceededException`: Retry
- `ServiceUnavailable`: Retry
- `ThrottlingException`: Retry
- `ValidationException`: No retry (client error)
- `ResourceNotFoundException`: No retry (resource missing)

---

### 1.3 Service Communication Timeout

**Pattern**: Timeout with Graceful Degradation

**Timeout Settings**:
- **U2 Authentication API呼び出し**: 10秒
- **DynamoDB operations**: 5秒（SDK default）
- **Lambda function**: 30秒（全体）

**Implementation**:
```typescript
import axios from 'axios';

// HTTP client with timeout
const httpClient = axios.create({
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Usage example
async function validateToken(token: string): Promise<User> {
  try {
    const response = await httpClient.post(
      `${AUTH_SERVICE_URL}/validate`,
      { token }
    );
    return response.data.user;
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      throw new AppError(
        ErrorType.INTERNAL_ERROR,
        'Authentication service timeout',
        503
      );
    }
    throw error;
  }
}
```

---

## 2. Scalability Patterns（スケーラビリティパターン）

### 2.1 Pagination Strategy

**Pattern**: Cursor-based Pagination with DynamoDB

**Strategy**: DynamoDB `LastEvaluatedKey`使用

**Implementation**:
```typescript
interface PaginationParams {
  pageSize: number; // Default: 20
  cursor?: string; // Base64-encoded LastEvaluatedKey
}

interface PaginatedResponse<T> {
  items: T[];
  totalCount?: number; // Optional, expensive to calculate
  pageSize: number;
  nextCursor?: string; // For next page
  hasNext: boolean;
}

// Repository method
async function listProjectsByOwner(
  ownerId: string,
  params: PaginationParams
): Promise<PaginatedResponse<Project>> {
  const queryCommand = new QueryCommand({
    TableName: 'ProjectDomain',
    IndexName: 'OwnerIndex',
    KeyConditionExpression: 'GSI1PK = :ownerId',
    ExpressionAttributeValues: {
      ':ownerId': { S: `OWNER#${ownerId}` }
    },
    Limit: params.pageSize,
    ExclusiveStartKey: params.cursor 
      ? JSON.parse(Buffer.from(params.cursor, 'base64').toString())
      : undefined,
    ScanIndexForward: false // Newest first (sort by updatedAt DESC)
  });
  
  const result = await ddbClient.send(queryCommand);
  
  return {
    items: result.Items?.map(unmarshallProject) || [],
    pageSize: params.pageSize,
    nextCursor: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined,
    hasNext: !!result.LastEvaluatedKey
  };
}
```

**Default Page Size**: 20件

**Max Page Size**: 100件（クライアントが指定可能）

---

### 2.2 Query Optimization

**Pattern**: Global Secondary Index (GSI) for Access Patterns

**GSI Design**:

```
Main Table: ProjectDomain

Primary Index:
- PK: PROJECT#{uuid} | TEMPLATE#{uuid} | MILESTONE#{userId}
- SK: METADATA | TEMPLATE | {milestoneId}

GSI1 (OwnerIndex):
- GSI1PK: OWNER#{ownerId}
- GSI1SK: {updatedAt} (ISO timestamp)
- Purpose: List projects by owner, sorted by updated date

GSI2 (TemplateIndex):
- GSI2PK: TEMPLATE
- GSI2SK: {category}#{name}
- Purpose: List all templates, optionally filtered by category
```

**Query Patterns**:

1. **Get Project by ID**:
```typescript
GetItem(PK=PROJECT#{id}, SK=METADATA)
// O(1) lookup, < 10ms
```

2. **List Projects by Owner**:
```typescript
Query(GSI1, GSI1PK=OWNER#{ownerId}, ScanIndexForward=false, Limit=20)
// O(log n), < 50ms
```

3. **Search Projects by Name**:
```typescript
Scan(FilterExpression: contains(name, :searchTerm))
// O(n), acceptable for < 3,000 projects, < 500ms
```

---

## 3. Performance Patterns（パフォーマンスパターン）

### 3.1 DynamoDB Read Consistency Strategy

**Pattern**: Hybrid Consistency Model

**Consistency Decisions**:

| Operation | Consistency Level | Rationale |
|-----------|-------------------|-----------|
| Create直後の取得 | **Strongly Consistent** | ユーザーが作成したプロジェクトを即座に表示 |
| Update直後の取得 | **Strongly Consistent** | ユーザーが更新したプロジェクトを即座に反映 |
| Project一覧取得 | **Eventually Consistent** | コスト削減、数ミリ秒の遅延は許容範囲 |
| Project詳細取得 | **Eventually Consistent** | コスト削減、通常の詳細表示には十分 |
| Project検索 | **Eventually Consistent** | コスト削減、検索結果の遅延は許容範囲 |

**Implementation**:
```typescript
class ProjectRepository {
  // After create: Strongly consistent
  async getByIdAfterCreate(id: string): Promise<Project> {
    const result = await ddbClient.send(
      new GetItemCommand({
        TableName: 'ProjectDomain',
        Key: { PK: { S: `PROJECT#${id}` }, SK: { S: 'METADATA' } },
        ConsistentRead: true // Strongly consistent
      })
    );
    return unmarshall(result.Item);
  }
  
  // Normal read: Eventually consistent
  async getById(id: string): Promise<Project> {
    const result = await ddbClient.send(
      new GetItemCommand({
        TableName: 'ProjectDomain',
        Key: { PK: { S: `PROJECT#${id}` }, SK: { S: 'METADATA' } },
        ConsistentRead: false // Eventually consistent (default)
      })
    );
    return unmarshall(result.Item);
  }
  
  // List: Eventually consistent
  async listByOwner(ownerId: string): Promise<Project[]> {
    const result = await ddbClient.send(
      new QueryCommand({
        TableName: 'ProjectDomain',
        IndexName: 'OwnerIndex',
        KeyConditionExpression: 'GSI1PK = :ownerId',
        ExpressionAttributeValues: {
          ':ownerId': { S: `OWNER#${ownerId}` }
        },
        ConsistentRead: false // Eventually consistent for GSI
      })
    );
    return result.Items?.map(unmarshall) || [];
  }
}
```

**Cost Impact**:
- Strongly Consistent: 1 RCU per 4KB
- Eventually Consistent: 0.5 RCU per 4KB
- **Estimated savings**: 40% on read costs（CRUD直後以外はEventually）

---

### 3.2 Response Optimization

**Pattern**: Field Selection (Sparse Responses)

**Strategy**: クライアントが必要なフィールドのみ返却

**Implementation**:
```typescript
interface ListProjectsQuery {
  fields?: string[]; // Optional field selection
  pageSize?: number;
  cursor?: string;
}

// Controller
async function listProjects(req: Request, res: Response) {
  const { fields, pageSize = 20, cursor } = req.query;
  
  const result = await projectService.listProjects(
    req.user.id,
    { pageSize, cursor }
  );
  
  // Apply field selection if specified
  const items = fields
    ? result.items.map(project => pickFields(project, fields))
    : result.items;
  
  res.json({
    data: {
      items,
      pageSize: result.pageSize,
      nextCursor: result.nextCursor,
      hasNext: result.hasNext
    }
  });
}

// Utility function
function pickFields<T extends object>(
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

**Example**:
```
GET /api/v1/projects?fields=id,name,status
→ Returns only id, name, status (not description, tags, etc.)

GET /api/v1/projects
→ Returns all fields (full response)
```

---

### 3.3 Performance Monitoring

**Pattern**: Custom CloudWatch Metrics

**Metrics Collection**:
```typescript
import { MetricUnits } from '@aws-lambda-powertools/metrics';
import { metrics } from './config';

// Record API latency
metrics.addMetric('APILatency', MetricUnits.Milliseconds, latency);

// Record DynamoDB operation latency
metrics.addMetric('DynamoDBLatency', MetricUnits.Milliseconds, dbLatency);

// Record error rate
metrics.addMetric('ErrorCount', MetricUnits.Count, 1);

// Record business metrics
metrics.addMetric('ProjectCreated', MetricUnits.Count, 1);
```

**Collected Metrics**:
- API latency (p50, p95, p99)
- DynamoDB operation latency
- Error rate (4xx, 5xx)
- Business metrics (projects created, updated, deleted)

---

## 4. Security Patterns（セキュリティパターン）

### 4.1 Authentication Pattern

**Pattern**: JWT Token Validation Middleware

**Implementation**:
```typescript
import jwt from 'jsonwebtoken';

// Authentication middleware
const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        ErrorType.UNAUTHORIZED,
        'Missing or invalid authorization header',
        401
      );
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(
        ErrorType.UNAUTHORIZED,
        'Invalid token',
        401
      ));
    }
    next(error);
  }
};

// Apply to all routes
app.use('/api/v1/projects', authenticate, projectRoutes);
```

---

### 4.2 Authorization Pattern

**Pattern**: Owner + Shared Users Access Control

**Implementation**:
```typescript
// Authorization check in service layer
async function getProject(userId: string, projectId: string): Promise<Project> {
  const project = await projectRepository.getById(projectId);
  
  if (!project) {
    throw new AppError(ErrorType.NOT_FOUND, 'Project not found', 404);
  }
  
  // Check authorization
  const isOwner = project.ownerId === userId;
  const isSharedUser = project.sharedWith?.includes(userId);
  
  if (!isOwner && !isSharedUser) {
    throw new AppError(ErrorType.FORBIDDEN, 'Access denied', 403);
  }
  
  return project;
}

// Update/Delete: Owner only
async function updateProject(
  userId: string,
  projectId: string,
  updates: Partial<Project>
): Promise<Project> {
  const project = await projectRepository.getById(projectId);
  
  if (!project) {
    throw new AppError(ErrorType.NOT_FOUND, 'Project not found', 404);
  }
  
  if (project.ownerId !== userId) {
    throw new AppError(
      ErrorType.FORBIDDEN,
      'Only owner can update project',
      403
    );
  }
  
  return projectRepository.update(projectId, updates);
}
```

**Access Rules**:
- **Owner**: Full access (read, update, delete, share)
- **Shared Users**: Read-only access
- **Others**: No access

---

### 4.3 Input Validation Pattern

**Pattern**: Zod Schema Validation

**Implementation**:
```typescript
import { z } from 'zod';

// Validation schemas
const ProjectCreateSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9 _-]+$/, 'Name contains invalid characters'),
  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
  tags: z.array(z.string().max(20))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  category: z.string().optional(),
  templateId: z.string().uuid().optional()
});

// Validation middleware
function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(
          ErrorType.VALIDATION_ERROR,
          'Validation failed',
          400,
          error.errors
        ));
      }
      next(error);
    }
  };
}

// Usage
app.post(
  '/api/v1/projects',
  authenticate,
  validate(ProjectCreateSchema),
  createProjectHandler
);
```

---

## 5. Observability Patterns（観測可能性パターン）

### 5.1 Logging Strategy

**Pattern**: Structured Logging with Lambda Powertools

**Log Level Strategy**: ユースケースベース
- **正常系**: INFO
- **異常系**: WARN（回復可能）, ERROR（回復不可能）
- **デバッグ**: DEBUG（開発環境のみ）

**Implementation**:
```typescript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  serviceName: 'project-service',
  logLevel: process.env.LOG_LEVEL || 'INFO'
});

// Normal operation
logger.info('Project created', {
  projectId: project.id,
  ownerId: project.ownerId,
  name: project.name
});

// Warning (recoverable)
logger.warn('DynamoDB throttling detected, retrying', {
  operation: 'PutItem',
  attempt: 2
});

// Error (unrecoverable)
logger.error('Failed to create project', {
  error: error.message,
  stack: error.stack,
  ownerId: userId
});
```

---

### 5.2 Metrics Collection

**Pattern**: Business + Technical Metrics

**Metrics Scope**: 包括的（ビジネスメトリクス含む）

**Collected Metrics**:

**Technical Metrics**:
- API呼び出し数（エンドポイント別）
- API latency（p50, p95, p99）
- エラー率（4xx, 5xx）
- DynamoDB操作数
- DynamoDB latency

**Business Metrics**:
- プロジェクト作成数
- プロジェクト更新数
- プロジェクト削除数
- 共有操作数
- アクティブユーザー数

**Implementation**:
```typescript
import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';

const metrics = new Metrics({
  namespace: 'ProjectDomain',
  serviceName: 'project-service'
});

// Business metric
function recordProjectCreated(project: Project) {
  metrics.addMetric('ProjectCreated', MetricUnits.Count, 1);
  metrics.addMetadata('category', project.category || 'none');
  metrics.addMetadata('hasTemplate', !!project.templateId);
}

// Technical metric
function recordAPILatency(endpoint: string, latency: number) {
  metrics.addMetric('APILatency', MetricUnits.Milliseconds, latency);
  metrics.addDimension('Endpoint', endpoint);
}
```

---

### 5.3 Distributed Tracing

**Pattern**: AWS X-Ray with Lambda Powertools

**Implementation**:
```typescript
import { Tracer } from '@aws-lambda-powertools/tracer';

const tracer = new Tracer({
  serviceName: 'project-service'
});

// Automatic method tracing
class ProjectService {
  @tracer.captureMethod()
  async createProject(userId: string, input: CreateProjectInput): Promise<Project> {
    // Method execution automatically traced
    const project = await this.projectRepository.create({
      ...input,
      ownerId: userId
    });
    return project;
  }
  
  @tracer.captureMethod()
  async listProjects(userId: string): Promise<Project[]> {
    return this.projectRepository.listByOwner(userId);
  }
}

// Manual subsegment
async function enrichProjectWithTemplate(project: Project): Promise<Project> {
  const subsegment = tracer.getSegment()?.addNewSubsegment('fetchTemplate');
  
  try {
    const template = await templateService.getById(project.templateId!);
    project.template = template;
    subsegment?.close();
    return project;
  } catch (error) {
    subsegment?.addError(error as Error);
    subsegment?.close();
    throw error;
  }
}
```

**Traced Operations**:
- HTTP requests (API Gateway → Lambda)
- DynamoDB operations (automatically)
- Service method calls (manual with @captureMethod)
- External API calls (e.g., U2 Authentication)

---

## 6. Testing Patterns（テストパターン）

### 6.1 Unit Test Pattern

**Pattern**: AWS SDK Mock for DynamoDB

**Mock Strategy**: aws-sdk-client-mock使用

**Implementation**:
```typescript
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const ddbMock = mockClient(DynamoDBClient);

describe('ProjectRepository', () => {
  beforeEach(() => {
    ddbMock.reset();
  });
  
  it('should get project by id', async () => {
    ddbMock.on(GetItemCommand).resolves({
      Item: {
        PK: { S: 'PROJECT#123' },
        SK: { S: 'METADATA' },
        name: { S: 'Test Project' },
        ownerId: { S: 'user-1' }
      }
    });
    
    const repository = new ProjectRepository(new DynamoDBClient({}));
    const project = await repository.getById('123');
    
    expect(project.id).toBe('123');
    expect(project.name).toBe('Test Project');
  });
});
```

---

### 6.2 Integration Test Pattern

**Pattern**: API → Service → Repository (DynamoDB Mocked)

**Test Scope**: API層からRepository層まで、DynamoDBのみモック

**Implementation**:
```typescript
import request from 'supertest';
import { app } from '../src/app';
import { mockClient } from 'aws-sdk-client-mock';

describe('Project API Integration', () => {
  it('should create project', async () => {
    ddbMock.on(PutItemCommand).resolves({});
    ddbMock.on(GetItemCommand).resolves({
      Item: { /* project data */ }
    });
    
    const response = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'New Project',
        description: 'Test project'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe('New Project');
  });
});
```

---

## Summary

### Pattern Categories

| Category | Patterns | Priority |
|----------|----------|----------|
| **Resilience** | Error Handling, Retry, Timeout | High |
| **Scalability** | Pagination, Query Optimization | High |
| **Performance** | Consistency Strategy, Field Selection | High |
| **Security** | Auth Middleware, Authorization, Validation | High |
| **Observability** | Logging, Metrics, Tracing | Medium |
| **Testing** | Unit Tests, Integration Tests | High |

### Key Design Decisions

1. **Exponential Backoff**: DynamoDB自動リトライ（AWS SDK標準）
2. **Cursor-based Pagination**: DynamoDB LastEvaluatedKey使用
3. **Hybrid Consistency**: CRUD直後はStrong、通常操作はEventual
4. **Middleware Auth**: Express middlewareでJWT検証
5. **Owner + Shared**: オーナー全権限、共有ユーザー読取のみ
6. **Structured Logging**: Lambda Powertools使用
7. **AWS SDK Mock**: aws-sdk-client-mock使用

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Complete