# U3: Project Domain - NFR Requirements

## Overview

本ドキュメントでは、U3: Project Domainの非機能要件（NFR）を定義します。

**Focus**: スケーラビリティ、パフォーマンス、可用性、セキュリティ

---

## 1. Scalability Requirements

### 1.1 Data Scale Expectations

**Project Count Scale**: 小規模（カスタム定義）
- **ユーザー1人あたり**: 最大3プロジェクト
- **総計**: ～3,000プロジェクト
- **想定ユーザー数**: ～1,000ユーザー

**Rationale**:
- 学習プラットフォームとして、学習者が集中できる適切な規模
- 小規模スケールのため、シンプルなアーキテクチャで十分
- DynamoDBの無料枠内で運用可能

---

### 1.2 Growth Rate Estimation

**Data Growth Model**:
```
Year 1: 500 users × 2 projects/user = 1,000 projects
Year 2: 800 users × 2.5 projects/user = 2,000 projects
Year 3: 1,000 users × 3 projects/user = 3,000 projects
```

**Storage Growth**:
- プロジェクトメタデータ: ~5KB/project
- 総ストレージ: 3,000 projects × 5KB = 15MB（非常に小規模）

---

## 2. Performance Requirements

### 2.1 Query Performance

**Project List Query**:
- **Target**: < 500ms
- **Classification**: 標準的、通常のクエリ最適化
- **Implementation**:
  - DynamoDB GSI: OwnerIndex (ownerId, updatedAt)
  - ページネーション: 20件/ページ（デフォルト）
  - インデックス最適化で実現可能

**Search Query**:
- **Target**: < 1秒
- **Classification**: 標準的な検索速度
- **Implementation**:
  - 名前検索: Scan with filter（小規模データのため許容）
  - タグフィルタリング: GSI or FilterExpression
  - 複雑なフィルタリングも許容範囲

---

### 2.2 CRUD Operation Performance

**Create & Update Operations**:
- **Target**: < 500ms
- **Classification**: 標準的なAPI応答
- **Breakdown**:
  - DynamoDB PutItem/UpdateItem: 10-50ms
  - Validation & Business Logic: 50-100ms
  - API Gateway + Lambda overhead: 100-200ms
  - Network latency: 50-150ms

**Read Operations**:
- **Single Project Get**: < 100ms
- **Implementation**: DynamoDB GetItem（一貫性のある読み取り）

**Delete Operations**:
- **Soft Delete**: < 500ms（UpdateItemでdeleted_at設定）
- **Hard Delete**: バックグラウンドジョブ（非同期）

---

### 2.3 Performance Optimization Strategies

**DynamoDB Optimization**:
- GSI設計: OwnerIndex, StatusIndex
- Partition Key設計: プロジェクトID（UUID）
- Consistent Reads: 必要に応じて使用

**Caching Strategy**:
- MVP: キャッシング不要（小規模データ）
- Post-MVP: CloudFrontでAPI Gatewayをキャッシュ

**Pagination Strategy**:
- Offset-based pagination（DynamoDBのLimit & ExclusiveStartKey）
- ページサイズ: デフォルト20件、最大100件

---

## 3. Availability Requirements

### 3.1 Target Availability

**SLA Target**: 99.9%
- **月間許容ダウンタイム**: ～43分
- **Classification**: 標準的なSLA
- **Justification**: 学習プラットフォームとして適切なバランス

**AWS Service SLA**:
- DynamoDB: 99.99%（Global Tables不使用時）
- Lambda: 99.95%
- API Gateway: 99.95%
- **Composite SLA**: 99.89%（理論値）→ 99.9%達成可能

---

### 3.2 Fault Tolerance

**Multi-AZ Deployment**:
- DynamoDB: 自動的に3つのAZに複製
- Lambda: 複数AZで自動実行
- API Gateway: 複数AZで自動配置

**Failure Handling**:
- Lambda timeout: 30秒
- Retry policy: API Gateway自動リトライ（2回）
- Circuit breaker: 不要（小規模システム）

---

### 3.3 Backup and Recovery

**Backup Strategy**: バックアップ不要（開発環境のため）

**Rationale**:
- 開発・学習目的のプラットフォーム
- プロジェクトデータは再作成可能
- コスト削減優先

**Future Consideration（Production環境）**:
- DynamoDB Point-in-Time Recovery (PITR)
- 自動日次バックアップ
- Cross-region replication

---

## 4. Security Requirements

### 4.1 Data Encryption

**Encryption at Rest**: 不要（開発環境のため）
**Encryption in Transit**: HTTPS（必須）

**Rationale**:
- 開発環境のため、暗号化コストを削減
- 本番環境では DynamoDB Encryption at Rest を有効化推奨
- 転送時暗号化（HTTPS）は必須（API Gateway標準）

---

### 4.2 Access Control

**Authentication**:
- U2: Authentication Domain経由の認証
- JWT token verification（ミドルウェア）

**Authorization**:
- Owner-based access control
- Shared users: Read-only access
- Business logic layer で権限チェック

**API Security**:
- CORS設定
- Rate limiting（API Gateway）
- Input validation（Zod）

