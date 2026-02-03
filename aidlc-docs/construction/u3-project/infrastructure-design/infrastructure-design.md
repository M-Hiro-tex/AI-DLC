# U3: Project Domain - Infrastructure Design

## Overview

本ドキュメントでは、U3: Project Domainの論理コンポーネントを実際のAWSインフラストラクチャサービスにマッピングします。

**Focus**: 論理設計から物理インフラへの具体的なマッピング

---

## 1. Compute Infrastructure

### 1.1 Lambda Functions

**Architecture**: ドメイン単位のLambda構成

**Lambda Configuration**:

| Domain | Function Name | Runtime | Memory | Timeout | Description |
|--------|---------------|---------|--------|---------|-------------|
| **U2: Authentication** | `u2-authentication-function` | Node.js 20.x | 512 MB | 30s | OAuth認証、セッション管理、トークン検証 |
| **U3: Project** | `u3-project-function` | Node.js 20.x | 1024 MB | 30s | プロジェクト管理、テンプレート、マイルストーン |

**Lambda Function Design**:

```typescript
// U3: Project Domain Lambda Handler
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { app } from './app'; // Express application
import serverlessExpress from '@vendia/serverless-express';

// Lambda Powertools
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';

const tracer = new Tracer({ serviceName: 'project-service' });
const logger = new Logger({ serviceName: 'project-service' });
const metrics = new Metrics({ namespace: 'ProjectDomain', serviceName: 'project-service' });

// Serverless Express wrapper
const serverlessExpressInstance = serverlessExpress({ app });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  return serverlessExpressInstance(event);
};
```

**Environment Variables**:
- `TABLE_NAME`: ProjectDomain（DynamoDBテーブル名）
- `LOG_LEVEL`: INFO（CloudWatch Logs）
- `REGION`: ap-northeast-1
- `STAGE`: dev | prod
- Secrets Manager経由: JWT_SECRET, その他の機密情報

**IAM Execution Role**:
- Role Name: `u3-project-lambda-execution-role`
- Permissions:
  - DynamoDB: GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan（ProjectDomainテーブル）
  - CloudWatch Logs: CreateLogGroup, CreateLogStream, PutLogEvents
  - Secrets Manager: GetSecretValue（JWT_SECRET等）
  - X-Ray: PutTraceSegments, PutTelemetryRecords

---

### 1.2 API Gateway

**Type**: REST API

**Endpoint**: `https://{api-id}.execute-api.ap-northeast-1.amazonaws.com/{stage}/`

**Stages**:
- `dev`: 開発環境
- `prod`: 本番環境

**Integration**: Lambda Proxy Integration

**CORS Configuration**:
```json
{
  "allowOrigins": ["*"],
  "allowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "allowHeaders": ["Content-Type", "Authorization", "X-Requested-With"],
  "exposeHeaders": ["X-Total-Count"],
  "maxAge": 3600
}
```

**Rate Limiting**:
- **Throttle Burst**: 200 requests
- **Throttle Rate**: 100 requests/second
- **Purpose**: DoS攻撃防止

**Endpoints**:

```
/api/v1/projects
  - GET    /                    # List projects (paginated)
  - POST   /                    # Create project
  - GET    /:id                 # Get project by ID
  - PUT    /:id                 # Update project
  - DELETE /:id                 # Delete project (soft delete)
  - POST   /:id/share           # Share project with user

/api/v1/templates
  - GET    /                    # List templates
  - POST   /                    # Create template
  - GET    /:id                 # Get template by ID

/api/v1/health
  - GET    /                    # Health check
```

**Authorization**: 
- All endpoints (except `/health`) require JWT token in `Authorization: Bearer <token>` header
- Authentication handled by middleware in Lambda function

---

## 2. Database Infrastructure

### 2.1 DynamoDB

**Table Name**: `ProjectDomain`

**Billing Mode**: **On-Demand**（使用量に応じて課金、予測不要）

**Primary Index**:
```
PK (Partition Key): String
SK (Sort Key): String
```

**Key Patterns**:
```
Project:
  PK: PROJECT#{uuid}
  SK: METADATA

Template:
  PK: TEMPLATE#{uuid}
  SK: TEMPLATE

Milestone:
  PK: MILESTONE#{userId}
  SK: {milestoneId}
```

