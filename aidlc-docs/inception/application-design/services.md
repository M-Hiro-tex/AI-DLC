# Services

## Overview

本ドキュメントでは、Backend for Frontend (BFF) パターンに基づくサービス層の定義とオーケストレーションを説明します。

**アーキテクチャパターン**: Backend for Frontend (BFF)
- フロントエンド専用のバックエンドサービス層
- フロントエンドの要求に最適化されたAPI
- バックエンドサービス間のオーケストレーション

---

## Service Layer Architecture

```
Frontend (SPA)
     ↓ HTTP/REST
BFF Service Layer
     ↓
Backend Services
     ↓
Data Layer (DB + S3)
```

---

## Core Services

### 1. Authentication & Authorization Service
**Purpose**: 認証・認可の統合管理

**Responsibilities**:
- OAuth Provider統合のオーケストレーション
- セッション管理
- ユーザープロファイル管理
- 認証トークンの発行と検証

**Service Interface**:
```typescript
interface AuthService {
  // OAuth認証
  authenticateWithProvider(provider: 'google' | 'github', credentials: OAuthCredentials): Promise<AuthResponse>
  
  // セッション管理
  validateSession(token: string): Promise<SessionValidation>
  refreshSession(refreshToken: string): Promise<TokenPair>
  terminateSession(token: string): Promise<void>
  
  // ユーザープロファイル
  getUserProfile(userId: string): Promise<UserProfile>
  updateUserProfile(userId: string, data: ProfileUpdate): Promise<UserProfile>
}
```

**Orchestration Pattern**:
1. Frontend → BFF: OAuth認証リクエスト
2. BFF → OAuth Provider: 認証実行
3. BFF → User Service: ユーザープロファイル作成/取得
4. BFF → Session Service: セッション作成
5. BFF → Frontend: 認証トークン返却

---

### 2. Project Management Service
**Purpose**: プロジェクトライフサイクル管理

**Responsibilities**:
- プロジェクトCRUD操作
- プロジェクトとユーザーの関連付け
- プロジェクト検索とフィルタリング
- プロジェクトメタデータ管理

**Service Interface**:
```typescript
interface ProjectManagementService {
  // プロジェクト操作
  createProject(userId: string, projectData: ProjectCreate): Promise<Project>
  getProject(projectId: string, userId: string): Promise<ProjectDetail>
  updateProject(projectId: string, updates: ProjectUpdate): Promise<Project>
  deleteProject(projectId: string, userId: string): Promise<void>
  
  // プロジェクト一覧・検索
  listUserProjects(userId: string, options: ListOptions): Promise<ProjectList>
  searchProjects(userId: string, query: SearchQuery): Promise<Project[]>
  
  // 統計
  getProjectStatistics(projectId: string): Promise<ProjectStats>
}
```

**Orchestration Pattern**:
1. Frontend → BFF: プロジェクト作成リクエスト
2. BFF → Auth Service: ユーザー認証確認
3. BFF → Project Service: プロジェクト作成
4. BFF → Data Persistence Service: プロジェクトデータ保存
5. BFF → Frontend: 作成されたプロジェクト返却

---

### 3. Specification Management Service
**Purpose**: 仕様ドキュメントの統合管理

**Responsibilities**:
- 仕様の作成・編集・保存
- 仕様のバージョン管理
- リアルタイム検証の調整
- 仕様と生成コードの関連付け

**Service Interface**:
```typescript
interface SpecificationManagementService {
  // 仕様操作
  createSpecification(projectId: string, content: string): Promise<Specification>
  getSpecification(specId: string): Promise<SpecificationDetail>
  updateSpecification(specId: string, content: string): Promise<Specification>
  saveSpecification(specId: string, content: string): Promise<void>
  
  // バージョン管理
  createVersion(specId: string, comment: string): Promise<Version>
  getVersionHistory(specId: string): Promise<Version[]>
  restoreVersion(specId: string, versionId: string): Promise<Specification>
  
  // 検証
  validateSpecification(content: string): Promise<ValidationResult>
  validateIncremental(specId: string, changes: Change[]): Promise<ValidationResult>
}
```

**Orchestration Pattern**:
1. Frontend → BFF: 仕様保存リクエスト
2. BFF → Validation Service: 仕様検証
3. BFF → Specification Service: 仕様保存
4. BFF → Version Control Service: バージョン作成（必要に応じて）
5. BFF → Data Persistence Service: データ永続化
6. BFF → Frontend: 保存結果返却

---

### 4. Code Generation Service
**Purpose**: AIと連携したコード生成の統合管理

**Responsibilities**:
- 仕様からのコード生成オーケストレーション
- AI Serviceとの連携
- 生成コードの検証と構造化
- 生成コードの保存と管理

**Service Interface**:
```typescript
interface CodeGenerationService {
  // コード生成
  generateCode(specId: string, options: GenerationOptions): Promise<GeneratedCode>
  regenerateCode(codeId: string, options: GenerationOptions): Promise<GeneratedCode>
  
  // AI支援
  suggestCode(spec: string, context: GenerationContext): Promise<CodeSuggestion>
  improveCode(code: string, feedback: string): Promise<ImprovedCode>
  
  // コード管理
  getGeneratedCode(codeId: string): Promise<CodeDetail>
  listGeneratedCodes(projectId: string): Promise<GeneratedCode[]>
  
  // ダウンロード
  prepareDownload(codeId: string, format: 'zip' | 'tar'): Promise<DownloadLink>
}
```