---

### 4.3 Audit Logging

**Logging Level**: 基本的なアクセスログ

**Implementation**:
- CloudWatch Logs: API呼び出しログ
- Lambda Powertools: 構造化ログ
- ログレベル: INFO, WARN, ERROR

**Logged Information**:
- API request/response
- User ID, Action, Timestamp
- Error details

**Not Logged（MVP）**:
- 詳細な監査ログ（誰が何を作成・更新・削除したか）
- データ変更履歴
- アクセス時刻の詳細トラッキング

**Future Enhancement**:
- DynamoDB Streams + Lambda for audit trail
- 変更履歴の永続化

---

## 5. Reliability Requirements

### 5.1 Error Handling

**Error Classification**:
- 4xx: Client errors（バリデーションエラー、権限エラー）
- 5xx: Server errors（システムエラー、DynamoDBエラー）

**Error Response Format**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "プロジェクト名は3-100文字である必要があります",
    "details": {
      "field": "name",
      "value": "AB"
    }
  }
}
```

**Retry Strategy**:
- DynamoDB throttling: Exponential backoff
- Transient errors: 最大3回リトライ

---

### 5.2 Data Consistency

**Consistency Model**: Eventual Consistency（DynamoDB標準）

**Strong Consistency**:
- GetItem: 必要に応じて ConsistentRead=true
- Critical operations: プロジェクト作成直後の取得

**Conflict Resolution**:
- Optimistic locking: Version field（オプション）
- Last-write-wins: 簡易実装

---

## 6. Maintainability Requirements

### 6.1 Code Quality

**Code Standards**:
- TypeScript strict mode
- ESLint + Prettier
- Code review required

**Documentation**:
- API documentation（OpenAPI/Swagger）
- README per repository
- Inline comments for complex logic

---

### 6.2 Testing Requirements

**Test Coverage Target**: 80%以上

**Test Types**:
- **Unit Tests**: 80%以上（ビジネスロジック、バリデーション）
- **Integration Tests**: 主要APIエンドポイント
- **End-to-End Tests**: クリティカルユーザーフロー

**Test Framework**: Jest

---

### 6.3 Monitoring and Observability

**Metrics**:
- API latency（p50, p95, p99）
- Error rate（4xx, 5xx）
- DynamoDB read/write capacity

**Alerts**:
- Error rate > 5%
- API latency p95 > 1秒
- Lambda errors

**Dashboards**:
- CloudWatch Dashboard
- API Gateway metrics
- DynamoDB metrics

---

## 7. Usability Requirements

### 7.1 API Response Format

**Standard Response**:
```json
{
  "data": {
    "id": "uuid",
    "name": "Project Name",
    ...
  }
}
```

**List Response**:
```json
{
  "data": {
    "items": [...],
    "totalCount": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

### 7.2 API Versioning

**Versioning Strategy**: URL path versioning

**Example**: `/api/v1/projects`

**Backward Compatibility**:
- v1 → v2 migration period: 6 months

---

## 8. Operational Requirements

### 8.1 Deployment

**Deployment Model**: Blue-Green deployment

**Rollback Strategy**:
- Lambda alias + version
- Instant rollback if error rate > threshold

**Deployment Frequency**: On-demand（CI/CD）

---

### 8.2 Monitoring

**CloudWatch Metrics**:
- Lambda invocations, duration, errors
- DynamoDB consumed capacity
- API Gateway requests, latency, errors

**Log Retention**: 30 days（CloudWatch Logs）

**Alerting**: SNS + Email notification

---

## 9. Compliance Requirements

**Data Privacy**: 不要（開発環境）

**Compliance Standards**: 不要（MVP）

**Future Consideration**:
- GDPR compliance（EU users）
- データ削除要求対応（Right to be forgotten）

---

## 10. Cost Requirements

### 10.1 Cost Optimization

**Target**: AWS無料枠内で運用

**DynamoDB**:
- On-demand pricing
- 予想コスト: $1-5/month（3,000 projects, 低トラフィック）

**Lambda**:
- 1M requests/month: 無料枠内
- 予想コスト: $0-2/month

**API Gateway**:
- 1M requests/month: $3.50
- 予想コスト: $0-5/month

**Total Estimated Cost**: $5-15/month

---

## Summary

### NFR Categories

| Category | Target | Priority | Implementation Complexity |
|----------|--------|----------|---------------------------|
| Scalability | 3,000 projects | Medium | Low |
| Performance | < 500ms (list), < 1s (search) | High | Medium |
| Availability | 99.9% | High | Low (AWS managed) |
| Security | HTTPS, Basic auth | High | Medium |
| Reliability | 80% test coverage | High | Medium |
| Maintainability | Code quality standards | Medium | Medium |
| Cost | $5-15/month | High | Low |

### Critical Requirements

1. **Performance**: < 500ms for project list queries
2. **Availability**: 99.9% SLA
3. **Security**: HTTPS + Authentication/Authorization
4. **Test Coverage**: 80%以上
5. **Cost**: AWS無料枠内での運用

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Complete