**Global Secondary Indexes**:

**GSI1: OwnerIndex**
```
GSI1PK: OWNER#{ownerId}
GSI1SK: {updatedAt} (ISO timestamp)
Projection: ALL
Purpose: List projects by owner, sorted by updated date
```

**GSI2: TemplateIndex**
```
GSI2PK: TEMPLATE
GSI2SK: {category}#{name}
Projection: ALL
Purpose: List all templates, optionally filtered by category
```

**Attributes**:
```typescript
interface DynamoDBItem {
  // Primary Index
  PK: string;
  SK: string;
  
  // GSI Attributes
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  
  // Entity Type
  EntityType: 'Project' | 'Template' | 'Milestone';
  
  // Project Attributes
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
  
  // Template Attributes (for templates)
  // ...
  
  // Milestone Attributes (for milestones)
  // ...
}
```

**Capacity Settings**:
- **Read Capacity**: Auto-scaling (On-Demand)
- **Write Capacity**: Auto-scaling (On-Demand)
- **Backup**: なし（開発環境のみ、本番は別途検討）
- **Point-in-Time Recovery (PITR)**: 無効（開発環境）

**Consistency Strategy**:
- **Strongly Consistent Read**: CRUD直後の取得（`ConsistentRead: true`）
- **Eventually Consistent Read**: 一覧取得、検索（`ConsistentRead: false`）

---

## 3. Security Infrastructure

### 3.1 IAM Roles

**Lambda Execution Roles**: ドメインごとに1つのロール

**U2: Authentication Domain**:
- Role Name: `u2-authentication-lambda-execution-role`
- Permissions:
  - DynamoDB: GetItem, PutItem, UpdateItem, DeleteItem, Query (AuthenticationDomainテーブル)
  - Secrets Manager: GetSecretValue (JWT_SECRET等)
  - CloudWatch Logs: Full access
  - X-Ray: Full access

**U3: Project Domain**:
- Role Name: `u3-project-lambda-execution-role`
- Permissions:
  - DynamoDB: GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan (ProjectDomainテーブル)
  - Secrets Manager: GetSecretValue (JWT_SECRET等)
  - CloudWatch Logs: Full access
  - X-Ray: Full access

**Principle of Least Privilege**: 各ロールは最小限の権限のみを持つ

---

### 3.2 Secrets Manager

**Usage**: すべての環境変数（包括的）

**Secrets**:
```json
{
  "u3-project-secrets-dev": {
    "JWT_SECRET": "dev-jwt-secret-value",
    "DATABASE_TABLE": "ProjectDomain-dev",
    "API_ENDPOINT": "https://dev-api.example.com"
  },
  "u3-project-secrets-prod": {
    "JWT_SECRET": "prod-jwt-secret-value",
    "DATABASE_TABLE": "ProjectDomain-prod",
    "API_ENDPOINT": "https://api.example.com"
  }
}
```

**Rotation**: 手動（将来的に自動ローテーション検討）

**Encryption**: AWS KMS（デフォルトキー）

---

### 3.3 Networking

**VPC**: 不要（開発用）

**Rationale**:
- Lambda関数はVPC外に配置（パブリック環境）
- DynamoDB公開エンドポイント使用（シンプル）
- 開発環境のため、セキュリティ要件は緩い
- 本番環境ではVPC配置を検討

**API Gateway**: インターネットからアクセス可能

**Security Groups**: 不要（VPC未使用のため）

---

## 4. Monitoring & Observability

### 4.1 CloudWatch Logs

**Log Groups**:
- `/aws/lambda/u3-project-function-dev`
- `/aws/lambda/u3-project-function-prod`

**Log Retention**: 1週間（7日間）

**Log Level**: INFO（本番）、DEBUG（開発）

**Structured Logging**: Lambda Powertools Logger使用

**Log Format**:
```json
{
  "timestamp": "2026-02-01T12:00:00.000Z",
  "level": "INFO",
  "service": "project-service",
  "message": "Project created",
  "projectId": "123",
  "ownerId": "user-1"
}
```

---

### 4.2 CloudWatch Metrics

**Namespace**: `ProjectDomain`

