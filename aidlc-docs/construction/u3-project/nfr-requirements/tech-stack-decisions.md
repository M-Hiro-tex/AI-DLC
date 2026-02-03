# U3: Project Domain - Technology Stack Decisions

## Overview

本ドキュメントでは、U3: Project Domainのテクノロジースタック選択の根拠と決定事項を記録します。

**Decision Date**: 2026-02-01  
**Decision Maker**: Architecture Team  
**Project Context**: AI-driven Learning Platform - Project Management Domain

---

## 1. Database Technology

### Decision: Amazon DynamoDB

**Selected Option**: A) DynamoDB（認証ドメインと同じ、NoSQL、スケーラブル）

**Rationale**:

1. **Consistency with Authentication Domain**
   - U2: Authentication DomainがDynamoDBを使用
   - 同じデータベース技術により、運用・保守の一貫性を確保
   - 学習コストの削減

2. **Scale Requirements Match**
   - 想定データ量: 3,000 projects × 5KB = 15MB
   - DynamoDBの無料枠で十分対応可能（25GB storage, 200M requests/month）
   - 小規模スケールに適した従量課金モデル

3. **Performance Characteristics**
   - Single-digit millisecond latency
   - Target performance (< 500ms) を十分達成可能
   - Auto-scaling対応（将来の成長に備える）

4. **Operational Simplicity**
   - Fully managed service（サーバー管理不要）
   - Automatic backups（PITR対応可能）
   - Multi-AZ replication（高可用性）

5. **Cost Efficiency**
   - On-demand pricing: $1.25/million writes, $0.25/million reads
   - 予想コスト: $1-5/month（3,000 projects, 低トラフィック）
   - RDS/Auroraより大幅に安価

**Trade-offs**:

❌ **Disadvantages**:
- 複雑なクエリ（JOIN, GROUP BY）が困難
- トランザクション機能が限定的
- RDBMSの柔軟性はない

✅ **Mitigations**:
- Project Domainのクエリはシンプル（Owner別一覧、ID検索、名前検索）
- トランザクションは不要（単一エンティティ操作がメイン）
- GSI（Global Secondary Index）で必要なクエリパターンをカバー

**Alternatives Considered**:

- **RDS PostgreSQL**: 複雑なクエリに強いが、コスト高（$15-30/month）、管理コストあり
- **Aurora Serverless**: 自動スケーリングだが、最小コストが高い（$10-20/month）

---

### Decision: Single-Table Design

**Selected Option**: A) 単一テーブル設計（Projects、ProjectTemplates、UserMilestones等を1テーブルに集約）

**Rationale**:

1. **DynamoDB Best Practice**
   - AWS推奨のデザインパターン
   - 複数エンティティを1テーブルで管理
   - Query効率の最大化

2. **Access Pattern Optimization**
   - 主要アクセスパターン:
     - Get project by ID
     - List projects by owner
     - List project templates
   - すべて単一テーブルで効率的に実装可能

3. **Cost Efficiency**
   - 1テーブルのみ管理でコスト削減
   - GSI数を最小化

4. **Scalability**
   - Partition Key設計: `PK: PROJECT#{id}`, `SK: METADATA`
   - GSI: `GSI1PK: OWNER#{ownerId}`, `GSI1SK: {updatedAt}`
   - 将来の成長に対応

**Table Design**:

```
Main Table: ProjectDomain

PK                    | SK              | EntityType    | Attributes
----------------------|-----------------|---------------|------------------
PROJECT#{uuid}        | METADATA        | Project       | name, status, ...
PROJECT#{uuid}        | TEMPLATE        | Template      | templateId, ...
OWNER#{userId}        | PROJECT#{uuid}  | ProjectIndex  | (GSI data)
TEMPLATE#{templateId} | METADATA        | Template      | name, category, ...
MILESTONE#{userId}    | {milestoneId}   | Achievement   | achievedAt, ...
```

