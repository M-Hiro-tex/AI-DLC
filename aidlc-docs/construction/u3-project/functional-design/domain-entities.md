# U3: Project Domain - Domain Entities

## Overview

本ドキュメントでは、Project Domainのドメインエンティティを定義します。

**Focus**: エンティティ定義、属性、関係性

---

## 1. Core Domain Entities

### 1.1 Project Entity

**Purpose**: プロジェクトのメタデータとライフサイクルを管理

**Entity Definition**:

```typescript
interface Project {
  // === Identification ===
  id: string;              // UUID, Primary Key
  
  // === Basic Metadata ===
  name: string;            // 3-100文字、英数字と一部記号
  description?: string;    // 最大1000文字、オプション
  
  // === Ownership ===
  ownerId: string;         // Foreign Key to User (Authentication Domain)
  sharedWith: string[];    // Foreign Keys to Users (読み取り専用アクセス)
  teamId?: string;         // Foreign Key to Team (Post-MVP)
  
  // === Status Information ===
  status: ProjectStatus;   // Draft | Active | Completed
  progressRate: number;    // 0-100
  
  // === Categorization ===
  tags: string[];          // 最大10個、各20文字以内
  category?: string;       // オプション
  
  // === Template Information ===
  templateId?: string;     // Foreign Key to ProjectTemplate
  
  // === Related Resources ===
  specificationIds: string[];      // Foreign Keys to Specifications
  generatedCodeIds: string[];      // Foreign Keys to GeneratedCodes
  
  // === Statistics ===
  specificationChangeCount: number;  // 仕様変更回数
  codeGenerationCount: number;       // コード生成回数
  
  // === Timestamps ===
  createdAt: Date;         // ISO 8601 timestamp
  updatedAt: Date;         // ISO 8601 timestamp, auto-updated
  deletedAt?: Date;        // ISO 8601 timestamp, Soft Delete
}
```

---

#### Field Descriptions

**id**:
- Type: UUID v4
- Example: "550e8400-e29b-41d4-a716-446655440000"
- Immutable: Yes

**name**:
- Type: String
- Constraints: 3-100文字、^[a-zA-Z0-9 _-]{3,100}$
- Example: "My First Project"
- Immutable: No
- Unique: Yes (per ownerId)

**description**:
- Type: String | null
- Constraints: 最大1000文字
- Example: "This is a learning project for code generation"
- Immutable: No

**ownerId**:
- Type: UUID (Foreign Key)
- References: User.id (Authentication Domain)
- Example: "123e4567-e89b-12d3-a456-426614174000"
- Immutable: Yes (MVP), No (Post-MVP with transfer feature)

**sharedWith**:
- Type: Array<UUID>
- References: User.id[] (Authentication Domain)
- Example: ["123e...", "456e..."]
- Immutable: No
- Access Level: Read-only for shared users

**status**:
- Type: Enum (ProjectStatus)
- Values: "Draft", "Active", "Completed"
- Default: "Draft"
- Immutable: No
- Transition Rules: See business-logic-model.md Section 1.2

**progressRate**:
- Type: Number
- Range: 0-100
- Default: 0
- Immutable: No
- Auto-calculated: Optional (manual or auto)

**tags**:
- Type: Array<String>
- Constraints: 最大10個、各1-20文字
- Example: ["tutorial", "beginner", "web-app"]
- Immutable: No

**specificationIds**:
- Type: Array<UUID>
- References: Specification.id[] (Specification Domain)
- Example: ["spec-uuid-1", "spec-uuid-2"]
- Immutable: No
- Note: 関連付けの管理のみ、実体は Specification Domain が管理

**generatedCodeIds**:
- Type: Array<UUID>
- References: GeneratedCode.id[] (Code Generation Domain)
- Example: ["code-uuid-1", "code-uuid-2"]
- Immutable: No
- Note: 関連付けの管理のみ、実体は Code Generation Domain が管理

---

#### Entity Invariants

**Invariant 1**: Project must have an owner
```
ALWAYS: ownerId != null
```