**Metrics Scope**: 包括的（技術+ビジネスメトリクス）

**Technical Metrics**:
- `APILatency`: API呼び出しレイテンシ（ミリ秒）
- `DynamoDBLatency`: DynamoDB操作レイテンシ（ミリ秒）
- `ErrorCount`: エラー発生回数
- `LambdaInvocations`: Lambda呼び出し回数
- `LambdaDuration`: Lambda実行時間
- `LambdaThrottles`: Lambda関数のスロットリング回数

**Business Metrics**:
- `ProjectCreated`: プロジェクト作成数
- `ProjectUpdated`: プロジェクト更新数
- `ProjectDeleted`: プロジェクト削除数
- `ProjectShared`: プロジェクト共有数
- `ActiveUsers`: アクティブユーザー数

**Dimensions**:
- `Environment`: dev | prod
- `Domain`: project
- `Endpoint`: /api/v1/projects, /api/v1/templates, etc.

---

### 4.3 CloudWatch Alarms

**Alarm Scope**: 包括的（Errors + Latency + Throttles + Custom Metrics）

**Alarms**:

**1. Lambda Errors Alarm**
```
Metric: AWS/Lambda Errors
Threshold: > 5 errors in 5 minutes
Action: SNS notification
```

**2. High Latency Alarm**
```
Metric: ProjectDomain/APILatency
Threshold: p99 > 1000ms
Action: SNS notification
```

**3. Lambda Throttling Alarm**
```
Metric: AWS/Lambda Throttles
Threshold: > 10 throttles in 5 minutes
Action: SNS notification
```

**4. DynamoDB Throttling Alarm**
```
Metric: AWS/DynamoDB UserErrors (ProvisionedThroughputExceededException)
Threshold: > 5 errors in 5 minutes
Action: SNS notification
```

**5. Custom Business Metric Alarm**
```
Metric: ProjectDomain/ErrorCount
Threshold: > 10 errors in 10 minutes
Action: SNS notification
```

**Notification**: SNS Topic → Email/Slack integration

---

### 4.4 AWS X-Ray

**Tracing**: 有効

**Sampling Rate**: 100%（開発）、5%（本番）

**Traced Operations**:
- Lambda function invocations
- DynamoDB operations（自動）
- HTTP requests（API Gateway → Lambda）
- Service method calls（`@tracer.captureMethod()`）

**Trace Segments**:
```
API Gateway
  ↓
Lambda Handler
  ↓
Express Middleware Chain
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
DynamoDB
```

**X-Ray Console**: Service Map、Trace分析、レイテンシ分析

---

## 5. CDK Stack Design

### 5.1 Stack分割戦略

**Strategy**: 環境 × ドメイン + 共有基盤

**Total Stacks**: 5

**Stack List**:

**1. Shared-Base-Stack**（環境共通/基盤）
- Route53（ドメイン管理）
- ACM（SSL証明書）
- WAF（Web Application Firewall）
- API Gateway（共有REST API）
- Purpose: 環境間で共有される基盤リソース

**2. Dev-Auth-Stack**（開発用：認証ドメイン）
- Lambda Function: `u2-authentication-function-dev`
- IAM Role: `u2-authentication-lambda-execution-role-dev`
- DynamoDB Table: `AuthenticationDomain-dev`（U2ドメイン）
- Secrets Manager: `u2-auth-secrets-dev`

**3. Dev-Project-Stack**（開発用：プロジェクトドメイン）
- Lambda Function: `u3-project-function-dev`
- IAM Role: `u3-project-lambda-execution-role-dev`
- DynamoDB Table: `ProjectDomain-dev`（U3ドメイン、データ一体型）
- Secrets Manager: `u3-project-secrets-dev`

**4. Prod-Auth-Stack**（本番用：認証ドメイン）
- Lambda Function: `u2-authentication-function-prod`
- IAM Role: `u2-authentication-lambda-execution-role-prod`
- DynamoDB Table: `AuthenticationDomain-prod`（U2ドメイン）
- Secrets Manager: `u2-auth-secrets-prod`