**GSI Design**:

1. **OwnerIndex**: Projects by owner
   - GSI1PK: `OWNER#{ownerId}`
   - GSI1SK: `{updatedAt}` (for sorting)

2. **TemplateIndex**: List templates
   - GSI2PK: `TEMPLATE`
   - GSI2SK: `{category}#{name}`

**Alternatives Considered**:

- **複数テーブル設計**: 管理が容易だが、コスト増、DynamoDBのベストプラクティスに反する
- **ハイブリッド**: 複雑性が増す割にメリット少ない

---

## 2. Programming Language & Framework

### Decision: TypeScript + Express

**Selected Option**: A) TypeScript + Express（認証ドメインと同じ、一貫性重視）

**Rationale**:

1. **Consistency Across Domains**
   - U2: Authentication DomainがTypeScript + Expressを使用
   - コードスタイル、ベストプラクティスの統一
   - 開発者間の知識共有が容易

2. **Type Safety**
   - TypeScript strict mode
   - コンパイル時エラー検出
   - IDEサポート（IntelliSense、リファクタリング）

3. **Express Ecosystem**
   - 成熟したエコシステム
   - 豊富なミドルウェア
   - Lambda統合が容易（serverless-http）

4. **Developer Productivity**
   - 学習コストなし（チーム全員がすでに習熟）
   - 既存コードの再利用（ミドルウェア、ユーティリティ）

5. **Performance**
   - Node.js runtime: Lambda cold start 200-500ms
   - Express: 軽量、オーバーヘッド最小

**Alternatives Considered**:

- **NestJS**: より構造化されているが、学習コスト、Lambda cold start増加
- **Python + FastAPI**: Pythonエコシステムは魅力的だが、チーム習熟度低い

---

## 3. Data Access Library

### Decision: AWS SDK for JavaScript v3

**Selected Option**: A) AWS SDK for JavaScript v3（DynamoDB直接操作、軽量、公式SDK）

**Original Selection**: D) Prisma（DynamoDB非対応のため変更）

**Rationale**:

1. **Consistency with Authentication Domain**
   - U2がAWS SDK v3を使用
   - 同じパターン、ベストプラクティスの適用

2. **Official Support**
   - AWS公式SDK、長期サポート保証
   - 最新DynamoDB機能への即座のアクセス
   - 豊富なドキュメントとコミュニティサポート

3. **Lightweight**
   - バンドルサイズ最小化
   - Lambda cold start時間短縮
   - 不要な抽象化レイヤーなし

4. **Flexibility**
   - DynamoDBの全機能にアクセス可能
   - 複雑なクエリパターンに対応
   - パフォーマンスチューニングの自由度

5. **Type Safety**
   - TypeScriptサポート
   - 型定義による安全性

**Implementation Pattern**:

