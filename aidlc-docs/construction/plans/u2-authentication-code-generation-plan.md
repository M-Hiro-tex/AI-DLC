# U2: Authentication Domain - Code Generation Plan

## Overview

本計画では、U2: Authentication Domain のコード生成を段階的に実行します。この計画は、Functional Design、NFR Requirements、NFR Design、Infrastructure Design の全てのアーティファクトに基づいて作成されています。

**Unit**: U2 - Authentication Domain  
**Technology Stack**: Node.js 20.x + TypeScript 5.x + Express.js 4.x  
**Database**: Aurora Serverless v2 (PostgreSQL)  
**Deployment**: AWS Lambda/ECS Fargate  
**Code Location**: `u2-authentication/src/` (workspace root)

## Assigned Stories

**MVP Stories (2)**:
- **D1.1**: ソーシャルログイン（Google）- Backend OAuth integration, Session token management
- **M5.1**: 基本的な使用（認証部分）- Shared authentication for all personas

**Post-MVP Stories (2)** (implementation deferred):
- **M1.2**: チームメンバー活動状況 - User activity tracking
- **M2.1**: チームメンバー招待 - User invitation system

**MVP Focus**: D1.1 and M5.1

---

## Code Generation Steps

### Phase 1: Project Structure Setup

#### Step 1: Initialize Project Structure
**Status**: [ ]  
**Description**: プロジェクトディレクトリ構造とパッケージ設定を作成

**Actions**:
- [ ] Create `u2-authentication/` directory in workspace root
- [ ] Create subdirectories:
  - `u2-authentication/src/` - Application source code
  - `u2-authentication/tests/` - Unit and integration tests
  - `u2-authentication/config/` - Configuration files
  - `u2-authentication/scripts/` - Build and deployment scripts
  - `u2-authentication/docs/` - API documentation
- [ ] Initialize `package.json` with dependencies
- [ ] Create `tsconfig.json` for TypeScript configuration
- [ ] Create `.env.example` for environment variables template
- [ ] Create `.gitignore` for Node.js projects

