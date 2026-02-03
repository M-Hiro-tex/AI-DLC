# U3: Project Domain - Code Generation Plan

## Overview

**Unit**: U3 - Project Domain  
**Technology Stack**: TypeScript + Express + DynamoDB + AWS Lambda  
**MVP Stories**: 6 stories (D2.1, D5.1, D5.2, S1.2, S4.2, M5.1)

---

## Phase 1: Project Structure Setup

### Step 1: Initialize Project
**Status**: [x]
- [x] Create `u3-project/` directory structure
- [x] Initialize package.json with dependencies
- [x] Configure TypeScript (tsconfig.json)
- [x] Configure Jest (jest.config.js)
- [x] Configure ESLint (.eslintrc.js)
- [x] Create .gitignore

**Dependencies**:
```json
{
  "express": "^4.18.2",
  "@aws-sdk/client-dynamodb": "^3.x",
  "@aws-sdk/lib-dynamodb": "^3.x",
  "@aws-lambda-powertools/logger": "^2.x",
  "@aws-lambda-powertools/tracer": "^2.x",
  "zod": "^3.x",
  "serverless-http": "^3.x"
}
```

---

## Phase 2: Database Layer

### Step 2: DynamoDB Schema & Connection
**Status**: [x]
- [x] Create `src/db/schema.ts` - Single-Table Design definition
- [x] Create `src/db/connection.ts` - DynamoDB client initialization

### Step 3: Project Repository
**Status**: [x]
- [x] Create `src/repositories/project.repository.ts`
  - getById(), listByOwner(), create(), update(), delete(), restore()
- [x] Create `tests/repositories/project.repository.test.ts`

### Step 4: Template Repository
**Status**: [x]
- [x] Create `src/repositories/template.repository.ts`
  - listTemplates(), getTemplate()
- [x] Create `tests/repositories/template.repository.test.ts`

---

## Phase 3: Business Logic Layer

### Step 5: Project Service
**Status**: [x]
- [x] Create `src/services/project.service.ts`
  - createProject(), updateProject(), deleteProject(), getProject(), listProjects()
  - Status transition logic, validation rules
- [x] Create `tests/services/project.service.test.ts`

### Step 6: Template Service
**Status**: [x]
- [x] Create `src/services/template.service.ts`
  - listTemplates(), instantiateTemplate()
- [x] Create `tests/services/template.service.test.ts`

### Step 7: Statistics Service (Basic)
**Status**: [x]
- [x] Create `src/services/statistics.service.ts`
  - Basic project counts, learning progress (MVP level)
- [x] Create `tests/services/statistics.service.test.ts`

---

## Phase 4: API Layer

### Step 8: Validation Schemas
**Status**: [x]
- [x] Create `src/validators/project.validator.ts` (Zod schemas)
- [x] Create `tests/validators/project.validator.test.ts`

### Step 9: Controllers
**Status**: [x]
- [x] Create `src/controllers/project.controller.ts`
- [x] Create `src/controllers/template.controller.ts`
- [x] Create `tests/controllers/project.controller.test.ts`
- [x] Create `tests/controllers/template.controller.test.ts`

### Step 10: Middleware
**Status**: [x]
- [x] Create `src/middleware/auth.middleware.ts` (JWT validation)
- [x] Create `src/middleware/ownership.middleware.ts` (Owner check)
- [x] Create `src/middleware/validation.middleware.ts`
- [x] Create `src/middleware/error.middleware.ts`
- [x] Create `src/middleware/logging.middleware.ts`

### Step 11: Routes
**Status**: [x]
- [x] Create `src/routes/project.routes.ts`
- [x] Create `src/routes/template.routes.ts`
- [x] Create `src/routes/health.routes.ts`
- [x] Create `src/routes/index.ts`

---

## Phase 5: Application Entry Point

### Step 12: Express App & Lambda Handler
**Status**: [x]
- [x] Create `src/app.ts` (Express app configuration)
- [x] Create `src/lambda.ts` (Lambda handler with serverless-http)
- [x] Create `src/server.ts` (Local development server)

---

## Phase 6: Utilities and Helpers

### Step 13: Utilities
**Status**: [x]
- [x] Create `src/utils/logger.ts` (Lambda Powertools logger)
- [x] Create `src/utils/errors.ts` (Custom error classes)
- [x] Create `src/utils/validators.ts` (Common validation utilities)
- [x] Create `tests/utils/*.test.ts`

---

## Phase 7: Configuration and Documentation

### Step 14: Configuration & Docs
**Status**: [x]
- [x] Create `src/config/index.ts` (Environment variables)
- [x] Create `.env.example`
- [x] Create `README.md`
- [x] Create `DEVELOPMENT.md`
- [x] Create `docs/api-specification.md`

---

## Phase 8: Infrastructure and Deployment