```typescript
// Repository pattern for abstraction
class ProjectRepository {
  constructor(private ddbClient: DynamoDBClient) {}

  async getById(id: string): Promise<Project> {
    const result = await this.ddbClient.send(
      new GetItemCommand({
        TableName: 'ProjectDomain',
        Key: { PK: { S: `PROJECT#${id}` }, SK: { S: 'METADATA' } }
      })
    );
    return this.unmarshall(result.Item);
  }
}
```

**Alternatives Considered**:

- **Prisma**: DynamoDB非対応（PostgreSQL, MySQL等のみ）
- **DynamoDB Toolbox**: 型安全だが、学習コスト、抽象化オーバーヘッド
- **Electrodb**: 高機能だが、小規模プロジェクトには過剰

**Technical Correction**:

元の回答でPrismaを選択しましたが、**Prismaは DynamoDB をサポートしていない**ことが判明しました。
DynamoDBを使用する場合、以下の選択肢のみが有効です：
- AWS SDK for JavaScript v3
- DynamoDB Toolbox
- Electrodb

U2との一貫性と、シンプルさの観点から、**AWS SDK for JavaScript v3**を選択しました。

---

## 4. API Design

### Decision: RESTful API

**Selected Option**: A) RESTful API（標準的、認証ドメインと同じ）

**Rationale**:

1. **Consistency**
   - U2: Authentication DomainがREST API
   - APIスタイルの統一

2. **Simplicity**
   - 標準的なHTTP methods（GET, POST, PUT, DELETE）
   - 広く知られた設計パターン
   - クライアント実装が容易

3. **Resource-Based Model**
   - `/api/v1/projects` - プロジェクト一覧
   - `/api/v1/projects/{id}` - 特定プロジェクト
   - `/api/v1/projects/{id}/share` - 共有操作
   - `/api/v1/templates` - テンプレート一覧

4. **Caching Support**
   - HTTP caching mechanisms（ETag, Cache-Control）
   - CloudFront integration

5. **Tooling Ecosystem**
   - OpenAPI/Swagger documentation
   - Postman, curl等のツールサポート

**API Endpoints**:

```
GET    /api/v1/projects              - List projects
POST   /api/v1/projects              - Create project
GET    /api/v1/projects/{id}         - Get project
PUT    /api/v1/projects/{id}         - Update project
DELETE /api/v1/projects/{id}         - Delete project
POST   /api/v1/projects/{id}/share   - Share project
GET    /api/v1/templates              - List templates
```

**Alternatives Considered**:

- **GraphQL**: 柔軟だが、複雑性増加、キャッシング難しい、学習コスト
- **gRPC**: 高性能だが、Webクライアント対応が複雑、学習コスト

---

### Decision: Zod for Validation

**Selected Option**: A) Zod（TypeScript優先、型推論）

**Rationale**:

1. **TypeScript-First**
   - TypeScript型を直接推論
   - Schema定義から型を自動生成
   - 型安全性の最大化

2. **Developer Experience**
   - シンプルなAPI
   - 読みやすいスキーマ定義
   - 優れたエラーメッセージ

3. **Performance**
   - 軽量、高速
   - ランタイムオーバーヘッド最小

4. **Modern & Active**
   - 活発なメンテナンス
   - 豊富なドキュメント
   - 成長中のコミュニティ

**Example Schema**:

```typescript
const ProjectCreateSchema = z.object({
  name: z.string().min(3).max(100).regex(/^[a-zA-Z0-9 _-]+$/),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(20)).max(10).optional(),
  category: z.string().optional(),
  templateId: z.string().uuid().optional()
});

type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;
```

**Alternatives Considered**:

- **Joi**: 成熟しているが、TypeScript型推論が弱い
- **class-validator**: デコレータベース、NestJS向け、Expressには過剰

---

## 5. Testing Framework

### Decision: Jest

**Selected Option**: A) Jest（認証ドメインと同じ、標準的）

**Rationale**:

1. **Consistency**
   - U2: Authentication DomainがJestを使用
   - テスト実行環境の統一
   - 共通のベストプラクティス

2. **Comprehensive Features**
   - Test runner, assertion library, mocking - all-in-one
   - Code coverage built-in
   - Snapshot testing

3. **TypeScript Support**
   - ts-jest integration
   - 型チェック付きテスト

4. **Ecosystem**
   - 豊富なプラグイン（@testing-library, supertest）
   - 広範なコミュニティサポート

5. **Developer Experience**
   - Watch mode for rapid feedback
   - Parallel test execution
   - Clear error messages

**Test Coverage Target**: 80%以上

**Test Structure**:

```
tests/
├── unit/
│   ├── services/
│   ├── repositories/
│   └── utils/
├── integration/
│   └── api/
└── e2e/
```

**Alternatives Considered**:

- **Vitest**: 高速だが、エコシステムがまだ成長中
- **Mocha + Chai**: 柔軟だが、設定が複雑

---

## 6. Observability & Logging

### Decision: AWS Lambda Powertools

**Selected Option**: A) AWS Lambda Powertools（認証ドメインと同じ、構造化ログ）

**Rationale**:

1. **Consistency**
   - U2がLambda Powertoolsを使用
   - ログフォーマットの統一
   - 相関IDによるトレーシング

2. **Structured Logging**
   - JSON format logs
   - CloudWatch Logs Insightsでクエリ可能
   - 標準化されたログレベル

3. **Lambda Optimization**
   - Lambda環境向けに最適化
   - 低オーバーヘッド
   - Cold start影響最小

4. **Built-in Features**
   - Logger: 構造化ログ
   - Tracer: AWS X-Ray統合
   - Metrics: CloudWatch Metrics統合

5. **Best Practices**
   - AWS推奨のロギングパターン
   - セキュリティ（PII masking）
   - パフォーマンスモニタリング

**Implementation**:

```typescript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'project-service' });

