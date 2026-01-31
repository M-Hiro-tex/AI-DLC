# U2: Authentication Domain - Infrastructure Design Plan

## Unit Context

**Unit**: U2 - Authentication Domain  
**Type**: Backend Service  
**Technology**: Node.js + TypeScript + Express  
**Database**: **Hybrid Approach**
  - **dev環境**: Neon Serverless Postgres (aws-us-west-2)
  - **prod環境**: Aurora Serverless v2 PostgreSQL (ap-northeast-1)
**Deployment Target**: AWS (ap-northeast-1 Tokyo)

### Prerequisites Complete
- Functional Design: Business logic, domain entities, OAuth flows
- NFR Requirements: Performance, scalability, availability, security requirements
- NFR Design: Design patterns and logical components defined
- **Database Selection**: Hybrid approach approved (dev: Neon, prod: Aurora)

---

## Infrastructure Design Plan

### Step 1: Compute Platform Selection
- [ ] Determine compute platform for authentication service
  - [ ] Lambda vs ECS Fargate decision
  - [ ] Rationale for selection
  - [ ] Configuration parameters
- [ ] Define resource allocation
  - [ ] Memory configuration
  - [ ] CPU configuration
  - [ ] Timeout settings

### Step 2: Network Architecture Design
- [ ] Design VPC architecture
  - [ ] CIDR blocks
  - [ ] Subnet strategy (public, private, isolated)
  - [ ] Availability zone distribution
- [ ] Design security groups
  - [ ] Inbound rules
  - [ ] Outbound rules
  - [ ] Port configurations
- [ ] NAT Gateway vs NAT Instance decision

### Step 3: Database Infrastructure Design
- [ ] Aurora Serverless v2 configuration
  - [ ] ACU range (min/max)
  - [ ] Multi-AZ setup
  - [ ] Subnet groups
  - [ ] Parameter groups
- [ ] Backup and restore strategy
  - [ ] Automated backup schedule
  - [ ] Retention period
  - [ ] Point-in-time recovery

### Step 4: API Gateway Configuration
- [ ] REST API setup
  - [ ] Stage configuration (dev, prod)
  - [ ] Custom domain setup
  - [ ] Certificate management (ACM)
- [ ] Integration configuration
  - [ ] Integration type (Lambda vs HTTP)
  - [ ] Request/response mapping
  - [ ] CORS configuration

### Step 5: Load Balancer Design (if ECS)
- [ ] ALB configuration
  - [ ] Listener rules
  - [ ] Target group settings
  - [ ] Health check configuration
- [ ] SSL/TLS termination
  - [ ] Certificate configuration
  - [ ] Security policy

### Step 6: External Services Integration
- [ ] Upstash Redis configuration
  - [ ] Region selection
  - [ ] Connection setup
  - [ ] TLS configuration
- [ ] Secrets Manager setup
  - [ ] Secret structure
  - [ ] Rotation configuration
  - [ ] Access policies

### Step 7: Monitoring Infrastructure
- [ ] CloudWatch configuration
  - [ ] Log groups and streams
  - [ ] Metric namespaces
  - [ ] Dashboard layout
- [ ] X-Ray configuration
  - [ ] Tracing setup
  - [ ] Sampling rules
  - [ ] Service map
- [ ] Alerting setup
  - [ ] SNS topics
  - [ ] Alarm thresholds
  - [ ] Notification channels

### Step 8: Security Configuration
- [ ] IAM roles and policies
  - [ ] Execution role
  - [ ] Task role (if ECS)
  - [ ] Principle of least privilege
- [ ] WAF rules
  - [ ] Rate limiting
  - [ ] SQL injection protection
  - [ ] XSS protection
- [ ] Network ACLs
  - [ ] Subnet-level controls

### Step 9: Deployment Pipeline Design
- [ ] CI/CD infrastructure
  - [ ] Source control integration
  - [ ] Build pipeline
  - [ ] Deployment strategy (blue-green, canary)
- [ ] Environment promotion
  - [ ] dev → prod workflow
  - [ ] Approval gates
  - [ ] Rollback procedures

### Step 10: Cost Optimization
- [ ] Resource sizing
  - [ ] Right-sizing recommendations
  - [ ] Reserved capacity decisions
- [ ] Cost monitoring
  - [ ] Budget alerts
  - [ ] Cost allocation tags

### Step 11: Generate Infrastructure Design Artifacts
- [x] Create `aidlc-docs/construction/u2-authentication/infrastructure-design/infrastructure-design.md`
- [x] Create `aidlc-docs/construction/u2-authentication/infrastructure-design/deployment-architecture.md`

---

## Questions for Clarification

### Question 1: Compute Platform Choice
認証サービスのコンピュートプラットフォームを選択してください。

A) Lambda - サーバーレス、コールドスタート許容、コスト効率
B) ECS Fargate - 常時稼働、予測可能なパフォーマンス、長時間実行
C) 両方（ハイブリッド）- dev環境はLambda、prod環境はECS
D) その他（説明してください）

