# Application Components

## Overview

本ドキュメントでは、仕様駆動開発プラットフォームの主要コンポーネントを定義します。

**アーキテクチャ方針**:
- Frontend/Backend完全分離
- Backend for Frontend (BFF) Pattern
- 拡張性重視（将来の機能追加を考慮）
- Single Page Application (SPA)

---

## Frontend Components

### 1. Authentication Component
**Purpose**: ユーザー認証とセッション管理を担当

**Responsibilities**:
- ソーシャルログイン（Google、GitHub）のUI提供
- OAuth認証フローの制御
- セッション状態の管理
- ログアウト処理
- 認証エラーハンドリング

**Interfaces**:
- `AuthenticationUI`: ログイン画面コンポーネント
- `SessionManager`: セッション状態管理
- `OAuthHandler`: OAuth認証処理

---

### 2. Project Management Component
**Purpose**: プロジェクトの作成、閲覧、管理を担当

**Responsibilities**:
- プロジェクト一覧の表示
- 新規プロジェクト作成UI
- プロジェクト詳細表示
- プロジェクト削除機能
- プロジェクトメタデータ編集

**Interfaces**:
- `ProjectListView`: プロジェクト一覧表示
- `ProjectCreationForm`: プロジェクト作成フォーム
- `ProjectDetailView`: プロジェクト詳細表示
- `ProjectManager`: プロジェクト操作制御

---

### 3. Specification Editor Component
**Purpose**: 仕様の作成・編集とリアルタイム検証を担当

**Responsibilities**:
- インタラクティブなエディタUIの提供
- シンタックスハイライト
- リアルタイム検証表示
- エディタ状態管理
- 自動保存機能のトリガー

**Interfaces**:
- `EditorUI`: エディタインターフェース
- `ValidationDisplay`: 検証結果表示
- `EditorStateManager`: エディタ状態管理

**Note**: エディタUI + 検証表示のみ。保存機能は別コンポーネント（Data Persistence Component）

---

### 4. Code Preview Component
**Purpose**: 生成されたコードのプレビュー表示を担当

**Responsibilities**:
- 生成コードの表示
- シンタックスハイライト
- ファイル構造の可視化
- ダウンロード機能のUI

**Interfaces**:
- `CodeViewer`: コード表示インターフェース
- `FileTreeView`: ファイル構造表示
- `DownloadHandler`: ダウンロード処理

**Note**: エディタとは分離されたViewコンポーネント

---

### 5. Validation Viewer Component
**Purpose**: 整合性チェック結果の表示を担当

**Responsibilities**:
- 検証結果の視覚的表示
- エラーと警告の区別表示
- 問題箇所のハイライト
- 修正提案の表示

**Interfaces**:
- `ValidationResultView`: 検証結果表示
- `IssueHighlighter`: 問題箇所ハイライト

---

### 6. Tutorial Component
**Purpose**: ユーザーガイダンスとチュートリアルを担当

**Responsibilities**:
- 初回ウェルカムツアー
- ステップバイステップガイド
- サンプルプロジェクトの提供
- コンテキストヘルプ表示

**Interfaces**:
- `TutorialWizard`: チュートリアルウィザード
- `ContextHelp`: コンテキストヘルプ
- `SampleProjectLoader`: サンプルロード

---

### 7. UI Shell Component
**Purpose**: アプリケーション全体のレイアウトとナビゲーションを担当

**Responsibilities**:
- ヘッダーとナビゲーションバー
- サイドバー制御
- ルーティング管理
- レスポンシブレイアウト

**Interfaces**:
- `AppShell`: アプリケーションシェル
- `Navigation`: ナビゲーションコントロール
- `RouteManager`: ルート管理

---

## Backend Components (BFF Layer)

### 8. Authentication Service Component
**Purpose**: 認証とセッション管理のバックエンド処理

**Responsibilities**:
- OAuth Provider統合（Google、GitHub）
- セッショントークン管理
- ユーザープロファイル管理
- 認証状態の検証
- セキュリティポリシーの適用

**Interfaces**:
- `AuthenticationService`: 認証サービス
- `OAuthIntegration`: OAuth統合
- `SessionService`: セッション管理
- `UserProfileService`: ユーザープロファイル

---

### 9. Project Service Component
**Purpose**: プロジェクトデータの管理と永続化

