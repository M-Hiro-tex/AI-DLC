# Unit of Work Definition

## Overview

本ドキュメントでは、開発可能なユニット（Unit of Work）の定義を提供します。

**Deployment Model**: Hybrid - フロントエンドモノリス、バックエンド複数サービス  
**Repository Strategy**: Monorepo - すべてのユニットを1つのリポジトリに配置  
**Code Organization**: Feature-based - 機能ごとにフォルダを作成

---

## Unit Architecture

```
Monorepo
├── frontend/          # Frontend Unit (Single SPA)
├── backend/
│   ├── auth/         # Authentication Domain Unit
│   ├── project/      # Project Domain Unit
│   ├── specification/ # Specification Domain Unit
│   ├── codegen/      # Code Generation Domain Unit
│   ├── validation/   # Validation Domain Unit
│   └── ai-service/   # AI Service Unit (Independent)
├── shared/           # Shared utilities and types
└── docs/            # Documentation
```

---

## Unit Definitions

### Unit 1: Frontend Unit (SPA)

**Type**: Frontend Monolith  
**Deployment**: Single deployable SPA  
**Technology**: React/Vue.js + TypeScript

#### Purpose
ユーザーインターフェース全体を提供する単一ページアプリケーション

#### Scope
すべてのフロントエンドコンポーネントを機能別モジュールとして統合

#### Responsibilities
- ユーザー認証UI
- プロジェクト管理UI
- 仕様エディタUI
- コードプレビューUI
- 検証結果表示UI
- チュートリアルUI
- アプリケーションシェル（ナビゲーション、レイアウト）

#### Components Included
1. Authentication Component
2. Project Management Component
3. Specification Editor Component
4. Code Preview Component
5. Validation Viewer Component
6. Tutorial Component
7. UI Shell Component

#### Module Organization
```
frontend/
├── src/
│   ├── features/
│   │   ├── auth/           # Authentication module
│   │   ├── projects/       # Project management module
│   │   ├── editor/         # Specification editor module
│   │   ├── code-preview/   # Code preview module
│   │   ├── validation/     # Validation viewer module
│   │   └── tutorial/       # Tutorial module
│   ├── shared/
│   │   ├── components/     # Shared UI components
│   │   ├── hooks/          # Shared React hooks
│   │   └── utils/          # Shared utilities
│   ├── services/           # API client services
│   ├── store/              # State management
│   └── App.tsx             # Root application
├── public/
└── package.json
```

#### Deployment Characteristics
- **Deployment Target**: S3 + CloudFront (CDN)
- **Build Output**: Static files (HTML, CSS, JS)
- **Runtime**: Browser
- **Scaling**: CDN-based content delivery

---

### Unit 2: Authentication Domain Unit

**Type**: Backend Service  
**Deployment**: Independently deployable service  
**Technology**: Node.js/Python + Express/FastAPI

#### Purpose
ユーザー認証とセッション管理を担当するドメインサービス

#### Scope
OAuth認証、セッション管理、ユーザープロファイル管理

#### Responsibilities
- OAuth Provider統合（Google、GitHub）
- セッショントークン管理
- ユーザープロファイルCRUD
- 認証状態検証
- セキュリティポリシー適用

#### Components Included
- Authentication Service Component
- OAuth Integration
- Session Service
- User Profile Service

#### Data Persistence Strategy
- **Database**: DynamoDB table for user profiles and sessions
- **Schema**: User, Session, Profile tables
- **Access Pattern**: Direct database access via SDK

#### API Endpoints
```
POST   /api/auth/google          # Google OAuth login
POST   /api/auth/github          # GitHub OAuth login
POST   /api/auth/logout          # Logout
GET    /api/auth/session         # Validate session
POST   /api/auth/refresh         # Refresh token
GET    /api/users/{id}           # Get user profile
PUT    /api/users/{id}           # Update user profile
```

#### Module Organization
```
backend/auth/
├── src/
│   ├── features/
│   │   ├── oauth/              # OAuth integration
│   │   ├── session/            # Session management
│   │   └── profile/            # User profile
│   ├── shared/
│   │   ├── middleware/         # Auth middleware
│   │   └── utils/              # Utilities
│   ├── db/                     # Database access layer
│   └── index.ts                # Service entry point
└── package.json
```