**Invariant 2**: Name must be valid format
```
ALWAYS: name.matches("^[a-zA-Z0-9 _-]{3,100}$")
```

**Invariant 3**: Status transitions follow rules
```
WHEN status changes TO "Completed"
THEN: specificationIds.length > 0 AND generatedCodeIds.length > 0
```

**Invariant 4**: Soft deleted projects excluded from queries
```
FOR ALL queries (except restore function)
WHERE: deletedAt IS NULL
```

---

### 1.2 ProjectStatus Enum

**Purpose**: プロジェクトのライフサイクルステータスを表現

**Enum Definition**:

```typescript
enum ProjectStatus {
  DRAFT = "Draft",
  ACTIVE = "Active",
  COMPLETED = "Completed"
}
```

**Value Descriptions**:

| Value | Code | Description | Transitions To |
|-------|------|-------------|----------------|
| Draft | "Draft" | 作成直後、準備中 | Active, Completed* |
| Active | "Active" | 作業進行中 | Draft, Completed* |
| Completed | "Completed" | 完了 | Draft, Active |

*Completed への遷移には条件あり（仕様とコード必須）

---

### 1.3 ProjectTemplate Entity

**Purpose**: サンプルプロジェクトのテンプレート管理

**Entity Definition**:

```typescript
interface ProjectTemplate {
  // === Identification ===
  id: string;              // UUID, Primary Key
  
  // === Basic Metadata ===
  name: string;            // テンプレート名
  description: string;     // テンプレート説明
  category: string;        // "Tutorial" | "Sample" | "Starter"
  
  // === Content Templates ===
  specificationTemplate: string;  // JSON string (Specification template)
  sampleCodeTemplate: string;     // JSON string (Code template)
  
  // === Metadata ===
  difficulty: TemplateDifficulty;  // Beginner | Intermediate | Advanced
  estimatedTime: number;   // 想定完了時間（分）
  tags: string[];          // タグ
  
  // === Management ===
  isActive: boolean;       // アクティブなテンプレートか
  createdBy: string;       // Foreign Key to User (作成者)
  
  // === Timestamps ===
  createdAt: Date;
  updatedAt: Date;
}
```

---

#### Template Difficulty Enum

```typescript
enum TemplateDifficulty {
  BEGINNER = "Beginner",
  INTERMEDIATE = "Intermediate",
  ADVANCED = "Advanced"
}
```

---

#### Template Category Values

| Category | Description | Use Case |
|----------|-------------|----------|
| Tutorial | チュートリアル用 | 学習の第一歩 |
| Sample | サンプルプロジェクト | 実例参照 |
| Starter | スターターテンプレート | 新規プロジェクトの雛形 |

---

### 1.4 ProjectSearchQuery Value Object

**Purpose**: プロジェクト検索クエリのパラメータをカプセル化

**Value Object Definition**:

```typescript
interface ProjectSearchQuery {
  // === Search Criteria ===
  nameQuery?: string;       // 部分一致検索（オプション）
  
  // === Filters ===
  tags?: string[];          // AND条件で複数タグ指定
  category?: string;        // カテゴリフィルタ
  status?: ProjectStatus;   // ステータスフィルタ
  
  // === Sorting ===
  sortBy: SortField;        // デフォルト: "updatedAt"
  sortOrder: SortOrder;     // デフォルト: "desc"
  
  // === Pagination ===
  page: number;             // デフォルト: 1（1-indexed）
  pageSize: number;         // デフォルト: 20、最大: 100
}
```

#### SortField Enum

```typescript
enum SortField {
  UPDATED_AT = "updatedAt",
  CREATED_AT = "createdAt",
  NAME = "name",
  STATUS = "status"
}
```

#### SortOrder Enum

```typescript
enum SortOrder {
  ASC = "asc",
  DESC = "desc"
}
```

---

### 1.5 PaginatedResult Value Object

**Purpose**: ページネーション結果をカプセル化

**Value Object Definition**:

```typescript
interface PaginatedResult<T> {
  // === Data ===
  items: T[];              // 現在ページのアイテム
  
  // === Pagination Metadata ===
  totalCount: number;      // 総アイテム数
  page: number;            // 現在のページ番号（1-indexed）
  pageSize: number;        // ページサイズ
  totalPages: number;      // 総ページ数
  
  // === Navigation ===
  hasNext: boolean;        // 次ページがあるか
  hasPrevious: boolean;    // 前ページがあるか
}
```

**Calculation Logic**:
```typescript
totalPages = Math.ceil(totalCount / pageSize)
hasNext = page < totalPages
hasPrevious = page > 1
```

---

## 2. Statistics Entities (Post-MVP)

### 2.1 ProjectStatistics Value Object

**Purpose**: プロジェクト統計情報の集約

**Value Object Definition**:

```typescript
interface ProjectStatistics {
  // === Counts ===
  counts: ProjectCounts;
  
  // === Activity ===
  activity: ProjectActivity;
  
  // === Completion Metrics ===
  completion: CompletionMetrics;
  
  // === Team Member Activity (Post-MVP) ===
  memberActivities: MemberActivity[];
  
  // === Timestamp ===
  calculatedAt: Date;      // 統計計算時刻
}
```

---

### 2.2 ProjectCounts Value Object

```typescript
interface ProjectCounts {
  total: number;           // 総プロジェクト数
  byStatus: {
    draft: number;
    active: number;
    completed: number;
  };
}
```

---

### 2.3 ProjectActivity Value Object

```typescript
interface ProjectActivity {
  recentUpdates: Project[];   // 最近更新されたプロジェクト（上位10件）
  createdToday: number;       // 今日作成数
  createdThisWeek: number;    // 今週作成数
  createdThisMonth: number;   // 今月作成数
}
```

---

### 2.4 CompletionMetrics Value Object

```typescript
interface CompletionMetrics {
  completionRate: number;      // 完了率（%）
  averageCompletionTime: number; // 平均完了時間（日数）
}
```

**Calculation**:
```typescript
completionRate = (completedCount / totalCount) * 100
averageCompletionTime = AVG(completed.map(p => 
  (p.updatedAt - p.createdAt) / (24 * 60 * 60 * 1000)
))
```

---

### 2.5 MemberActivity Value Object

```typescript
interface MemberActivity {
  userId: string;          // Foreign Key to User
  userName: string;        // ユーザー名（表示用）
  projectsCreated: number; // 作成したプロジェクト数
  projectsUpdated: number; // 更新したプロジェクト数
  lastActivityAt: Date;    // 最終活動日時
}
```

---

## 3. Learning Progress Entities (Medium Priority)

### 3.1 LearningMilestone Entity

**Purpose**: 学習進捗のマイルストーン定義

**Entity Definition**:

```typescript
interface LearningMilestone {
  id: string;              // Milestone ID（固定値）
  name: string;            // マイルストーン名
  description: string;     // 説明
  order: number;           // 表示順序
}
```

**Predefined Milestones**:

| ID | Name | Description | Order |
|----|------|-------------|-------|
| tutorial_complete | チュートリアル完了 | 初回チュートリアルを完了 | 1 |
| first_project_created | 初プロジェクト作成 | 最初のプロジェクトを作成 | 2 |
| first_spec_created | 初仕様作成 | 最初の仕様を作成 | 3 |
| first_code_generated | 初コード生成 | 最初のコード生成を実行 | 4 |
| first_project_completed | 初プロジェクト完了 | 最初のプロジェクトを完了 | 5 |
| five_projects_completed | 5プロジェクト完了 | 5つのプロジェクトを完了 | 6 |

---

### 3.2 UserMilestoneAchievement Entity

**Purpose**: ユーザーのマイルストーン達成記録

**Entity Definition**:

```typescript
interface UserMilestoneAchievement {
  id: string;              // UUID, Primary Key
  userId: string;          // Foreign Key to User
  milestoneId: string;     // Foreign Key to LearningMilestone
  achievedAt: Date;        // 達成日時
}
```

