# U3: Project Domain - NFR Design Plan

## Overview

本計画では、U3: Project DomainのNFR要件をデザインパターンと論理コンポーネントに落とし込みます。

**Unit**: U3 - Project Domain  
**Focus**: NFR要件の実装パターンと論理アーキテクチャ設計

**Prerequisites**:
- NFR Requirements完了
- Tech Stack Decisions完了

---

## NFR Design Steps

### Step 1: Resilience Patterns
**Status**: [ ]  
**Description**: 可用性99.9%を達成するための耐障害性パターンを設計

**Actions**:
- [ ] エラーハンドリング戦略の設計
- [ ] リトライポリシーの定義
- [ ] フォールバック戦略の設計

**Questions**:

**Q1: DynamoDBエラー時のリトライ戦略は？**

DynamoDB操作でエラーが発生した場合のリトライ方針は？

A) Exponential backoff（指数バックオフ、AWS SDK標準）
B) Fixed interval retry（固定間隔リトライ）
C) Immediate retry（即座リトライ）
D) No retry（リトライなし、即座エラー返却）
E) その他（[Answer]タグの後に記述してください）

[Answer]: A

**Q2: サービス間通信のタイムアウト設定は？**

U3がU2: Authentication Domainと通信する際のタイムアウト設定は？

A) 5秒（厳格、高速失敗）
B) 10秒（標準的）
C) 30秒（緩い、Lambda timeout）
D) その他（[Answer]タグの後に記述してください）

[Answer]: B

---

### Step 2: Scalability Patterns
**Status**: [ ]  
**Description**: 3,000プロジェクトへのスケーリングパターンを設計

**Actions**:
- [ ] ページネーション戦略の設計
- [ ] クエリ最適化パターンの定義
- [ ] キャッシング戦略の検討

**Questions**:

**Q3: ページネーション実装方式は？**

プロジェクト一覧のページネーション実装方式は？

A) Cursor-based（DynamoDB LastEvaluatedKey使用、推奨）
B) Offset-based（ページ番号指定、DynamoDBには非効率）
C) ハイブリッド（Cursor + ページサイズ指定）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

**Q4: デフォルトページサイズは？**

プロジェクト一覧取得時のデフォルトページサイズは？

A) 10件（少ない、高速レスポンス）
B) 20件（標準的）
C) 50件（多い、リクエスト数削減）
D) 100件（最大、一度に多くのデータ）
E) その他（[Answer]タグの後に記述してください）

[Answer]: B

---

### Step 3: Performance Patterns
**Status**: [ ]  
**Description**: < 500msレスポンス目標を達成するパフォーマンスパターンを設計

**Actions**:
- [ ] DynamoDB最適化パターンの設計
- [ ] レスポンス最適化戦略の定義
- [ ] パフォーマンスモニタリング戦略の設計

**Questions**:

**Q5: DynamoDB読み取りの一貫性レベルは？**

プロジェクトデータ読み取り時の一貫性レベルは？

A) Eventually Consistent（結果整合性、デフォルト、50%コスト削減）
B) Strongly Consistent（強い整合性、重要な操作のみ）
C) ハイブリッド（操作によって使い分け）
D) その他（[Answer]タグの後に記述してください）

[Answer]: C

**Q6: レスポンスデータの最適化方針は？**

APIレスポンスのデータ量を最適化する方針は？

A) フィールド選択（クライアントが必要なフィールドのみ返却）
B) フルレスポンス（すべてのフィールドを常に返却、シンプル）
C) ページネーション強制（大量データは分割必須）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

### Step 4: Security Patterns
**Status**: [ ]  
**Description**: セキュリティ要件を満たすパターンを設計

**Actions**:
- [ ] 認証・認可パターンの設計
- [ ] データバリデーションパターンの定義
- [ ] セキュアログ記録パターンの設計

**Questions**:

**Q7: 認証トークン検証の実装方式は？**

JWT token検証の実装パターンは？

A) Middleware（すべてのルートで共通検証）
B) Decorator/Annotation（ルートごとに明示的に指定）
C) Route Guard（特定のルートグループのみ保護）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

**Q8: 認可（Authorization）の実装レベルは？**

プロジェクトアクセス制御の実装レベルは？

A) Owner-only（オーナーのみ全権限）
B) Owner + Shared users（オーナー全権限、共有ユーザー読取のみ）
C) RBAC（Role-Based Access Control、複雑な権限モデル）
D) その他（[Answer]タグの後に記述してください）

[Answer]: B

---

### Step 5: Logical Components - Data Access Layer
**Status**: [ ]  
**Description**: データアクセス層の論理コンポーネントを設計

**Actions**:
- [ ] Repository patternの設計
- [ ] DynamoDB抽象化の設計
- [ ] エンティティマッピングの定義

**Questions**:

**Q9: Repositoryパターンの粒度は？**

データアクセスRepositoryの設計粒度は？

A) エンティティ単位（ProjectRepository, TemplateRepository等）
B) 集約単位（ProjectAggregateRepository、関連エンティティをまとめて）
C) ドメイン単位（ProjectDomainRepository、すべてのエンティティを1つのRepositoryに）
D) その他（[Answer]タグの後に記述してください）

[Answer]: B

**Q10: DynamoDBマーシャリング方式は？**

DynamoDBの AttributeValue ⇔ TypeScript object 変換方式は？

A) AWS SDK utilities（marshall/unmarshall関数使用）
B) カスタムマッパー（独自の変換ロジック、柔軟性高い）
C) ORM風ライブラリ（DynamoDB Toolbox等）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