#### Deployment Characteristics
- **Deployment Target**: AWS Lambda / ECS Fargate
- **Runtime**: Node.js 20 / Python 3.11
- **Scaling**: Auto-scaling based on request volume
- **Dependencies**: DynamoDB, OAuth Provider APIs

---

### Unit 3: Project Domain Unit

**Type**: Backend Service  
**Deployment**: Independently deployable service  
**Technology**: Node.js/Python

#### Purpose
プロジェクトライフサイクル管理を担当するドメインサービス

#### Scope
プロジェクトCRUD、メタデータ管理、所有権管理

#### Responsibilities
- プロジェクト作成・更新・削除
- プロジェクトメタデータ管理
- プロジェクト検索・フィルタリング
- プロジェクト統計情報

#### Components Included
- Project Service Component
- Project Repository
- Project Query Service

#### Data Persistence Strategy
- **Database**: DynamoDB table for projects
- **Schema**: Project, ProjectMetadata tables
- **Access Pattern**: Direct database access via SDK

#### API Endpoints
```
POST   /api/projects             # Create project
GET    /api/projects             # List projects
GET    /api/projects/{id}        # Get project
PUT    /api/projects/{id}        # Update project
DELETE /api/projects/{id}        # Delete project
GET    /api/projects/{id}/stats  # Get project statistics
```

#### Module Organization
```
backend/project/
├── src/
│   ├── features/
│   │   ├── crud/               # Project CRUD operations
│   │   ├── query/              # Query and search
│   │   └── stats/              # Statistics
│   ├── shared/
│   ├── db/                     # Database access layer
│   └── index.ts
└── package.json
```

#### Deployment Characteristics
- **Deployment Target**: AWS Lambda / ECS Fargate
- **Dependencies**: DynamoDB, Auth Service (for user validation)

---

### Unit 4: Specification Domain Unit

**Type**: Backend Service  
**Deployment**: Independently deployable service  
**Technology**: Node.js/Python

#### Purpose
仕様ドキュメントの管理とバージョン管理を担当するドメインサービス

#### Scope
仕様CRUD、バージョン管理、仕様保存・取得

#### Responsibilities
- 仕様作成・更新・削除
- 仕様バージョン管理
- 仕様コンテンツ保存（DB + S3）
- 仕様履歴管理

#### Components Included
- Specification Service Component
- Specification Repository
- Version Control Service

#### Data Persistence Strategy
- **Database**: DynamoDB for metadata (spec ID, version, timestamp)
- **File Storage**: S3 for large specification content
- **Schema**: Specification, SpecVersion tables
- **Access Pattern**: Hybrid (DB for metadata, S3 for content)

#### API Endpoints
```
POST   /api/specifications                    # Create specification
GET    /api/specifications/{id}               # Get specification
PUT    /api/specifications/{id}               # Update specification
DELETE /api/specifications/{id}               # Delete specification
GET    /api/specifications/{id}/versions      # Get version history
POST   /api/specifications/{id}/versions      # Create version
GET    /api/specifications/{id}/versions/{v}  # Get specific version
```

#### Module Organization
```
backend/specification/
├── src/
│   ├── features/
│   │   ├── crud/               # Spec CRUD operations
│   │   ├── versioning/         # Version control
│   │   └── storage/            # S3 storage management
│   ├── shared/
│   ├── db/                     # Database access layer
│   └── index.ts
└── package.json
```

#### Deployment Characteristics
- **Deployment Target**: AWS Lambda / ECS Fargate
- **Dependencies**: DynamoDB, S3, Auth Service

---

### Unit 5: Code Generation Domain Unit

**Type**: Backend Service  
**Deployment**: Independently deployable service  
**Technology**: Node.js/Python

#### Purpose
仕様からのコード生成とコード管理を担当するドメインサービス

#### Scope
コード生成、テンプレート適用、生成コード保存

#### Responsibilities
- 仕様解析
- コードテンプレート適用
- コード生成実行
- 生成コード構造化
- AI Serviceとの連携

#### Components Included
- Code Generation Service Component
- Specification Parser
- Template Engine
- Code Structurer

#### Data Persistence Strategy
- **Database**: DynamoDB for generated code metadata
- **File Storage**: S3 for generated code files
- **Schema**: GeneratedCode, CodeMetadata tables
- **Access Pattern**: Hybrid (DB for metadata, S3 for files)

