# U2: Authentication Domain - NFR Design Plan

## Unit Context

**Unit**: U2 - Authentication Domain  
**Type**: Backend Service  
**Technology**: Node.js + TypeScript + Express  
**Database**: Aurora Serverless v2 PostgreSQL  
**Deployment**: Lambda/ECS Fargate (Multi-AZ in Production)

### Prerequisites Complete
- Functional Design: Business logic, domain entities, OAuth flows
- NFR Requirements: Performance, scalability, availability, security requirements
- Tech Stack: Node.js, TypeScript, Express, Aurora, Lambda/Fargate

---

## NFR Design Plan

### Step 1: Resilience Pattern Design
- [ ] Design retry mechanisms for OAuth providers
  - [ ] Exponential backoff with jitter implementation
  - [ ] Max attempts and timeout configuration
  - [ ] Error classification (retryable vs non-retryable)
- [ ] Design circuit breaker pattern for OAuth calls
  - [ ] Failure threshold configuration
  - [ ] Open/half-open/closed state management
  - [ ] Fallback strategies
- [ ] Design graceful degradation strategies
  - [ ] OAuth provider unavailability handling
  - [ ] Database connection failure handling
  - [ ] Partial functionality during degradation

### Step 2: Performance Pattern Design
- [ ] Design caching strategy
  - [ ] Session validation caching approach
  - [ ] User profile caching strategy
  - [ ] Cache invalidation policies
  - [ ] Cache TTL configuration
- [ ] Design database connection pooling
  - [ ] Pool size configuration
  - [ ] Connection lifecycle management
  - [ ] Connection health checks
- [ ] Design query optimization patterns
  - [ ] Index strategy
  - [ ] Query batching approach
  - [ ] N+1 query prevention

### Step 3: Scalability Pattern Design
- [ ] Design stateless application pattern
  - [ ] Session storage strategy (database, not in-memory)
  - [ ] JWT stateless validation
  - [ ] No server-side session affinity
- [ ] Design horizontal scaling approach
  - [ ] Load balancing strategy
  - [ ] Instance health checks
  - [ ] Auto-scaling triggers
- [ ] Design database read scaling pattern
  - [ ] Read replica strategy (future)
  - [ ] Read/write separation approach
  - [ ] Eventually consistent reads handling

### Step 4: Security Pattern Design
- [ ] Design secrets management pattern
  - [ ] AWS Secrets Manager integration
  - [ ] Secret rotation handling
  - [ ] Secret caching strategy
- [ ] Design rate limiting implementation
  - [ ] Multi-layer rate limiting (WAF, Gateway, App)
  - [ ] Rate limit key generation
  - [ ] Rate limit storage (in-memory vs distributed)
- [ ] Design secure token management
  - [ ] JWT signing and verification
  - [ ] Refresh token hashing
  - [ ] Token rotation strategy

### Step 5: Observability Pattern Design
- [ ] Design logging strategy
  - [ ] Structured logging format (JSON)
  - [ ] Log levels and filtering
  - [ ] Correlation ID propagation
  - [ ] Sensitive data redaction
- [ ] Design metrics collection
  - [ ] Custom CloudWatch metrics
  - [ ] Performance metrics (latency, throughput)
  - [ ] Business metrics (auth success/failure)
- [ ] Design distributed tracing
  - [ ] X-Ray integration points
  - [ ] Trace sampling strategy
  - [ ] Service map visualization

### Step 6: Identify Logical Components
- [ ] Caching layer (logical component)
  - [ ] Purpose and responsibility
  - [ ] Data stored
  - [ ] Eviction policies
- [ ] Message queue (if needed)
  - [ ] Use cases (async processing)
  - [ ] Message format
  - [ ] Consumer patterns
- [ ] Service mesh / API Gateway
  - [ ] Routing rules
  - [ ] Request validation
  - [ ] Response transformation
- [ ] Monitoring and alerting infrastructure
  - [ ] Metrics aggregation
  - [ ] Alert rules
  - [ ] Dashboard requirements

### Step 7: Generate NFR Design Artifacts
- [x] Create `aidlc-docs/construction/u2-authentication/nfr-design/nfr-design-patterns.md`
- [x] Create `aidlc-docs/construction/u2-authentication/nfr-design/logical-components.md`

---

## Questions for Clarification

### Question 1: Session Validation Caching Strategy
セッション検証のパフォーマンスを向上させるために、キャッシングを導入しますか？

