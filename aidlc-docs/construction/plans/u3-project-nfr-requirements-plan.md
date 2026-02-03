# U3: Project Domain - NFR Requirements Plan

## Overview

本計画では、U3: Project Domain の非機能要件（NFR）を決定し、テクノロジースタック選択を行います。

**Unit**: U3 - Project Domain  
**Assigned Stories**: 10 stories (MVP: 6, Post-MVP: 4, Medium: 1)  
**Focus**: 非機能要件の定義とテクノロジースタック決定

---

## NFR Requirements Steps

### Step 1: Scalability Requirements Assessment
**Status**: [ ]  
**Description**: プロジェクト管理のスケーラビリティ要件を定義

**Actions**:
- [ ] 想定ユーザー数の定義
- [ ] 想定プロジェクト数の定義
- [ ] データ成長率の見積もり

**Questions**:

**Q1: プロジェクト数のスケール想定は？**

学習プラットフォームとして、どれくらいのプロジェクト数を想定しますか？

A) 小規模（ユーザー1人あたり最大50プロジェクト、総計～5万プロジェクト）
B) 中規模（ユーザー1人あたり最大100プロジェクト、総計～50万プロジェクト）
C) 大規模（ユーザー1人あたり無制限、総計100万プロジェクト以上）
D) その他（[Answer]タグの後に記述してください）

[Answer]: D.  小規模（ユーザー1人あたり最大3プロジェクト、総計～3千プロジェクト）

**Q2: プロジェクト一覧クエリのパフォーマンス要件は？**

ユーザーがプロジェクト一覧を開いたとき、どれくらいの応答時間を目標としますか？

A) < 100ms（非常に高速、DynamoDB GSI最適化必須）
B) < 500ms（標準的、通常のクエリ最適化）
C) < 1秒（許容範囲、複雑なフィルタリングも可能）
D) < 2秒（緩い要件）
E) その他（[Answer]タグの後に記述してください）

[Answer]: B

---

### Step 2: Performance Requirements
**Status**: [ ]  
**Description**: プロジェクトCRUD操作のパフォーマンス要件を定義

**Actions**:
- [ ] CRUD操作の応答時間目標
- [ ] 検索クエリのパフォーマンス目標
- [ ] ページネーションのパフォーマンス目標

**Questions**:

**Q3: プロジェクト作成・更新操作の応答時間目標は？**

プロジェクト作成や更新操作にかかる時間の目標は？

A) < 100ms（即座のフィードバック）
B) < 500ms（標準的なAPI応答）
C) < 1秒（許容範囲）
D) その他（[Answer]タグの後に記述してください）

[Answer]: B

**Q4: 検索機能のパフォーマンス要件は？**

名前検索やタグフィルタリングのパフォーマンス目標は？

A) < 500ms（高速検索、インデックス最適化必須）
B) < 1秒（標準的な検索速度）
C) < 2秒（複雑なフィルタリングを許容）
D) その他（[Answer]タグの後に記述してください）

[Answer]: B

---

### Step 3: Availability Requirements
**Status**: [ ]  
**Description**: プロジェクト管理サービスの可用性要件を定義

**Actions**:
- [ ] 目標稼働率の定義
- [ ] ダウンタイム許容度の定義
- [ ] フェイルオーバー要件の定義

**Questions**:

**Q5: サービスの目標稼働率は？**

Project Domainサービスの目標稼働率（Availability）は？

A) 99.9%（月間ダウンタイム～43分、標準的なSLA）
B) 99.5%（月間ダウンタイム～3.6時間、緩いSLA）
C) 99%（月間ダウンタイム～7.2時間、学習プラットフォームとして許容範囲）
D) ベストエフォート（明確なSLA不要）
E) その他（[Answer]タグの後に記述してください）

[Answer]: A

**Q6: データバックアップとリカバリー要件は？**

プロジェクトデータのバックアップとリカバリー要件は？

A) 自動日次バックアップ + ポイントインタイムリカバリー（高信頼性）
B) 自動日次バックアップのみ（標準的）
C) 定期的なスナップショット（週次or月次）
D) バックアップ不要（開発環境のため）
E) その他（[Answer]タグの後に記述してください）

[Answer]: D

---

### Step 4: Security Requirements
**Status**: [ ]  
**Description**: プロジェクトデータのセキュリティ要件を定義

**Actions**:
- [ ] 認証・認可要件の確認
- [ ] データ暗号化要件の定義
- [ ] アクセスログ要件の定義

**Questions**:

**Q7: プロジェクトデータの暗号化要件は？**

プロジェクトデータ（名前、説明、タグ等）の暗号化レベルは？

A) 保存時暗号化 + 転送時暗号化（DynamoDB Encryption at Rest + HTTPS）
B) 転送時暗号化のみ（HTTPS）
C) 暗号化不要（開発環境のため）
D) その他（[Answer]タグの後に記述してください）

[Answer]: C

**Q8: アクセスログと監査ログの要件は？**

プロジェクトへのアクセスや変更の監査ログは必要ですか？

A) 詳細な監査ログ（誰が、いつ、何を作成・更新・削除したか）
B) 基本的なアクセスログ（API呼び出しログのみ）
C) ログ不要（開発環境のため）
D) その他（[Answer]タグの後に記述してください）

[Answer]: B

---

### Step 5: Technology Stack Selection - Database
**Status**: [ ]  
**Description**: プロジェクトデータストレージのテクノロジー選択

**Actions**:
- [ ] データベース技術の選択
- [ ] データモデリング戦略の決定
- [ ] インデックス戦略の決定

**Questions**:

**Q9: プロジェクトデータのデータベース選択は？**

U2: Authentication DomainがDynamoDBを使用していますが、U3: Project Domainはどうしますか？