#### API Endpoints
```
POST   /api/code-generation                    # Generate code
GET    /api/code-generation/{id}               # Get generated code
POST   /api/code-generation/{id}/regenerate    # Regenerate code
GET    /api/code-generation/project/{pid}      # List codes for project
GET    /api/code-generation/{id}/download      # Prepare download
```

#### Module Organization
```
backend/codegen/
├── src/
│   ├── features/
│   │   ├── generator/          # Code generation engine
│   │   ├── parser/             # Specification parser
│   │   ├── templates/          # Template management
│   │   └── ai-integration/     # AI Service client
│   ├── shared/
│   ├── db/                     # Database access layer
│   └── index.ts
└── package.json
```

#### Deployment Characteristics
- **Deployment Target**: AWS Lambda / ECS Fargate
- **Dependencies**: DynamoDB, S3, AI Service Unit, Specification Service
- **Note**: May require longer timeout for code generation

---

### Unit 6: Validation Domain Unit

**Type**: Backend Service  
**Deployment**: Independently deployable service  
**Technology**: Node.js/Python

#### Purpose
仕様検証と整合性チェックを担当するドメインサービス

#### Scope
構文検証、意味検証、整合性チェック

#### Responsibilities
- 仕様の構文検証
- 仕様の意味検証
- 整合性ルール適用
- 検証結果生成

#### Components Included
- Validation Service Component
- Syntax Validator
- Semantic Validator
- Consistency Checker

#### Data Persistence Strategy
- **Database**: DynamoDB for validation results (optional, can be transient)
- **Schema**: ValidationResult table (if persisted)
- **Access Pattern**: Direct database access

#### API Endpoints
```
POST   /api/validation/syntax              # Validate syntax
POST   /api/validation/semantic            # Validate semantics
POST   /api/validation/consistency         # Check consistency
POST   /api/validation/full                # Full validation
GET    /api/validation/rules               # Get validation rules
```

#### Module Organization
```
backend/validation/
├── src/
│   ├── features/
│   │   ├── syntax/             # Syntax validation
│   │   ├── semantic/           # Semantic validation
│   │   ├── consistency/        # Consistency checking
│   │   └── rules/              # Validation rules
│   ├── shared/
│   ├── db/                     # Database access layer (optional)
│   └── index.ts
└── package.json
```

#### Deployment Characteristics
- **Deployment Target**: AWS Lambda / ECS Fargate
- **Dependencies**: Specification Service, Code Generation Service (for consistency check)

---

### Unit 7: AI Service Unit (Independent)

**Type**: Backend Service  
**Deployment**: Independently deployable service  
**Technology**: Node.js/Python

#### Purpose
AI機能の統合と管理を担当する独立サービス

#### Scope
外部AI API統合、AIリクエスト制御、レスポンス処理

#### Responsibilities
- 外部AI API統合（OpenAI、Claude等）
- AIリクエストの制御
- AIレスポンスの処理
- AI機能の抽象化
- 使用量管理（将来の課金対応準備）

#### Components Included
- AI Service Component
- AI Provider Adapter
- AI Request Handler
- AI Response Processor

#### Data Persistence Strategy
- **Database**: DynamoDB for AI usage logs (for future billing)
- **Schema**: AIRequest, AIUsage tables
- **Access Pattern**: Direct database access

#### API Endpoints
```
POST   /api/ai/code-suggestion         # Generate code suggestion
POST   /api/ai/spec-improvement        # Improve specification
POST   /api/ai/code-explanation        # Explain code
POST   /api/ai/question                # Answer question
GET    /api/ai/usage/{userId}          # Get usage statistics
```

#### Module Organization
```
backend/ai-service/
├── src/
│   ├── features/
│   │   ├── suggestions/        # Code suggestions
│   │   ├── improvements/       # Spec improvements
│   │   ├── explanations/       # Code explanations
│   │   └── qa/                 # Q&A
│   ├── providers/
│   │   ├── openai/             # OpenAI adapter
│   │   ├── claude/             # Claude adapter
│   │   └── adapter.ts          # Provider abstraction
│   ├── shared/
│   ├── db/                     # Database access layer
│   └── index.ts
└── package.json
```

#### Deployment Characteristics
- **Deployment Target**: AWS Lambda / ECS Fargate
- **Dependencies**: DynamoDB, External AI APIs (OpenAI, Claude)
- **Note**: Independent unit, no dependency on other backend services
- **Future**: Billing model integration for paid features