**Composite Unique Key**: (userId, milestoneId)

---

### 3.3 LearningProgress Value Object

**Purpose**: ユーザーの学習進捗状況

**Value Object Definition**:

```typescript
interface LearningProgress {
  userId: string;
  achievedMilestones: string[];    // 達成済みマイルストーンID配列
  totalMilestones: number;          // 総マイルストーン数
  progressRate: number;             // 進捗率（0-100%）
  nextMilestone?: LearningMilestone; // 次のマイルストーン
}
```

**Calculation**:
```typescript
progressRate = (achievedMilestones.length / totalMilestones) * 100
nextMilestone = milestones.find(m => !achievedMilestones.includes(m.id))
```

---

## 4. Team Collaboration Entities (Post-MVP)

### 4.1 Team Entity

**Purpose**: チーム管理

**Entity Definition**:

```typescript
interface Team {
  id: string;              // UUID, Primary Key
  name: string;            // チーム名
  description?: string;    // チーム説明
  
  // === Members ===
  managerId: string;       // Foreign Key to User (Manager)
  memberIds: string[];     // Foreign Keys to Users (Members)
  
  // === Timestamps ===
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 5. Entity Relationships

### 5.1 Relationship Diagram

```
User (Authentication Domain)
  │
  ├─ owns ────────> Project (1:N)
  │
  ├─ sharedWith ──> Project (N:M)
  │
  └─ achieves ────> UserMilestoneAchievement (1:N)
                         │
                         └─ references ──> LearningMilestone (N:1)

Project
  │
  ├─ references ──> Specification (N:M) [Specification Domain]
  │
  ├─ references ──> GeneratedCode (N:M) [Code Generation Domain]
  │
  └─ instantiates ─> ProjectTemplate (N:1)

Team (Post-MVP)
  │
  ├─ managedBy ───> User (N:1)
  │
  ├─ hasMember ───> User (N:M)
  │
  └─ owns ────────> Project (1:N)