**5. Prod-Project-Stack**（本番用：プロジェクトドメイン）
- Lambda Function: `u3-project-function-prod`
- IAM Role: `u3-project-lambda-execution-role-prod`
- DynamoDB Table: `ProjectDomain-prod`（U3ドメイン、データ一体型）
- Secrets Manager: `u3-project-secrets-prod`

**Stack Dependencies**:
```
Shared-Base-Stack
  ↓ (API Gateway export)
Dev-Auth-Stack, Dev-Project-Stack
Prod-Auth-Stack, Prod-Project-Stack
```

**Rationale**:
- **Shared-Base-Stack**: 環境共通の基盤リソース、更新頻度低
- **環境別Stack**: dev/prod分離、独立デプロイ可能
- **ドメイン別Stack**: Auth/Project分離、ドメイン境界の明確化
- **データ一体型**: Lambda + DynamoDBを同じStackに配置、更新頻度同じ

---

### 5.2 環境別設定管理

**Method**: 別ファイル（`config/dev.ts`, `config/prod.ts`）

**Configuration Files**:

**config/dev.ts**:
```typescript
export const devConfig = {
  environment: 'dev',
  region: 'ap-northeast-1',
  
  // Lambda
  lambda: {
    memory: {
      u2Authentication: 512,
      u3Project: 1024
    },
    timeout: 30,
    runtime: 'nodejs20.x'
  },
  
  // DynamoDB
  dynamodb: {
    billingMode: 'PAY_PER_REQUEST',
    pitrEnabled: false
  },
  
  // API Gateway
  apiGateway: {
    throttle: {
      burstLimit: 200,
      rateLimit: 100
    }
  },
  
  // Monitoring
  monitoring: {
    logRetentionDays: 7,
    xraySamplingRate: 1.0 // 100%
  }
};
```

**config/prod.ts**:
```typescript
export const prodConfig = {
  environment: 'prod',
  region: 'ap-northeast-1',
  
  // Lambda
  lambda: {
    memory: {
      u2Authentication: 512,
      u3Project: 1024
    },
    timeout: 30,
    runtime: 'nodejs20.x'
  },
  
  // DynamoDB
  dynamodb: {
    billingMode: 'PAY_PER_REQUEST',
    pitrEnabled: false // Future: enable for production
  },
  
  // API Gateway
  apiGateway: {
    throttle: {
      burstLimit: 200,
      rateLimit: 100
    }
  },
  
  // Monitoring
  monitoring: {
    logRetentionDays: 7,
    xraySamplingRate: 0.05 // 5%
  }
};
```

**Usage in CDK**:
```typescript
import { devConfig } from '../config/dev';
import { prodConfig } from '../config/prod';

const config = process.env.STAGE === 'prod' ? prodConfig : devConfig;
```

---

## 6. Deployment Strategy

### 6.1 Deployment Method

**Strategy**: Blue-Green Deployment（安全、ゼロダウンタイム）

**Lambda Alias**:
- **Blue**: Current production version
- **Green**: New version being deployed

**Deployment Flow**:
```
1. Deploy new Lambda version (Green)
2. Run smoke tests on Green version
3. Gradually shift traffic: Blue 100% → Green 100% (10% increments)
4. Monitor errors and latency during shift
5. If errors detected: Rollback to Blue
6. If successful: Complete shift to Green, deprecate Blue
```

**Lambda Versioning**:
```typescript
const lambdaVersion = lambda.addVersion(`v${Date.now()}`);
const alias = new lambda.Alias(this, 'ProdAlias', {
  aliasName: 'prod',
  version: lambdaVersion
});
```

**Traffic Shifting**:
```typescript
const deployment = new codedeploy.LambdaDeploymentGroup(this, 'DeploymentGroup', {
  alias: alias,
  deploymentConfig: codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
  alarms: [errorAlarm, latencyAlarm]
});
```

**Rollback**: 自動（アラームトリガー）または手動

---

### 6.2 CI/CD Pipeline

**Tool**: GitHub Actions（基本的なCI/CD）

**Pipeline Stages**:

**1. Build**:
```yaml
- Checkout code
- Install dependencies (npm install)
- Compile TypeScript (npm run build)
- Run linter (npm run lint)
```

**2. Test**:
```yaml
- Run unit tests (npm test)
- Run integration tests (npm run test:integration)
- Generate coverage report
```