logger.info('Project created', {
  projectId: project.id,
  ownerId: project.ownerId
});
```

**Alternatives Considered**:

- **Winston**: 柔軟だが、Lambda環境では過剰、設定複雑
- **Pino**: 高速だが、Lambda Powertoolsの統合機能なし

---

### Decision: AWS X-Ray Tracing

**Selected Option**: A) はい、必須（認証ドメインとの連携を追跡）

**Rationale**:

1. **Distributed Tracing**
   - U2: Authentication → U3: Project連携の可視化
   - リクエストフロー全体の追跡
   - ボトルネック特定

2. **Lambda Powertools Integration**
   - Decorator-based tracing
   - 自動的なサブセグメント作成
   - DynamoDB呼び出しの追跡

3. **Performance Monitoring**
   - レイテンシ分析
   - エラー率追跡
   - サービス依存関係の可視化

4. **Low Overhead**
   - Lambda統合によるオーバーヘッド最小化
   - サンプリングレート調整可能

**Implementation**:

```typescript
import { Tracer } from '@aws-lambda-powertools/tracer';

const tracer = new Tracer({ serviceName: 'project-service' });

@tracer.captureMethod()
async getProject(id: string): Promise<Project> {
  // Automatically traced
}
```

**Alternatives Considered**:

- **X-Ray不使用**: コスト削減だが、デバッグ困難、パフォーマンス分析不可

---

## 7. Deployment & Infrastructure

### Decision: AWS Lambda + API Gateway

**Selected Option**: A) Lambda + API Gateway（認証ドメインと同じ、サーバーレス）

**Rationale**:

1. **Consistency**
   - U2と同じアーキテクチャ
   - 統一された運用モデル

2. **Serverless Benefits**
   - サーバー管理不要
   - 自動スケーリング
   - 使用した分だけの課金

3. **Cost Efficiency**
   - Lambda: 1M requests/month無料枠
   - API Gateway: $3.50/million requests
   - 予想コスト: $0-5/month（低トラフィック）

4. **Integration**
   - DynamoDB native integration
   - CloudWatch Logs/Metrics統合
   - VPC不要（DynamoDB公開エンドポイント）

5. **Development Velocity**
   - 高速デプロイ（数分）
   - Blue-Green deployment容易
   - バージョン管理とエイリアス

**Architecture**:

```
Client
  ↓ HTTPS
API Gateway
  ↓ Invoke
Lambda Function (Express app)
  ↓ AWS SDK