### Step 15: AWS CDK Infrastructure
**Status**: [x]
- [x] Create `infrastructure/` directory
- [x] Create `infrastructure/lib/u3-project-stack.ts`
  - DynamoDB table (Single-Table)
  - Lambda function
  - API Gateway integration
  - IAM roles
  - CloudWatch alarms
- [x] Create `infrastructure/bin/u3-project.ts`

### Step 16: Deployment Scripts
**Status**: [x]
- [x] Create `scripts/build.sh`
- [x] Create `scripts/deploy.sh`
- [x] Create `scripts/seed-templates.sh` (Sample project templates)

### Step 17: CI/CD Pipeline
**Status**: [SKIP - Not in MVP scope]
- [ ] Create `.github/workflows/u3-project-ci.yml`
- [ ] Create `.github/workflows/u3-project-cd.yml`

---

## Phase 9: Testing

### Step 18: Integration Tests
**Status**: [x]
- [x] Create `tests/integration/project-lifecycle.test.ts`
- [x] Create `tests/integration/template-instantiation.test.ts`

### Step 19: Smoke Tests
**Status**: [x]
- [x] Create `tests/smoke/health-check.test.ts`
- [x] Create `tests/smoke/project-crud.test.ts`

---

## Implementation Details

### DynamoDB Single-Table Design

```typescript
// Main Table: ProjectDomain
{
  PK: 'PROJECT#{uuid}',
  SK: 'METADATA',
  EntityType: 'Project',
  name: string,
  description: string,
  ownerId: string,
  status: 'Draft' | 'Active' | 'Completed',
  progressRate: number,
  tags: string[],
  sharedWith: string[],
  createdAt: string,
  updatedAt: string,
  deletedAt?: string
}

// GSI1: OwnerIndex
{
  GSI1PK: 'OWNER#{userId}',
  GSI1SK: '{updatedAt}',
  // Project metadata
}

// GSI2: TemplateIndex
{
  GSI2PK: 'TEMPLATE',
  GSI2SK: '{category}#{name}',
  // Template metadata
}
```

### API Endpoints

```
GET    /api/v1/projects              - List projects
POST   /api/v1/projects              - Create project
GET    /api/v1/projects/{id}         - Get project
PUT    /api/v1/projects/{id}         - Update project
DELETE /api/v1/projects/{id}         - Delete project (soft delete)
POST   /api/v1/projects/{id}/restore - Restore deleted project
POST   /api/v1/projects/{id}/share   - Share project
GET    /api/v1/templates              - List templates
POST   /api/v1/projects/from-template - Create from template
GET    /api/v1/statistics/progress   - Learning progress (basic)
GET    /api/v1/health                 - Health check
```

### MVP Story Coverage

- **D2.1**: Step 5, 9, 11, 12 (Project creation)
- **D5.1**: Step 5, 9, 11, 12 (Project list)
- **D5.2**: Step 5, 9, 11, 12 (Project deletion)
- **S1.2**: Step 6, 9, 11, 16 (Sample projects/templates)
- **S4.2**: Step 5, 7 (Small project completion tracking)
- **M5.1**: All steps (Basic usage shared with all personas)

---

## File Structure

```
u3-project/
├── src/
│   ├── app.ts
│   ├── lambda.ts
│   ├── server.ts
│   ├── config/
│   │   └── index.ts
│   ├── db/
│   │   ├── connection.ts
│   │   └── schema.ts
│   ├── repositories/
│   │   ├── project.repository.ts
│   │   └── template.repository.ts
│   ├── services/
│   │   ├── project.service.ts
│   │   ├── template.service.ts
│   │   └── statistics.service.ts
│   ├── controllers/
│   │   ├── project.controller.ts
│   │   └── template.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── ownership.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── logging.middleware.ts
│   ├── routes/
│   │   ├── project.routes.ts
│   │   ├── template.routes.ts
│   │   ├── health.routes.ts
│   │   └── index.ts
│   ├── validators/
│   │   └── project.validator.ts
│   └── utils/
│       ├── logger.ts
│       ├── errors.ts
│       └── validators.ts
├── tests/
│   ├── repositories/
│   ├── services/
│   ├── controllers/
│   ├── validators/
│   ├── utils/
│   ├── integration/
│   └── smoke/
├── infrastructure/
│   ├── bin/
│   │   └── u3-project.ts
│   └── lib/
│       └── u3-project-stack.ts
├── scripts/
│   ├── build.sh
│   ├── deploy.sh
│   └── seed-templates.sh
├── docs/
│   └── api-specification.md
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── .env.example
├── README.md
└── DEVELOPMENT.md
```

---

**Total Steps**: 19  
**Total Files**: ~60+ files  
**Code Location**: `u3-project/` (workspace root)

---

**Plan Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Ready for Approval