### Step 6: Logical Components - Business Logic Layer
**Status**: [ ]  
**Description**: ビジネスロジック層の論理コンポーネントを設計

**Actions**:
- [ ] Service層の設計
- [ ] ビジネスルール実装パターンの定義
- [ ] トランザクション境界の設計

**Questions**:

**Q11: Service層の責務範囲は？**

Service層が担う責務の範囲は？

A) Thin Service（バリデーション + Repository呼び出しのみ）
B) Rich Service（ビジネスロジック + オーケストレーション）
C) Domain-Driven Service（ドメインモデル中心、複雑なビジネスルール）
D) その他（[Answer]タグの後に記述してください）

[Answer]: B

**Q12: ビジネスルール実装の配置場所は？**

ビジネスルール（バリデーション、制約チェック等）の実装場所は？

A) Service層（Service内でビジネスルール実装）
B) Domain Model層（エンティティクラス内にロジック）
C) Validator層（専用のValidator classで分離）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

### Step 7: Logical Components - API Layer
**Status**: [ ]  
**Description**: API層の論理コンポーネントを設計

**Actions**:
- [ ] Controller/Handler設計
- [ ] ルーティング戦略の定義
- [ ] ミドルウェアチェーンの設計

**Questions**:

**Q13: Controller/Handlerの責務範囲は？**

Controller/Handlerが担う責務の範囲は？

A) Thin Controller（リクエスト解析 + Serviceレイヤー呼び出し + レスポンス整形）
B) Fat Controller（バリデーション + ビジネスロジック含む）
C) その他（[Answer]タグの後に記述してください）

[Answer]: A

**Q14: エラーハンドリングの実装方式は？**

APIエラーハンドリングの実装パターンは？

A) Global Error Handler（Express error middleware、集中管理）
B) Per-route Error Handler（ルートごとに個別実装）
C) Hybrid（Global + 特定エラーは個別ハンドリング）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

### Step 8: Logical Components - Observability
**Status**: [ ]  
**Description**: 観測可能性のための論理コンポーネントを設計

**Actions**:
- [ ] ロギング戦略の設計
- [ ] メトリクス収集パターンの定義
- [ ] トレーシング戦略の設計

**Questions**:

**Q15: ログレベルの使い分け戦略は？**

ログレベル（DEBUG, INFO, WARN, ERROR）の使い分け基準は？

A) 環境ベース（開発=DEBUG, 本番=INFO）
B) 機能ベース（認証=INFO, データ操作=DEBUG）
C) ユースケースベース（正常系=INFO, 異常系=WARN/ERROR）
D) その他（[Answer]タグの後に記述してください）

[Answer]: C

**Q16: カスタムメトリクスの収集範囲は？**

CloudWatch Custom Metricsとして収集するメトリクスは？

A) 最小限（API呼び出し数、エラー率のみ）
B) 標準（+ DynamoDB操作数、レスポンスタイム）
C) 包括的（+ ビジネスメトリクス：プロジェクト作成数等）
D) その他（[Answer]タグの後に記述してください）

[Answer]: C

---

### Step 9: Data Flow Design
**Status**: [ ]  
**Description**: システム全体のデータフローを設計

**Actions**:
- [ ] リクエストフローの設計
- [ ] データ変換ポイントの定義
- [ ] エラーフローの設計

**Questions**:

**Q17: リクエストフローのレイヤー構成は？**

APIリクエストがシステムを通過するレイヤー構成は？

A) 3層（Controller → Service → Repository）
B) 4層（Controller → UseCase → Service → Repository）
C) 5層以上（Controller → UseCase → Service → Domain → Repository）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

**Q18: データ変換（DTO）の戦略は？**

データ変換オブジェクト（DTO）の使用戦略は？

A) 各層で独自のDTO（Controller DTO, Service DTO, Domain Model, Repository DTO）
B) 共通DTOを再利用（Controller DTO = Service DTO）
C) DTOなし（Domain Modelを直接使用）
D) その他（[Answer]タグの後に記述してください）

[Answer]: B

---

### Step 10: Testing Strategy
**Status**: [ ]  
**Description**: テスト戦略とテストコンポーネントを設計

**Actions**:
- [ ] ユニットテスト戦略の設計
- [ ] 統合テスト戦略の定義
- [ ] モック戦略の設計

**Questions**:

**Q19: DynamoDBのモック戦略は？**

ユニットテストでのDynamoDBモック方式は？

A) AWS SDK Mock（aws-sdk-client-mock使用）
B) DynamoDB Local（ローカルDynamoDB起動）
C) In-memory Mock（jest.mock()で完全モック）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

**Q20: 統合テストの範囲は？**

統合テストでテストする範囲は？

A) API → Service → Repository（DynamoDBはモック）
B) API → Service → Repository → DynamoDB Local（E2Eに近い）
C) API → Service のみ（Repositoryはモック）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

## Execution Summary

**Total Steps**: 10  
**Required Artifacts**:
- `nfr-design-patterns.md` - NFR実装パターン定義
- `logical-components.md` - 論理コンポーネント設計

**NFR Requirements Coverage**:
- Scalability: ページネーション、クエリ最適化
- Performance: DynamoDB最適化、レスポンス最適化
- Availability: リトライ、エラーハンドリング
- Security: 認証・認可、バリデーション
- Observability: ロギング、メトリクス、トレーシング

---

**Plan Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Ready for User Input