A) なし - 毎回データベース検証（シンプル、常に最新）
B) インメモリキャッシュ（Node.js process.memoryCache）- 単一インスタンス限定
C) 分散キャッシュ（Redis/ElastiCache）- 全インスタンス共有、追加コスト
D) その他（説明してください）

[Answer]: D. BFFのミドルウェアによるJWT検証（ステートレス）＋ 永続化層としてのRDS

### Question 2: User Profile Caching Strategy
ユーザープロファイル取得のキャッシング戦略を教えてください。

A) なし - 毎回データベースクエリ
B) 短期キャッシュ（TTL: 5分）- 頻繁な更新に対応
C) 長期キャッシュ（TTL: 1時間）- 更新頻度低い前提
D) その他（説明してください）

[Answer]: B

### Question 3: Circuit Breaker Implementation Level
サーキットブレーカーパターンの実装レベルを教えてください。

A) ライブラリレベル（opossum等の専用ライブラリ使用）
B) カスタム実装（独自のサーキットブレーカーロジック）
C) API Gatewayレベル（AWS API Gatewayの機能活用）
D) その他（説明してください）

[Answer]: A

### Question 4: Rate Limiting Storage
アプリケーションレベルのレート制限の状態管理方法を教えてください。

A) インメモリ（express-rate-limit デフォルト）- シンプル、単一インスタンス限定
B) 分散ストレージ（Redis）- 全インスタンス共有、正確な制限
C) データベース - 既存インフラ活用、パフォーマンス懸念
D) その他（説明してください）

[Answer]: B. Upstash Redisを使用

### Question 5: Async Processing Requirements
非同期処理（メーリング通知、監査ログ処理等）が必要ですか？

A) 不要 - すべて同期処理
B) 必要（軽量）- Lambdaの非同期呼び出しで対応
C) 必要（本格的）- SQS/SNS等のメッセージキュー導入
D) その他（説明してください）

[Answer]: B

### Question 6: Database Connection Pooling Strategy
データベース接続プーリングの戦略を教えてください。

A) デフォルト設定（ORMの標準設定を使用）
B) カスタム設定（明示的なプールサイズとタイムアウト）
C) 動的調整（負荷に応じた自動調整）
D) その他（説明してください）

[Answer]: C

### Question 7: Secrets Caching Strategy
Secrets Manager からの機密情報取得のキャッシング方針を教えてください。

A) キャッシュなし - 毎回Secrets Manager API呼び出し
B) 短期キャッシュ（5分）- API コール削減、セキュリティ重視
C) 長期キャッシュ（1時間）- コスト削減、パフォーマンス重視
D) アプリケーション起動時のみ取得（再起動まで固定）

[Answer]: B

### Question 8: Distributed Tracing Sampling Rate
X-Ray分散トレーシングのサンプリングレートを教えてください。

A) 低サンプリング（1%）- コスト最小化
B) 標準サンプリング（10%）- バランス重視
C) 高サンプリング（50%）- 詳細な可視性
D) 動的サンプリング（エラーは100%、成功はX%）

[Answer]: D

### Question 9: Health Check Implementation
ヘルスチェックエンドポイントの実装レベルを教えてください。

A) 基本（200 OK返すのみ）
B) 標準（データベース接続確認含む）
C) 包括的（全依存サービスの接続確認）
D) その他（説明してください）

[Answer]: B

### Question 10: Logging Strategy
本番環境のログレベルとログ出力戦略を教えてください。

A) INFO レベル - 重要イベントのみ
B) DEBUG レベル - 詳細ログ（トラブルシューティング重視）
C) 動的レベル - 環境変数で切り替え可能
D) その他（説明してください）

[Answer]: C

### Question 11: Correlation ID Strategy
リクエスト追跡のための相関ID戦略を教えてください。

A) なし - 追跡不要
B) API Gateway生成 - X-Ray trace IDを使用
C) アプリケーション生成 - カスタムUUID生成
D) その他（説明してください）

[Answer]: B

### Question 12: Failover Testing Strategy
本番環境でのフェイルオーバーテスト方針を教えてください。

A) テストなし - MVPでは不要
B) 定期的なChaos Engineering（四半期ごと）
C) 手動フェイルオーバー訓練（年1回）
D) その他（説明してください）

[Answer]: D. AIによる擬似障害シミュレーション（ステージング）＋ 本番は Aurora 1クリック・フェイルオーバー訓練（初回）

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Awaiting User Input