A) DynamoDB（認証ドメインと同じ、NoSQL、スケーラブル）
B) RDS PostgreSQL（リレーショナル、複雑なクエリに強い）
C) RDS Aurora Serverless（自動スケーリング、コスト最適化）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

**理由（オプション）**: 

**Q10: DynamoDB選択時のテーブル設計アプローチは？**

（Q9でDynamoDBを選択した場合）テーブル設計の方針は？

A) 単一テーブル設計（Projects、ProjectTemplates、UserMilestones等を1テーブルに集約）
B) 複数テーブル設計（Projects、ProjectTemplates、UserMilestones等を別テーブルに分離）
C) ハイブリッド（Projectsは専用テーブル、他は共有テーブル）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

### Step 6: Technology Stack Selection - Programming Language & Framework
**Status**: [ ]  
**Description**: プログラミング言語とフレームワークの選択

**Actions**:
- [ ] プログラミング言語の選択
- [ ] Webフレームワークの選択
- [ ] ORMまたはデータアクセスライブラリの選択

**Questions**:

**Q11: プログラミング言語とフレームワークの選択は？**

U2: Authentication DomainがTypeScript + Expressを使用していますが、U3: Project Domainはどうしますか？

A) TypeScript + Express（認証ドメインと同じ、一貫性重視）
B) TypeScript + NestJS（より構造化されたフレームワーク）
C) Python + FastAPI（Pythonエコシステム活用）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

**Q12: データアクセスライブラリの選択は？**

データベースアクセスに使用するライブラリは？
AA
A) AWS SDK for JavaScript v3（DynamoDB直接操作、軽量）
B) DynamoDB Toolbox（DynamoDB用の型安全なORM風ライブラリ）
C) TypeORM（RDS選択時、リレーショナルDB用ORM）
D) Prisma（モダンなORM、型安全）
E) その他（[Answer]タグの後に記述してください）

[Answer]: D

---

### Step 7: Technology Stack Selection - API Design
**Status**: [ ]  
**Description**: API設計方針とバリデーション戦略

**Actions**:
- [ ] APIスタイルの選択
- [ ] バリデーションライブラリの選択
- [ ] エラーハンドリング戦略の決定

**Questions**:

**Q13: API設計スタイルは？**

Project Domain APIの設計スタイルは？

A) RESTful API（標準的、認証ドメインと同じ）
B) GraphQL（柔軟なクエリ、クライアント主導）
C) gRPC（高性能、型安全）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

**Q14: バリデーションライブラリの選択は？**

リクエストデータのバリデーションに使用するライブラリは？

A) Zod（TypeScript優先、型推論）
B) Joi（成熟したバリデーションライブラリ）
C) class-validator（デコレータベース）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

### Step 8: Technology Stack Selection - Testing
**Status**: [ ]  
**Description**: テスト戦略とテストフレームワーク選択

**Actions**:
- [ ] テストフレームワークの選択
- [ ] モックライブラリの選択
- [ ] テストカバレッジ目標の設定

**Questions**:

**Q15: テストフレームワークの選択は？**

U2: Authentication DomainがJestを使用していますが、U3: Project Domainはどうしますか？

A) Jest（認証ドメインと同じ、標準的）
B) Vitest（高速、モダン）
C) Mocha + Chai（柔軟）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

**Q16: テストカバレッジの目標は？**

コードカバレッジの目標値は？

A) 80%以上（高品質、推奨）
B) 70%以上（標準的）
C) 60%以上（最低限）
D) 目標設定なし（ベストエフォート）
E) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

### Step 9: Technology Stack Selection - Observability
**Status**: [ ]  
**Description**: モニタリングとロギング戦略

**Actions**:
- [ ] ロギングライブラリの選択
- [ ] メトリクス収集戦略の決定
- [ ] トレーシング戦略の決定

**Questions**:

**Q17: ロギングとモニタリングの戦略は？**

U2: Authentication Domainが@aws-lambda-powertools/loggerを使用していますが、U3はどうしますか？

A) AWS Lambda Powertools（認証ドメインと同じ、構造化ログ）
B) Winston（柔軟なロギングライブラリ）
C) Pino（高速、軽量）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

**Q18: 分散トレーシングは必要ですか？**

マイクロサービス間のトレーシング（AWS X-Ray等）は必要ですか？

A) はい、必須（認証ドメインとの連携を追跡）
B) はい、推奨（デバッグに有用）
C) いいえ、不要（シンプルな構成のため）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

### Step 10: Deployment and Infrastructure
**Status**: [ ]  
**Description**: デプロイメント戦略とインフラ構成

**Actions**:
- [ ] デプロイメントモデルの選択
- [ ] インフラコード管理方法の決定
- [ ] CI/CDパイプライン要件の定義

**Questions**:

**Q19: デプロイメントモデルは？**

U2: Authentication DomainがLambda + API Gatewayを使用していますが、U3はどうしますか？

A) Lambda + API Gateway（認証ドメインと同じ、サーバーレス）
B) ECS Fargate（コンテナベース、長時間実行可能）
C) EC2（従来型、フルコントロール）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

**Q20: インフラコード管理方法は？**

インフラストラクチャのコード化（IaC）方法は？

A) AWS CDK（TypeScript、認証ドメインと同じ）
B) Terraform（宣言的、マルチクラウド対応）
C) CloudFormation（AWS純正）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

## Execution Summary

**Total Steps**: 10  
**Required Artifacts**:
- `nfr-requirements.md` - 非機能要件定義
- `tech-stack-decisions.md` - テクノロジースタック選択の根拠

**Story Coverage**:  
全10 stories（MVP 6 + Post-MVP 4 + Medium 1）に対するNFR要件を定義

---

**Plan Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Ready for User Input