[Answer]: D. インフラは AWS CDKまたはterraform で管理し、ECS on Fargate を採用して。dev 環境はコスト削減のため、必要な時だけ deploy/destroy できるようにスタックを構成し、Aurora Serverless v2 も連動してスケールさせるようにして。デプロイの高速化のため、Docker レイヤーキャッシュ を最大限活用する設定にして

### Question 2: Compute Configuration (if Lambda)
Lambdaを選択した場合の構成を教えてください。

A) 標準（メモリ: 512MB, タイムアウト: 30秒）
B) 高性能（メモリ: 1024MB, タイムアウト: 60秒）
C) カスタム（メモリとタイムアウトを指定）
D) N/A（Lambda未選択）

[Answer]: D

### Question 3: Compute Configuration (if ECS Fargate)
ECS Fargateを選択した場合の構成を教えてください。

A) 小規模（CPU: 0.25 vCPU, メモリ: 512MB）
B) 標準（CPU: 0.5 vCPU, メモリ: 1GB）
C) 高性能（CPU: 1 vCPU, メモリ: 2GB）
D) N/A（ECS未選択）

[Answer]: B

### Question 4: VPC and Subnet Strategy
VPCとサブネット戦略を教えてください。

A) シンプル（パブリックサブネットのみ）- コスト最小化、dev環境向け
B) 標準（パブリック + プライベート + NAT Gateway）- 推奨構成
C) 高セキュリティ（パブリック + プライベート + 分離サブネット）- 本番環境向け
D) その他（説明してください）

[Answer]: D. 環境別切り替え。prod: Public/Private/Isolatedの3層構造。NAT Gatewayを配置し、DBはIsolatedへ。、ブリックサブネット + Public IP（dev向け最強コスパ）、dev: Publicサブネットのみの構成。NAT Gatewayは作成せず、全リソースをPublicに配置しつつセキュリティグループでアクセス制限をかけてコストを最小化

### Question 5: Multi-AZ Configuration
Multi-AZ構成を教えてください。

A) dev環境：シングルAZ、prod環境：Multi-AZ（2 AZs）
B) すべての環境でMulti-AZ（2 AZs）
C) すべての環境でMulti-AZ（3 AZs）- 最高可用性
D) その他（説明してください）

[Answer]: A

### Question 6: Database ACU Configuration
Aurora Serverless v2のACU範囲を教えてください。

A) dev環境：0.5-4 ACU、prod環境：0.5-16 ACU
B) dev環境：0.5-2 ACU、prod環境：1-8 ACU
C) すべての環境で1-16 ACU
D) その他（説明してください）

[Answer]: A

### Question 7: API Gateway vs ALB
APIへのエントリーポイントを教えてください。

A) API Gateway のみ - Lambda統合、マネージド機能豊富
B) ALB のみ - ECS統合、シンプル、低コスト
C) 両方 - API Gatewayがフロント、ALBがバックエンド
D) その他（説明してください）

[Answer]: C

### Question 8: Custom Domain Configuration
カスタムドメインの設定方針を教えてください。

A) 設定しない - デフォルトURL使用（MVP期間）
B) 設定する - api.yourdomain.com（将来考慮含む）
C) 環境別ドメイン - dev-api.domain.com, api.domain.com
D) その他（説明してください）

[Answer]: C. devは圧倒的コスパ重視、prodは信頼性とコスパ重視

### Question 9: Backup Strategy
データベースバックアップ戦略を教えてください。

A) AWS自動バックアップ（デフォルト: 7日保持）
B) 拡張保持（30日保持 + S3エクスポート）
C) 最小限（1日保持）- dev環境のみ
D) その他（説明してください）

[Answer]: D. 環境別戦略（dev: 1日 / prod: 30日 + 継続的バックアップ）

### Question 10: Deployment Strategy
デプロイメント戦略を教えてください。

A) ローリングデプロイ - シンプル、ダウンタイムあり
B) Blue-Greenデプロイ - ゼロダウンタイム、簡単ロールバック
C) Canaryデプロイ - 段階的リリース、リスク最小化
D) その他（説明してください）

[Answer]: B

### Question 11: Monitoring and Alerting Channels
アラート通知チャンネルを教えてください。

A) Eメールのみ
B) Slack統合
C) PagerDuty統合（重大アラート）+ Slack（警告）
D) その他（説明してください）

[Answer]: Slack統合AWS hatbot、緊急時Twilioフリープラン連携

### Question 12: Cost Budget
月間インフラコスト予算を教えてください。

A) 最小限（$50-100/月）- dev環境中心、シングルAZ
B) 標準（$150-300/月）- Multi-AZ、適度なリソース
C) 柔軟（$300-500/月）- 高可用性、パフォーマンス重視
D) その他（説明してください）

[Answer]: A

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Awaiting User Input