DynamoDB
```

**Lambda Configuration**:
- Runtime: Node.js 20.x
- Memory: 512 MB
- Timeout: 30秒
- Packaging: Serverless Framework or CDK

**Alternatives Considered**:

- **ECS Fargate**: 長時間実行可能だが、コスト高（$20-50/month）、管理コスト増
- **EC2**: フルコントロールだが、最もコスト高、運用負荷大

---

### Decision: AWS CDK (TypeScript)

**Selected Option**: A) AWS CDK（TypeScript、認証ドメインと同じ）

**Rationale**:

1. **Consistency**
   - U2がAWS CDKを使用
   - インフラコードの統一

2. **Type Safety**
   - TypeScript for infrastructure
   - コンパイル時エラー検出
   - IDEサポート

3. **Higher-Level Abstractions**
   - L2/L3 Constructs
   - ベストプラクティスのデフォルト設定
   - コード量削減

4. **AWS Native**
   - 最新AWSサービスへの即座のアクセス
   - AWS公式サポート
   - CloudFormation統合

5. **Reusability**
   - Construct library作成可能
   - クロスドメイン共有
   - テスト可能

**CDK Stack Example**:

```typescript
export class ProjectDomainStack extends cdk.Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'ProjectTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Lambda Function
    const projectFunction = new lambda.Function(this, 'ProjectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset('dist'),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'ProjectApi');
    // ...
  }
}
```

**Alternatives Considered**:

- **Terraform**: マルチクラウド対応だが、TypeScript統合なし、学習コスト
- **CloudFormation**: AWS純正だが、冗長、可読性低い

---

## 8. Technology Stack Summary

### Selected Technologies

| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| **Database** | Amazon DynamoDB | - | NoSQL, Serverless, Cost-efficient |
| **Table Design** | Single-Table | - | DynamoDB best practice |
| **Runtime** | Node.js | 20.x | Lambda support, Mature ecosystem |
| **Language** | TypeScript | 5.x | Type safety, Team proficiency |
| **Web Framework** | Express | 4.x | Lightweight, Lambda-compatible |
| **Data Access** | AWS SDK v3 | 3.x | Official, Lightweight, Flexible |
| **API Style** | REST | - | Standard, Simple |
| **Validation** | Zod | 3.x | TypeScript-first, Type inference |
| **Testing** | Jest | 29.x | Comprehensive, Team standard |
| **Logging** | Lambda Powertools | 2.x | Structured logs, AWS integration |
| **Tracing** | AWS X-Ray | - | Distributed tracing |
| **Compute** | AWS Lambda | - | Serverless, Auto-scaling |
| **API Gateway** | API Gateway REST | v1 | Lambda integration |
| **IaC** | AWS CDK | 2.x | TypeScript IaC, L2/L3 constructs |

---

### Consistency with U2: Authentication Domain

| Component | U2: Authentication | U3: Project | Status |
|-----------|-------------------|-------------|--------|
| Database | DynamoDB | DynamoDB | ✅ Same |
| Language | TypeScript | TypeScript | ✅ Same |
| Framework | Express | Express | ✅ Same |
| Data Access | AWS SDK v3 | AWS SDK v3 | ✅ Same |
| Testing | Jest | Jest | ✅ Same |
| Logging | Powertools | Powertools | ✅ Same |
| Tracing | X-Ray | X-Ray | ✅ Same |
| Compute | Lambda | Lambda | ✅ Same |
| API Gateway | API Gateway | API Gateway | ✅ Same |
| IaC | CDK | CDK | ✅ Same |

**Consistency Rate**: 100% ✅

---

### Key Advantages of Selected Stack

1. **Consistency**: 100% alignment with U2
2. **Cost**: $5-15/month（AWS無料枠内）
3. **Scalability**: Auto-scaling to 3,000+ projects
4. **Performance**: < 500ms API latency target
5. **Maintainability**: Single tech stack across domains
6. **Developer Productivity**: No learning curve
7. **Operational Simplicity**: Fully managed services

---

### Technical Debt & Future Considerations

**Current Limitations**:
- 単一テーブル設計の学習曲線
- DynamoDB複雑クエリの制約
- サーバーレス特有の制約（cold start等）

**Future Enhancements**:
- DynamoDB Streams for event sourcing
- Step Functions for long-running workflows
- AppSync for GraphQL（将来検討）
- Multi-region deployment（グローバル展開時）

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Last Updated**: 2026-02-01  
**Status**: Approved