**Orchestration Pattern**:
1. Frontend → BFF: コード生成リクエスト
2. BFF → Specification Service: 仕様取得
3. BFF → AI Service: AI支援によるコード生成
4. BFF → Code Generator: コード生成実行
5. BFF → Validation Service: 生成コード検証
6. BFF → Data Persistence Service: コード保存（DB + S3）
7. BFF → Frontend: 生成結果返却

---

### 5. Validation & Consistency Service
**Purpose**: 検証と整合性チェックの統合管理

**Responsibilities**:
- 仕様の構文・意味検証
- 仕様とコードの整合性チェック
- 検証結果の集約と提示
- リアルタイム検証の管理

**Service Interface**:
```typescript
interface ValidationConsistencyService {
  // 仕様検証
  validateSpecification(spec: string): Promise<ValidationResult>
  validateSyntax(spec: string): Promise<SyntaxValidationResult>
  validateSemantics(spec: string): Promise<SemanticValidationResult>
  
  // 整合性チェック
  checkConsistency(specId: string, codeId: string): Promise<ConsistencyResult>
  findInconsistencies(spec: string, code: string): Promise<Inconsistency[]>
  
  // 検証ルール管理
  getValidationRules(): Promise<ValidationRule[]>
  customizeRules(rules: RuleCustomization): Promise<void>
}
```

**Orchestration Pattern**:
1. Frontend → BFF: 検証リクエスト
2. BFF → Validation Service: 構文検証実行
3. BFF → Validation Service: 意味検証実行
4. BFF → Specification Service: 関連データ取得
5. BFF → Consistency Checker: 整合性チェック実行
6. BFF → Frontend: 統合された検証結果返却

---

### 6. Tutorial & Help Service
**Purpose**: 学習支援とヘルプ機能の統合管理

**Responsibilities**:
- チュートリアルフローの管理
- サンプルプロジェクトの提供
- コンテキストヘルプの提供
- 学習進捗の追跡（Post-MVP）

**Service Interface**:
```typescript
interface TutorialHelpService {
  // チュートリアル
  getTutorialSteps(): Promise<TutorialStep[]>
  recordTutorialProgress(userId: string, stepId: string): Promise<void>
  completeTutorial(userId: string, tutorialId: string): Promise<void>
  
  // サンプルプロジェクト
  listSampleProjects(): Promise<Sample[]>
  getSampleProject(sampleId: string): Promise<SampleDetail>
  loadSampleToProject(userId: string, sampleId: string): Promise<Project>
  
  // ヘルプ
  searchHelp(query: string): Promise<HelpResult[]>
  getContextHelp(context: string): Promise<HelpContent>
}
```

**Orchestration Pattern**:
1. Frontend → BFF: サンプルロードリクエスト
2. BFF → Sample Repository: サンプルデータ取得
3. BFF → Project Service: 新規プロジェクト作成
4. BFF → Specification Service: サンプル仕様コピー
5. BFF → Frontend: ロードされたプロジェクト返却

---

## Service Communication Patterns

### Synchronous Communication (REST API)
**Use Cases**:
- CRUD操作
- ユーザーインタラクション
- リアルタイム応答が必要な操作

**Example**:
```typescript
// Frontend → BFF
POST /api/projects
GET /api/projects/{id}
PUT /api/projects/{id}
DELETE /api/projects/{id}

// BFF → Backend Services
Internal Service Calls
```

---

### Asynchronous Communication (Future Enhancement)
**Use Cases**:
- 重いコード生成処理
- バッチ処理
- 通知システム

**Example**:
```typescript
// コード生成の非同期処理（将来）
POST /api/code-generation/jobs
GET /api/code-generation/jobs/{jobId}/status
```

**Note**: MVPでは同期処理、将来的に非同期処理に拡張

---

## Service Error Handling

### Error Response Format
```typescript
interface ServiceError {
  code: string
  message: string
  details?: any
  timestamp: string
  requestId: string
}
```

### Error Handling Strategy
1. **Validation Errors**: フロントエンドで基本検証、バックエンドで詳細検証
2. **Business Logic Errors**: サービス層でキャッチし、適切なエラーレスポンス
3. **Infrastructure Errors**: リトライロジック + フォールバック
4. **External Service Errors**: AI Service障害時のフォールバック戦略

---

## Service Security

### Authentication Flow
1. OAuth Provider認証
2. BFF Serviceでセッション作成
3. JWTトークン発行
4. すべてのリクエストでトークン検証

### Authorization
- Role-Based Access Control（将来）
- Resource-Based Access Control（プロジェクト所有権）

---

## Service Scalability Considerations

### Current (MVP)
- 単一インスタンス
- 同期処理中心
- 小規模ユーザー向け（数名～数十名）

### Future Enhancements
- 水平スケーリング（複数インスタンス）
- 非同期処理の導入
- キャッシング戦略
- CDN統合
- APIゲートウェイの導入

---

## Service Monitoring & Observability

### Logging
- リクエスト/レスポンスログ
- エラーログ
- パフォーマンスログ

### Metrics
- リクエスト数
- レスポンスタイム
- エラー率
- AI API使用量

### Tracing (Future)
- 分散トレーシング
- サービス間のリクエストフロー追跡

---

## Service Dependencies

```
Frontend Layer
    ↓
BFF Service Layer
    ↓
+-- Authentication Service
+-- Project Management Service
+-- Specification Management Service
+-- Code Generation Service
+-- Validation & Consistency Service
+-- Tutorial & Help Service
    ↓
Backend Components
    ↓
Data Layer (DB + S3)
    ↓
External Services (OAuth, AI API)
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-31  
**Status**: Complete