**3. Deploy to Dev**:
```yaml
- CDK synth
- CDK deploy Dev-Auth-Stack, Dev-Project-Stack
- Run smoke tests
```

**4. Deploy to Prod** (manual approval required):
```yaml
- Manual approval gate
- CDK deploy Prod-Auth-Stack, Prod-Project-Stack
- Blue-Green deployment with traffic shifting
- Run smoke tests
- Monitor alarms
```

**GitHub Actions Workflow**:
```yaml
name: Deploy

on:
  push:
    branches: [main, develop]

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npx cdk deploy Dev-*-Stack --require-approval never
      
  deploy-prod:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npx cdk deploy Prod-*-Stack --require-approval never
```

---

## 7. Cost Optimization

### 7.1 Lambda Reserved Concurrency

**Setting**: なし（デフォルト、アカウント全体の共有プール）

**Rationale**:
- 開発環境のため、予約キャパシティ不要
- コスト最小化優先
- 本番環境では必要に応じて検討

---

### 7.2 Cost Estimation

**Monthly Cost Estimate** (dev environment):

**Lambda**:
- Invocations: 100,000/month
- Duration: 200ms average
- Memory: 1024 MB
- Cost: ~$1.00/month

**DynamoDB**:
- On-Demand
- Reads: 50,000/month (Eventually Consistent)
- Writes: 10,000/month
- Storage: 1 GB
- Cost: ~$2.00/month

**API Gateway**:
- Requests: 100,000/month
- Cost: ~$0.35/month

**CloudWatch Logs**:
- Logs: 1 GB/month
- Retention: 7 days
- Cost: ~$0.50/month

**Secrets Manager**:
- Secrets: 2
- Cost: ~$0.80/month

**Total**: ~$5/month (dev environment)

**Production Cost**: 10-20x higher（トラフィック依存）

---

## 8. Disaster Recovery

### 8.1 RTO/RPO

**Recovery Time Objective (RTO)**: 24時間  
**Recovery Point Objective (RPO)**: 24時間

**Rationale**: 開発環境のため、緩い復旧目標

---

### 8.2 Backup Strategy

**DynamoDB**: なし（開発環境のみ、本番は別途検討）

**Future Considerations** (本番環境):
- Point-in-Time Recovery (PITR) 有効化
- 定期スナップショット（長期保存）
- Cross-region replication（災害対策）

---

### 8.3 Recovery Procedure

**Manual Recovery Steps**:
1. CDK Stackを再デプロイ
2. Secrets Managerから機密情報を復元
3. DynamoDBテーブルを再作成（データ損失）
4. Lambda関数を再デプロイ
5. API Gatewayを再設定
6. 動作確認（smoke tests）

**Recovery Time**: 2-4時間（手動作業）

---

## Summary

### Infrastructure Mapping

| Logical Component | AWS Service | Configuration |
|-------------------|-------------|---------------|
| **Compute** | AWS Lambda | Node.js 20.x, 512-1024 MB, 30s timeout |
| **API** | API Gateway | REST API, 2 stages (dev/prod) |
| **Database** | DynamoDB | On-Demand, Single Table, 2 GSIs |
| **Security** | IAM + Secrets Manager | Domain-specific roles, All secrets |
| **Monitoring** | CloudWatch + X-Ray | 1 week logs, Comprehensive alarms |
| **IaC** | AWS CDK | TypeScript, 5 Stacks |

### Key Design Decisions

1. **Lambda構成**: ドメイン単位（U2=512MB, U3=1024MB）
2. **DynamoDB**: On-Demand課金、バックアップなし（開発）
3. **API Gateway**: 2ステージ（dev/prod）、控えめレート制限
4. **Monitoring**: 1週間ログ保持、包括的アラーム
5. **Security**: ドメイン別IAMロール、Secrets Manager全環境変数
6. **Networking**: VPC不要（開発用）
7. **CDK Stacks**: 5 Stacks（Shared-Base + 環境×ドメイン）
8. **Deployment**: Blue-Green、基本的なCI/CD
9. **Cost**: Lambda Reserved Concurrency なし
10. **DR**: RTO/RPO 24時間（緩い）

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Complete