---

## Code Organization Strategy

### Monorepo Structure

```
aidlc-workflows/                    # Root repository
├── frontend/                       # Frontend Unit
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
├── backend/
│   ├── auth/                      # Authentication Domain Unit
│   ├── project/                   # Project Domain Unit
│   ├── specification/             # Specification Domain Unit
│   ├── codegen/                   # Code Generation Domain Unit
│   ├── validation/                # Validation Domain Unit
│   └── ai-service/                # AI Service Unit
├── shared/                        # Shared code
│   ├── types/                     # Shared TypeScript types
│   ├── utils/                     # Shared utilities
│   └── constants/                 # Shared constants
├── infrastructure/                # Infrastructure as Code
│   ├── cdk/                       # AWS CDK stacks
│   └── terraform/                 # Terraform configs (if needed)
├── docs/                          # Documentation
├── aidlc-docs/                    # AI-DLC artifacts (current)
├── scripts/                       # Build and deployment scripts
├── package.json                   # Root package.json (for workspaces)
└── README.md
```

### Build Strategy

**Frontend**:
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

**Backend Services** (each unit):
```bash
cd backend/<unit-name>
npm run build
# Output: backend/<unit-name>/dist/
```

**Monorepo Management**:
- Use npm workspaces or Yarn workspaces
- Shared dependencies managed at root level
- Individual service dependencies in each unit

### Deployment Strategy

**Frontend Deployment**:
1. Build static files
2. Upload to S3 bucket
3. Invalidate CloudFront cache
4. URL: https://app.example.com

**Backend Service Deployment** (per unit):
1. Build Docker image or Lambda package
2. Deploy to AWS Lambda / ECS Fargate
3. Update API Gateway routes
4. URL: https://api.example.com/<service-path>

**Deployment Order**:
1. Shared infrastructure (DynamoDB, S3, etc.)
2. Backend services (can be parallel)
3. Frontend (last, after backend is ready)

---

## Unit Summary

| Unit ID | Unit Name | Type | Deployment | Components | Stories |
|---------|-----------|------|------------|------------|---------|
| U1 | Frontend Unit | Frontend SPA | S3 + CloudFront | 7 frontend components | All UI stories |
| U2 | Authentication Domain | Backend Service | Lambda/ECS | Auth, OAuth, Session, Profile | Auth stories |
| U3 | Project Domain | Backend Service | Lambda/ECS | Project CRUD, Query | Project mgmt stories |
| U4 | Specification Domain | Backend Service | Lambda/ECS | Spec CRUD, Versioning | Spec creation stories |
| U5 | Code Generation Domain | Backend Service | Lambda/ECS | Code Gen, Parser, Templates | Code gen stories |
| U6 | Validation Domain | Backend Service | Lambda/ECS | Validators, Consistency | Validation stories |
| U7 | AI Service | Backend Service | Lambda/ECS | AI Integration, Adapters | AI assistance stories |

**Total Units**: 7 (1 Frontend, 6 Backend)

---

## Development Workflow

### Team Organization
- **Function-based teams**: 認証チーム、プロジェクトチーム、エディタチーム、コード生成チーム等
- **Parallel development**: 各チームが異なるドメインユニットを並行開発
- **Frontend team**: フロントエンドユニット内の機能モジュールを並行開発

### Unit Development Sequence
**Recommended order** (considering dependencies):
1. **Week 1 - Sprint 1**:
   - U2: Authentication Domain (必須、他のすべてが依存)
   - U3: Project Domain (並行可能)
   - U1: Frontend Unit - Auth & Project modules (並行可能)

2. **Week 1-2 - Sprint 2**:
   - U4: Specification Domain
   - U6: Validation Domain (並行可能)
   - U7: AI Service (独立、並行可能)
   - U1: Frontend Unit - Editor & Validation modules

3. **Week 2 - Sprint 3**:
   - U5: Code Generation Domain (U4, U7に依存)
   - U1: Frontend Unit - Code Preview module
   - Integration testing

### Continuous Integration
- **Unit tests**: Each unit has own test suite
- **Integration tests**: Test API interactions between units
- **E2E tests**: Full user workflow testing
- **CI/CD**: Automated testing on every commit

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-31  
**Status**: Complete