```

---

### 5.2 Relationship Details

#### Project ↔ User (Owner)

- **Type**: Many-to-One
- **Cardinality**: N:1
- **Foreign Key**: Project.ownerId → User.id
- **Description**: プロジェクトは1人の所有者を持つ
- **Cascade Delete**: User削除時、プロジェクトも削除

---

#### Project ↔ User (Shared)

- **Type**: Many-to-Many
- **Cardinality**: N:M
- **Foreign Key**: Project.sharedWith[] → User.id[]
- **Description**: プロジェクトは複数のユーザーと共有可能
- **Access Level**: 読み取り専用

---

#### Project ↔ Specification

- **Type**: Many-to-Many
- **Cardinality**: N:M
- **Foreign Key**: Project.specificationIds[] → Specification.id[]
- **Description**: プロジェクトは複数の仕様を持つ
- **Ownership**: Specification Domain が実体を管理
- **Cascade Delete**: Project削除時、関連仕様も削除

---

#### Project ↔ GeneratedCode

- **Type**: Many-to-Many
- **Cardinality**: N:M
- **Foreign Key**: Project.generatedCodeIds[] → GeneratedCode.id[]
- **Description**: プロジェクトは複数の生成コードを持つ
- **Ownership**: Code Generation Domain が実体を管理
- **Cascade Delete**: Project削除時、関連コードも削除

---

#### Project ↔ ProjectTemplate

- **Type**: Many-to-One
- **Cardinality**: N:1 (Optional)
- **Foreign Key**: Project.templateId → ProjectTemplate.id
- **Description**: プロジェクトはテンプレートから作成可能
- **Nullability**: サンプルプロジェクトのみ設定

---

#### UserMilestoneAchievement ↔ User

- **Type**: Many-to-One
- **Cardinality**: N:1
- **Foreign Key**: UserMilestoneAchievement.userId → User.id
- **Description**: ユーザーは複数のマイルストーンを達成
- **Cascade Delete**: User削除時、達成記録も削除

---

#### UserMilestoneAchievement ↔ LearningMilestone

- **Type**: Many-to-One
- **Cardinality**: N:1
- **Foreign Key**: UserMilestoneAchievement.milestoneId → LearningMilestone.id
- **Description**: 達成記録は特定のマイルストーンを参照

---

## 6. Domain Events

### 6.1 Project Created Event

```typescript
interface ProjectCreatedEvent {
  eventType: "ProjectCreated";
  projectId: string;
  ownerId: string;
  projectName: string;
  templateId?: string;
  timestamp: Date;
}
```

**Triggered When**: 新規プロジェクト作成時  
**Consumers**:
- Learning Progress Service (first_project_created milestone check)
- Statistics Service (project count update)

---

### 6.2 Project Status Changed Event

```typescript
interface ProjectStatusChangedEvent {
  eventType: "ProjectStatusChanged";
  projectId: string;
  ownerId: string;
  oldStatus: ProjectStatus;
  newStatus: ProjectStatus;
  timestamp: Date;
}
```

**Triggered When**: プロジェクトステータス変更時  
**Consumers**:
- Learning Progress Service (first_project_completed milestone check)
- Notification Service (status change notification)

---

### 6.3 Project Deleted Event

```typescript
interface ProjectDeletedEvent {
  eventType: "ProjectDeleted";
  projectId: string;
  ownerId: string;
  deletionType: "soft" | "hard";
  timestamp: Date;
}
```

**Triggered When**: プロジェクト削除時（論理/物理）  
**Consumers**:
- Specification Domain (cascade delete specifications)
- Code Generation Domain (cascade delete generated codes)
- Statistics Service (project count update)

---

### 6.4 Project Shared Event

```typescript
interface ProjectSharedEvent {
  eventType: "ProjectShared";
  projectId: string;
  ownerId: string;
  sharedWithUserIds: string[];
  timestamp: Date;
}
```

**Triggered When**: プロジェクト共有設定変更時  
**Consumers**:
- Notification Service (shared notification to users)

---

## 7. Data Storage Considerations

### 7.1 Database Schema (DynamoDB)

**Primary Table: Projects**

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| id | String (UUID) | PK | プロジェクトID |
| ownerId | String (UUID) | GSI-PK | 所有者ID |
| name | String | - | プロジェクト名 |
| status | String | GSI-SK | ステータス |
| updatedAt | Number | GSI-SK | 更新日時（timestamp） |
| deletedAt | Number | - | 削除日時（null or timestamp） |
| ... | ... | - | その他フィールド |

**Global Secondary Indexes**:

1. **OwnerIndex**: ownerId (PK), updatedAt (SK)
   - Use Case: ユーザーのプロジェクト一覧取得

2. **StatusIndex**: status (PK), updatedAt (SK)
   - Use Case: ステータス別プロジェクト一覧

---

### 7.2 Data Access Patterns

**Pattern 1: Get Project by ID**
```
Table: Projects
Operation: GetItem
Key: { id: projectId }
```

**Pattern 2: List User's Projects**
```
Table: Projects
Operation: Query
Index: OwnerIndex
KeyCondition: ownerId = userId AND deletedAt IS NULL
SortBy: updatedAt DESC
```

**Pattern 3: Search Projects by Name and Tags**
```
Table: Projects
Operation: Scan (with filters)
Filters: 
  - contains(name, searchQuery)
  - tags contains tagValue
  - deletedAt IS NULL
```

---

## Summary

### Entity Count

| Category | Entity Type | Count |
|----------|-------------|-------|
| Core Entities | Entity | 2 (Project, ProjectTemplate) |
| Enums | Enum | 4 (ProjectStatus, TemplateDifficulty, SortField, SortOrder) |
| Value Objects | Value Object | 7 (SearchQuery, PaginatedResult, etc.) |
| Events | Domain Event | 4 (Created, StatusChanged, Deleted, Shared) |
| **Total** | | **17** |

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Complete