**Dependencies**:
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0",
    "pg": "^8.11.0",
    "axios": "^1.6.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.0",
    "morgan": "^1.10.0",
    "express-validator": "^7.0.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/node": "^20.10.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^6.0.0",
    "aws-sdk-mock": "^5.9.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0"
  }
}
```

**Story Mapping**: Foundation for D1.1, M5.1

---

### Phase 2: Database Layer Generation

#### Step 2: Generate Database Schema Migration
**Status**: [ ]  
**Description**: データベーススキーマ定義とマイグレーションスクリプトを作成

**Actions**:
- [ ] Create `u2-authentication/src/db/migrations/001_initial_schema.sql`
  - Create `users` table with indexes
  - Create `sessions` table with indexes and foreign keys
  - Create `oauth_states` table with indexes
  - Add trigger for automatic timestamp updates
- [ ] Create `u2-authentication/src/db/schema.ts` - TypeScript type definitions for database entities

**Files to Generate**:
- `u2-authentication/src/db/migrations/001_initial_schema.sql`
- `u2-authentication/src/db/schema.ts`

**Story Mapping**: D1.1 (user and session storage), M5.1 (session management)

---

#### Step 3: Generate Database Connection Pool
**Status**: [ ]  
**Description**: データベース接続プール管理を実装

**Actions**:
- [ ] Create `u2-authentication/src/db/connection.ts`
  - Database connection pool configuration
  - Connection retry logic with exponential backoff
  - Health check function
  - Graceful shutdown handling

**Files to Generate**:
- `u2-authentication/src/db/connection.ts`

**Story Mapping**: D1.1, M5.1 (database access foundation)

---

#### Step 4: Generate Repository Layer
**Status**: [ ]  
**Description**: データベースアクセスレイヤー（Repository Pattern）を実装

**Actions**:
- [ ] Create `u2-authentication/src/repositories/user.repository.ts`
  - `createUser()` - Create new user profile
  - `getUserById()` - Get user by ID
  - `getUserByOAuth()` - Get user by OAuth provider + provider ID
  - `getUserByEmail()` - Get user by email
  - `updateUser()` - Update user profile
  - `updateLastLogin()` - Update last login timestamp
- [ ] Create `u2-authentication/src/repositories/session.repository.ts`
  - `createSession()` - Create new session
  - `getSessionById()` - Get session by session ID
  - `getSessionByRefreshToken()` - Get session by refresh token hash
  - `getUserSessions()` - Get all active sessions for user
  - `updateSessionAccess()` - Update last accessed timestamp
  - `revokeSession()` - Revoke specific session
  - `revokeAllUserSessions()` - Revoke all sessions for user
  - `deleteExpiredSessions()` - Cleanup expired sessions
- [ ] Create `u2-authentication/src/repositories/oauth-state.repository.ts`
  - `createState()` - Create OAuth state token
  - `getState()` - Get state token
  - `markStateUsed()` - Mark state as used
  - `deleteExpiredStates()` - Cleanup expired states

**Files to Generate**:
- `u2-authentication/src/repositories/user.repository.ts`
- `u2-authentication/src/repositories/session.repository.ts`
- `u2-authentication/src/repositories/oauth-state.repository.ts`

**Story Mapping**: D1.1 (OAuth user management), M5.1 (session CRUD)

---

#### Step 5: Generate Repository Unit Tests
**Status**: [x]  
**Description**: Repositoryレイヤーのユニットテストを作成

**Actions**:
- [ ] Create `u2-authentication/tests/repositories/user.repository.test.ts`
  - Test user creation with valid data
  - Test user creation with duplicate email (should fail)
  - Test user retrieval by ID, OAuth, email
  - Test user profile update
  - Test last login timestamp update
- [ ] Create `u2-authentication/tests/repositories/session.repository.test.ts`
  - Test session creation
  - Test session retrieval by ID, refresh token
  - Test session revocation
  - Test expired session cleanup
- [ ] Create `u2-authentication/tests/repositories/oauth-state.repository.test.ts`
  - Test state token creation
  - Test state validation
  - Test state expiration

**Files to Generate**:
- `u2-authentication/tests/repositories/user.repository.test.ts`
- `u2-authentication/tests/repositories/session.repository.test.ts`
- `u2-authentication/tests/repositories/oauth-state.repository.test.ts`

**Story Mapping**: D1.1, M5.1 (test coverage for database layer)

---

### Phase 3: Business Logic Layer Generation

#### Step 6: Generate OAuth Service
**Status**: [x]  
**Description**: OAuth 2.0認証フロー実装（Google, GitHub）

**Actions**:
- [ ] Create `u2-authentication/src/services/oauth.service.ts`
  - `generateAuthUrl()` - Generate OAuth authorization URL with state token
  - `handleCallback()` - Process OAuth callback
  - `exchangeCodeForToken()` - Exchange authorization code for access token
  - `fetchUserInfo()` - Fetch user information from OAuth provider
  - `mapProviderData()` - Map provider-specific data to internal format
- [ ] Create `u2-authentication/src/services/oauth/google.provider.ts`
  - Google OAuth-specific implementation
- [ ] Create `u2-authentication/src/services/oauth/github.provider.ts`
  - GitHub OAuth-specific implementation

**Files to Generate**:
- `u2-authentication/src/services/oauth.service.ts`
- `u2-authentication/src/services/oauth/google.provider.ts`
- `u2-authentication/src/services/oauth/github.provider.ts`

**Story Mapping**: D1.1 (Google OAuth login)

---

#### Step 7: Generate Session Service
**Status**: [x]  
**Description**: セッション管理ロジック実装

**Actions**:
- [ ] Create `u2-authentication/src/services/session.service.ts`
  - `createSession()` - Create new session with JWT and refresh token
  - `validateSession()` - Validate JWT and session status
  - `refreshSession()` - Refresh access token using refresh token
  - `terminateSession()` - Logout and revoke session
  - `terminateAllSessions()` - Logout all user sessions
  - `getUserSessions()` - List active sessions for user

**Files to Generate**:
- `u2-authentication/src/services/session.service.ts`

**Story Mapping**: D1.1 (session creation), M5.1 (session validation)

---

#### Step 8: Generate Token Service
**Status**: [x]  
**Description**: JWT生成・検証ロジック実装

**Actions**:
- [ ] Create `u2-authentication/src/services/token.service.ts`
  - `generateAccessToken()` - Generate JWT access token
  - `generateRefreshToken()` - Generate opaque refresh token
  - `verifyAccessToken()` - Verify JWT signature and expiration
  - `hashToken()` - Hash tokens for database storage (SHA-256)
  - `compareTokenHash()` - Compare token with hashed value

**Files to Generate**:
- `u2-authentication/src/services/token.service.ts`

**Story Mapping**: D1.1 (token generation), M5.1 (token validation)

---

#### Step 9: Generate User Profile Service
**Status**: [x]  
**Description**: ユーザープロファイル管理ロジック実装

**Actions**:
- [ ] Create `u2-authentication/src/services/user.service.ts`
  - `createOrUpdateUser()` - Create new user or update existing on OAuth login
  - `getUserProfile()` - Get user profile by ID
  - `updateUserProfile()` - Update user profile information
  - `validateEmailUniqueness()` - Check email uniqueness

**Files to Generate**:
- `u2-authentication/src/services/user.service.ts`

**Story Mapping**: D1.1 (user profile creation), M5.1 (profile retrieval)

---

#### Step 10: Generate Business Logic Unit Tests
**Status**: [x]  
**Description**: ビジネスロジックレイヤーのユニットテストを作成

**Actions**:
- [ ] Create `u2-authentication/tests/services/oauth.service.test.ts`
  - Test OAuth URL generation with state token
  - Test token exchange with valid code
  - Test token exchange with invalid code (should fail)
  - Test user info fetching
  - Test Google and GitHub provider mapping
- [ ] Create `u2-authentication/tests/services/session.service.test.ts`
  - Test session creation with valid user
  - Test session validation with valid JWT
  - Test session validation with expired JWT (should fail)
  - Test session refresh with valid refresh token
  - Test session termination
- [ ] Create `u2-authentication/tests/services/token.service.test.ts`
  - Test JWT generation with correct payload
  - Test JWT verification with valid token
  - Test JWT verification with invalid signature (should fail)
  - Test refresh token generation
  - Test token hashing and comparison
- [ ] Create `u2-authentication/tests/services/user.service.test.ts`
  - Test user creation with valid OAuth data
  - Test user update on subsequent login
  - Test email uniqueness validation

**Files to Generate**:
- `u2-authentication/tests/services/oauth.service.test.ts`
- `u2-authentication/tests/services/session.service.test.ts`
- `u2-authentication/tests/services/token.service.test.ts`
- `u2-authentication/tests/services/user.service.test.ts`

**Story Mapping**: D1.1, M5.1 (test coverage for business logic)

---

### Phase 4: API Layer Generation

#### Step 11: Generate Express Middleware
**Status**: [x]  
**Description**: 共通ミドルウェアを実装

**Actions**:
- [ ] Create `u2-authentication/src/middleware/auth.middleware.ts`
  - `requireAuth()` - Validate JWT and attach user to request
  - `extractBearerToken()` - Extract token from Authorization header
- [ ] Create `u2-authentication/src/middleware/error.middleware.ts`
  - `errorHandler()` - Global error handling middleware
  - `notFoundHandler()` - 404 handler
- [ ] Create `u2-authentication/src/middleware/rate-limit.middleware.ts`
  - `loginRateLimiter` - Rate limit for login endpoints
  - `refreshRateLimiter` - Rate limit for refresh endpoint
  - `profileRateLimiter` - Rate limit for profile endpoints
- [ ] Create `u2-authentication/src/middleware/validation.middleware.ts`
  - Request validation using express-validator
- [ ] Create `u2-authentication/src/middleware/logging.middleware.ts`
  - Request/response logging
  - Correlation ID generation

**Files to Generate**:
- `u2-authentication/src/middleware/auth.middleware.ts`
- `u2-authentication/src/middleware/error.middleware.ts`
- `u2-authentication/src/middleware/rate-limit.middleware.ts`
- `u2-authentication/src/middleware/validation.middleware.ts`
- `u2-authentication/src/middleware/logging.middleware.ts`

**Story Mapping**: M5.1 (authentication middleware for all requests)

---

#### Step 12: Generate API Controllers
**Status**: [x]  
**Description**: RESTful APIコントローラーを実装

**Actions**:
- [ ] Create `u2-authentication/src/controllers/auth.controller.ts`
  - `POST /auth/google/login` - Initiate Google OAuth flow
  - `GET /auth/google/callback` - Handle Google OAuth callback
  - `POST /auth/github/login` - Initiate GitHub OAuth flow
  - `GET /auth/github/callback` - Handle GitHub OAuth callback
  - `POST /auth/refresh` - Refresh access token
  - `POST /auth/logout` - Logout and revoke session
  - `POST /auth/logout-all` - Logout all sessions
- [ ] Create `u2-authentication/src/controllers/user.controller.ts`
  - `GET /users/me` - Get current user profile
  - `GET /users/me/sessions` - List active sessions
- [ ] Create `u2-authentication/src/controllers/health.controller.ts`
  - `GET /health` - Health check endpoint
  - Check database connectivity
  - Return service status

**Files to Generate**:
- `u2-authentication/src/controllers/auth.controller.ts`
- `u2-authentication/src/controllers/user.controller.ts`
- `u2-authentication/src/controllers/health.controller.ts`

**Story Mapping**: D1.1 (OAuth endpoints), M5.1 (session management endpoints)

---

#### Step 13: Generate API Routes
**Status**: [x]  
**Description**: Expressルーティング設定を実装

**Actions**:
- [ ] Create `u2-authentication/src/routes/auth.routes.ts`
  - Map auth controller methods to routes
  - Apply rate limiting middleware
  - Apply validation middleware
- [ ] Create `u2-authentication/src/routes/user.routes.ts`
  - Map user controller methods to routes
  - Apply authentication middleware
  - Apply rate limiting middleware
- [ ] Create `u2-authentication/src/routes/health.routes.ts`
  - Map health controller to route
- [ ] Create `u2-authentication/src/routes/index.ts`
  - Aggregate all routes
  - Version prefix (/api/v1)

**Files to Generate**:
- `u2-authentication/src/routes/auth.routes.ts`
- `u2-authentication/src/routes/user.routes.ts`
- `u2-authentication/src/routes/health.routes.ts`
- `u2-authentication/src/routes/index.ts`

**Story Mapping**: D1.1, M5.1 (API endpoint routing)

---

#### Step 14: Generate API Layer Unit Tests
**Status**: [ ]  
**Description**: APIレイヤーのユニットテスト・統合テストを作成

**Files Status**:
- ✅ `auth.controller.test.ts` - 部分的に実装済み（要完成）
- ✅ `user.controller.test.ts` - 部分的に実装済み（要完成）
- ✅ `oauth-flow.test.ts` - スケルトンのみ（要完全実装）

**Actions**:

### A. Complete `u2-authentication/tests/controllers/auth.controller.test.ts`

**Currently Implemented**:
- [x] Google OAuth URL generation test
- [x] Invalid state error handling test
- [x] Missing authorization code error handling test

**Need to Implement**:
- [ ] Google OAuth callback success case
  - Mock OAuthService.handleCallback() to return user info
  - Mock UserService.createOrUpdateUser() to return user
  - Mock SessionService.createSession() to return session tokens
  - Assert response contains accessToken, refreshToken, expiresAt, user
- [ ] Token refresh success case
  - Mock SessionService.refreshSession() to return new tokens
  - Assert new accessToken and refreshToken are returned
- [ ] Token refresh with invalid refresh token (should fail 401)
  - Mock SessionService to throw UnauthorizedError
  - Assert error is passed to next()
- [ ] Token refresh without session ID (should fail 400)
  - Already has basic structure, complete assertions
- [ ] Logout success case
  - Mock authenticated request with user
  - Mock SessionService.terminateSession()
  - Assert success message
- [ ] Logout without authentication (should fail 401)
  - Mock request without user
  - Assert UnauthorizedError

### B. Complete `u2-authentication/tests/controllers/user.controller.test.ts`

**Currently Implemented**:
- [x] GET /users/me without authentication (should fail)

**Need to Implement**:
- [ ] GET /users/me success case
  - Mock UserService.getUserProfile() to return user
  - Assert response contains user profile with all fields
- [ ] GET /users/me when user not found
  - Mock UserService to throw NotFoundError
  - Assert error is passed to next()
- [ ] GET /users/me/sessions success case
  - Mock SessionService.getUserSessions() to return sessions array
  - Assert response contains sessions with correct fields
- [ ] GET /users/me/sessions when no sessions exist
  - Mock SessionService to return empty array
  - Assert response contains empty sessions array
- [ ] GET /users/me/sessions without authentication
  - Mock request without user
  - Assert UnauthorizedError

### C. Complete `u2-authentication/tests/integration/oauth-flow.test.ts`

**Currently Implemented**:
- ❌ All tests are TODO skeletons only

**Need to Implement**:

**Setup & Teardown**:
- [ ] beforeAll(): Initialize test Express app instance
- [ ] beforeAll(): Set up test database connection (or use in-memory DB)
- [ ] beforeAll(): Seed initial test data if needed
- [ ] afterAll(): Clean up test data
- [ ] afterAll(): Close database connections

**Google OAuth Flow**:
- [ ] Test POST /api/v1/auth/google/login
  - Assert returns authUrl containing 'accounts.google.com'
  - Assert returns provider: 'google'
- [ ] Test GET /api/v1/auth/google/callback with valid code and state
  - Mock OAuth provider response
  - Assert session is created
  - Store accessToken, refreshToken, sessionId for subsequent tests
- [ ] Test session creation verification
  - Use returned accessToken to access protected endpoint
  - Assert user data is correctly stored

**GitHub OAuth Flow**:
- [ ] Test POST /api/v1/auth/github/login
  - Assert returns authUrl containing 'github.com'
  - Assert returns provider: 'github'
- [ ] Test GET /api/v1/auth/github/callback with valid code and state
  - Mock OAuth provider response
  - Assert session is created

**Session Management Flow**:
- [ ] Test access to protected endpoint (GET /api/v1/users/me) with valid token
  - Assert returns user profile
- [ ] Test POST /api/v1/auth/refresh with valid refresh token
  - Assert returns new accessToken and refreshToken
- [ ] Test POST /api/v1/auth/logout
  - Assert session is revoked
- [ ] Test protected endpoint access after logout (should fail 401)

**Token Refresh Flow**:
- [ ] Test refreshing expired access token
  - Create session with short-lived access token
  - Wait for expiration
  - Refresh and verify new token works
- [ ] Test refresh with invalid refresh token (should fail 401)
- [ ] Test refresh with revoked session (should fail 401)

**Multi-Session Flow**:
- [ ] Test creating multiple sessions for same user
  - Create 2-3 sessions with different tokens
  - Assert all sessions are active
- [ ] Test GET /api/v1/users/me/sessions
  - Assert returns all active sessions
- [ ] Test POST /api/v1/auth/logout-all
  - Assert all sessions are revoked
  - Verify none of the tokens work anymore

**Error Handling**:
- [ ] Test OAuth callback with invalid state (should fail 400)
- [ ] Test OAuth callback without authorization code (should fail 400)
- [ ] Test OAuth provider errors (mock provider error response)

**Files to Complete**:
- `u2-authentication/tests/controllers/auth.controller.test.ts`
- `u2-authentication/tests/controllers/user.controller.test.ts`
- `u2-authentication/tests/integration/oauth-flow.test.ts`

**Story Mapping**: D1.1, M5.1 (test coverage for API layer)

**Notes**:
- Tests marked as TODO will be implemented in a future step
- Focus is on establishing test structure and basic assertions
- Full mock implementation and edge case coverage to be added later

---

### Phase 5: Application Entry Point

#### Step 15: Generate Express Application
**Status**: [x]  
**Description**: Expressアプリケーションのエントリーポイントを実装

**Actions**:
- [ ] Create `u2-authentication/src/app.ts`
  - Initialize Express app
  - Configure middleware (helmet, cors, morgan, etc.)
  - Mount routes
  - Configure error handling
  - Export app for Lambda/ECS
- [ ] Create `u2-authentication/src/server.ts`
  - HTTP server setup for local development
  - Graceful shutdown handling
  - Port configuration
- [ ] Create `u2-authentication/src/lambda.ts` (AWS Lambda handler)
  - Wrap Express app with serverless-http
  - Export Lambda handler function
- [ ] Create `u2-authentication/src/config/index.ts`
  - Centralized configuration management
  - Environment variable loading
  - Secrets Manager integration

**Files to Generate**:
- `u2-authentication/src/app.ts`
- `u2-authentication/src/server.ts`
- `u2-authentication/src/lambda.ts`
- `u2-authentication/src/config/index.ts`

**Story Mapping**: D1.1, M5.1 (application bootstrap)

---

### Phase 6: Utilities and Helpers

#### Step 16: Generate Utility Modules
**Status**: [x]  
**Description**: 共通ユーティリティモジュールを実装

**Actions**:
- [x] Create `u2-authentication/src/utils/logger.ts`
  - Structured logging utility
  - Log levels (ERROR, WARN, INFO, DEBUG)
  - CloudWatch integration
- [x] Create `u2-authentication/src/utils/errors.ts`
  - Custom error classes
  - Error response formatting
- [x] Create `u2-authentication/src/utils/validators.ts`
  - Email format validation
  - Display name validation
  - Token format validation
- [x] Create `u2-authentication/src/utils/secrets.ts`
  - AWS Secrets Manager client
  - Secret caching with TTL
  - Automatic secret refresh

**Files to Generate**:
- `u2-authentication/src/utils/logger.ts`
- `u2-authentication/src/utils/errors.ts`
- `u2-authentication/src/utils/validators.ts`
- `u2-authentication/src/utils/secrets.ts`

**Story Mapping**: D1.1, M5.1 (supporting utilities)

---

### Phase 7: Configuration and Documentation

#### Step 17: Generate Configuration Files
**Status**: [x]  
**Description**: アプリケーション設定ファイルを作成

**Actions**:
- [ ] Create `u2-authentication/.env.example`
  - Template for environment variables
  - Documentation for each variable
- [ ] Create `u2-authentication/tsconfig.json`
  - TypeScript compiler configuration
  - Strict mode enabled
- [ ] Create `u2-authentication/jest.config.js`
  - Jest test runner configuration
  - Coverage thresholds (80%)
- [ ] Create `u2-authentication/.eslintrc.js`
  - ESLint configuration
  - TypeScript rules
- [ ] Create `u2-authentication/.prettierrc`
  - Code formatting rules

**Files to Generate**:
- `u2-authentication/.env.example`
- `u2-authentication/tsconfig.json`
- `u2-authentication/jest.config.js`
- `u2-authentication/.eslintrc.js`
- `u2-authentication/.prettierrc`

**Story Mapping**: D1.1, M5.1 (development environment setup)

---

#### Step 18: Generate API Documentation
**Status**: [x]  
**Description**: API仕様ドキュメントを作成

**Actions**:
- [ ] Create `u2-authentication/docs/api-specification.md`
  - OpenAPI/Swagger specification
  - All endpoints documented
  - Request/response schemas
  - Authentication requirements
  - Error responses
- [ ] Create `u2-authentication/docs/authentication-flow.md`
  - OAuth flow diagrams
  - Session management flow
  - Token refresh flow
  - Security considerations

**Files to Generate**:
- `u2-authentication/docs/api-specification.md`
- `u2-authentication/docs/authentication-flow.md`

**Story Mapping**: D1.1, M5.1 (API documentation for consumers)

---

#### Step 19: Generate README and Development Guide
**Status**: [x]  
**Description**: README とセットアップガイドを作成

**Actions**:
- [ ] Create `u2-authentication/README.md`
  - Project overview
  - Prerequisites
  - Installation instructions
  - Running locally
  - Running tests
  - Deployment instructions
  - Environment variables reference
- [ ] Create `u2-authentication/DEVELOPMENT.md`
  - Development workflow
  - Code structure
  - Testing strategy
  - Debugging tips
  - Contributing guidelines

**Files to Generate**:
- `u2-authentication/README.md`
- `u2-authentication/DEVELOPMENT.md`

**Story Mapping**: D1.1, M5.1 (developer onboarding)

---

### Phase 8: Infrastructure and Deployment

#### Step 20: Generate Terraform/CDK Infrastructure Code
**Status**: [x]  
**Description**: インフラストラクチャコード（Terraform or AWS CDK）を作成

**Actions**:
- [ ] Create `u2-authentication/infrastructure/main.tf` (or CDK equivalent)
  - VPC and networking configuration
  - Security groups
  - Aurora Serverless v2 cluster
  - Lambda function / ECS Fargate service
  - API Gateway
  - WAF rules
  - CloudWatch alarms
  - Secrets Manager
  - IAM roles and policies
- [ ] Create `u2-authentication/infrastructure/variables.tf`
  - Infrastructure variables (environment-specific)
- [ ] Create `u2-authentication/infrastructure/outputs.tf`
  - Output values (API endpoint, database endpoint)

**Files to Generate**:
- `u2-authentication/infrastructure/main.tf`
- `u2-authentication/infrastructure/variables.tf`
- `u2-authentication/infrastructure/outputs.tf`

**Story Mapping**: D1.1, M5.1 (deployment infrastructure)

---

#### Step 21: Generate Deployment Scripts
**Status**: [x]  
**Description**: デプロイメント自動化スクリプトを作成

**Actions**:
- [ ] Create `u2-authentication/scripts/build.sh`
  - TypeScript compilation
  - Dependency installation
  - Docker image build (if ECS)
- [ ] Create `u2-authentication/scripts/deploy.sh`
  - Infrastructure deployment (Terraform/CDK)
  - Application deployment (Lambda/ECS)
  - Database migration execution
  - Smoke tests
- [ ] Create `u2-authentication/scripts/rollback.sh`
  - Rollback to previous version
- [ ] Create `u2-authentication/scripts/migrate-db.sh`
  - Database migration execution script

**Files to Generate**:
- `u2-authentication/scripts/build.sh`
- `u2-authentication/scripts/deploy.sh`
- `u2-authentication/scripts/rollback.sh`
- `u2-authentication/scripts/migrate-db.sh`

**Story Mapping**: D1.1, M5.1 (deployment automation)

---

#### Step 22: Generate CI/CD Pipeline Configuration
**Status**: [x]  
**Description**: GitHub Actions ワークフローを作成

**Actions**:
- [ ] Create `u2-authentication/.github/workflows/ci.yml`
  - Lint and type check
  - Run unit tests
  - Run integration tests
  - Generate coverage report
  - Security scanning (npm audit)
- [ ] Create `u2-authentication/.github/workflows/cd.yml`
  - Build Docker image
  - Push to ECR
  - Deploy to staging (on merge to main)
  - Deploy to production (on tag)
  - Blue-green deployment strategy
  - Automated rollback on failure

**Files to Generate**:
- `u2-authentication/.github/workflows/ci.yml`
- `u2-authentication/.github/workflows/cd.yml`

**Story Mapping**: D1.1, M5.1 (CI/CD automation)

---

#### Step 23: Generate Monitoring and Observability Configuration
**Status**: [x]  
**Description**: CloudWatch + X-Ray 監視設定を作成

**Actions**:
- [ ] Create `u2-authentication/config/cloudwatch-dashboard.json`
  - Custom CloudWatch dashboard
  - Key metrics visualization
  - Authentication success/failure rates
  - Latency percentiles
  - Error rates
- [ ] Create `u2-authentication/config/cloudwatch-alarms.json`
  - Critical alarms (PagerDuty)
  - Warning alarms (Slack)
  - Info alarms (Slack)
- [ ] Create `u2-authentication/src/config/xray.ts`
  - X-Ray SDK configuration
  - Trace sampling rules
  - Custom segments for OAuth calls

**Files to Generate**:
- `u2-authentication/config/cloudwatch-dashboard.json`
- `u2-authentication/config/cloudwatch-alarms.json`
- `u2-authentication/src/config/xray.ts`

**Story Mapping**: D1.1, M5.1 (monitoring and observability)

---

### Phase 9: Final Validation

#### Step 24: Generate Smoke Tests
**Status**: [x]  
**Description**: デプロイ後のスモークテストを作成

**Actions**:
- [ ] Create `u2-authentication/tests/smoke/health-check.test.ts`
  - Test /health endpoint returns 200
  - Test database connectivity
- [ ] Create `u2-authentication/tests/smoke/oauth-initiation.test.ts`
  - Test OAuth URL generation endpoints
  - Test endpoints return valid URLs

**Files to Generate**:
- `u2-authentication/tests/smoke/health-check.test.ts`
- `u2-authentication/tests/smoke/oauth-initiation.test.ts`

**Story Mapping**: D1.1, M5.1 (deployment verification)

---

#### Step 25: Code Generation Summary
**Status**: [x]  
**Description**: コード生成完了サマリーを作成

**Actions**:
- [ ] Create `aidlc-docs/construction/u2-authentication/code/code-generation-summary.md`
  - List all generated files
  - Story coverage summary
  - Test coverage report
  - Deployment readiness checklist
  - Known limitations (Post-MVP features deferred)
  - Next steps (U1 Frontend integration points)

**Files to Generate**:
- `aidlc-docs/construction/u2-authentication/code/code-generation-summary.md`

**Story Mapping**: D1.1, M5.1 (completion documentation)

---

## Execution Summary

**Total Steps**: 25  
**Total Files to Generate**: ~70+ files  
**Estimated Complexity**: High (complete authentication service)

**MVP Story Coverage**:
- ✅ D1.1: Google OAuth login (Steps 1-25)
- ✅ M5.1: Session management and authentication middleware (Steps 1-25)

**Post-MVP Stories** (Deferred to future implementation):
- ⏸️ M1.2: User activity tracking
- ⏸️ M2.1: User invitation system

**Technology Stack Applied**:
- Node.js 20.x + TypeScript 5.x
- Express.js 4.x
- Aurora Serverless v2 (PostgreSQL)
- AWS Lambda/ECS Fargate
- AWS API Gateway
- AWS Secrets Manager
- CloudWatch + X-Ray

**Code Location**:
- Application code: `u2-authentication/src/` (workspace root)
- Tests: `u2-authentication/tests/`
- Infrastructure: `u2-authentication/infrastructure/`
- Documentation: `u2-authentication/docs/` and `aidlc-docs/construction/u2-authentication/code/`

---

**Plan Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Ready for Approval