**Responsibilities**:
- プロジェクトCRUD操作
- プロジェクトメタデータ管理
- プロジェクト所有権管理
- プロジェクト検索・フィルタリング

**Interfaces**:
- `ProjectService`: プロジェクト管理サービス
- `ProjectRepository`: データアクセス層
- `ProjectQueryService`: 検索サービス

---

### 10. Specification Service Component
**Purpose**: 仕様ドキュメントの管理と処理

**Responsibilities**:
- 仕様CRUD操作
- 仕様バージョン管理
- 仕様の永続化
- 仕様の検索・取得

**Interfaces**:
- `SpecificationService`: 仕様管理サービス
- `SpecificationRepository`: データアクセス層
- `VersionControlService`: バージョン管理

---

### 11. Validation Service Component
**Purpose**: 仕様の検証と整合性チェック

**Responsibilities**:
- 仕様の構文検証
- 仕様の意味検証
- 整合性ルールの適用
- 検証結果の生成

**Interfaces**:
- `ValidationEngine`: 検証エンジン
- `SyntaxValidator`: 構文検証
- `SemanticValidator`: 意味検証
- `ConsistencyChecker`: 整合性チェック

---

### 12. Code Generation Service Component
**Purpose**: 仕様からのコード生成

**Responsibilities**:
- 仕様の解析
- コードテンプレート適用
- コード生成実行
- 生成コードの構造化
- AI Service Componentとの連携

**Interfaces**:
- `CodeGenerator`: コード生成エンジン
- `SpecificationParser`: 仕様パーサー
- `TemplateEngine`: テンプレートエンジン
- `CodeStructurer`: コード構造化

---

### 13. AI Service Component
**Purpose**: AI機能の統合と管理（独立サービス）

**Responsibilities**:
- 外部AI API統合（OpenAI、Claude等）
- AIリクエストの制御
- AIレスポンスの処理
- AI機能の抽象化
- 課金・使用量管理の準備

**Interfaces**:
- `AIService`: AI統合サービス
- `AIProviderAdapter`: AIプロバイダーアダプター
- `AIRequestHandler`: リクエストハンドラー
- `AIResponseProcessor`: レスポンス処理

**Note**: 将来的な有料版を見据えた設計

---

### 14. Data Persistence Service Component
**Purpose**: データの永続化とストレージ管理

**Responsibilities**:
- データベース操作（DynamoDB/RDS）
- S3ファイルストレージ管理
- データのバックアップ
- ストレージ戦略の実装
- トランザクション管理

**Interfaces**:
- `DatabaseService`: データベースサービス
- `FileStorageService`: ファイルストレージ（S3）
- `TransactionManager`: トランザクション管理

**Note**: Hybrid Storage - 構造化データ（DB）+ ファイル（S3）

---

## Component Summary

### Frontend Components (7)
1. Authentication Component
2. Project Management Component
3. Specification Editor Component
4. Code Preview Component
5. Validation Viewer Component
6. Tutorial Component
7. UI Shell Component

### Backend Components (7)
8. Authentication Service Component
9. Project Service Component
10. Specification Service Component
11. Validation Service Component
12. Code Generation Service Component
13. AI Service Component
14. Data Persistence Service Component

**Total Components**: 14

---

## Component Mapping to Requirements

| Component | Requirements Covered |
|-----------|---------------------|
| Authentication Component + Service | FR3 (Authentication) |
| Project Management Component + Service | FR1 (Core Platform), FR7 (Data Persistence) |
| Specification Editor Component + Service | FR4.1 (Spec Creation), FR5 (Interactive Editor) |
| Validation Service + Viewer Component | FR4.3 (Validation & Consistency) |
| Code Generation Service + Preview Component | FR4.2 (Code Generation) |
| AI Service Component | FR4.4 (AI Assistance) |
| Tutorial Component | FR6 (User-Friendly UI) |
| Data Persistence Service | FR7 (Data Persistence) |
| UI Shell Component | FR6 (User-Friendly UI), FR2 (Multi-User Support) |

---

## Design Principles

1. **分離の原則**: Frontend/Backend完全分離で独立した開発・デプロイ
2. **単一責務**: 各コンポーネントは明確な責務を持つ
3. **拡張性**: 将来の機能追加を考慮した設計
4. **疎結合**: コンポーネント間の依存を最小化
5. **テスト容易性**: 各コンポーネントは独立してテスト可能

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-31  
**Status**: Complete