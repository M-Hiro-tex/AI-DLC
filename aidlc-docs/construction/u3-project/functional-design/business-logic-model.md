# U3: Project Domain - Business Logic Model

## Overview

本ドキュメントでは、Project Domainのビジネスロジックモデルを定義します。

**Focus**: プロジェクトライフサイクル、所有権管理、CRUD操作のビジネスロジック

---

## 1. Project Lifecycle Model

### 1.1 Project Status Definition

プロジェクトは以下の3つのステータスを持ちます（シンプルな3段階モデル）:

```
Draft ─────> Active ─────> Completed
  │                           │
  │                           │
  └───────────────────────────┘
         (任意のステータスに遷移可能、条件付き)
```

#### Status Descriptions

**Draft (下書き)**
- **説明**: プロジェクト作成直後の初期状態
- **意味**: まだ作業を開始していない、または準備中
- **可能な操作**: 編集、削除、Active/Completedへの遷移

**Active (進行中)**
- **説明**: 実際に作業が進行している状態
- **意味**: 仕様作成中、コード生成中など、アクティブな作業フェーズ
- **可能な操作**: 編集、削除、Draft/Completedへの遷移

**Completed (完了)**
- **説明**: プロジェクトが完了した状態
- **意味**: 仕様とコード生成が完了し、プロジェクトの目標を達成
- **可能な操作**: 参照、削除（条件付き）、Draft/Activeへの遷移（再開）

---

### 1.2 Status Transition Rules

#### 遷移条件

**Draft → Active**
- 条件: なし（いつでも遷移可能）
- ビジネスルール: ステータス変更のみ

**Active → Completed**
- 条件: **仕様とコードが存在すること（必須）**
- ビジネスルール: 
  - プロジェクトに紐づく仕様（Specification）が存在すること
  - プロジェクトに紐づく生成コード（GeneratedCode）が存在すること
  - 両方が存在しない場合、Completedへの遷移を拒否

**Completed → Active/Draft**
- 条件: なし（再開可能）
- ビジネスルール: プロジェクトを再開する場合に使用

**Draft → Completed**
- 条件: **仕様とコードが存在すること（必須）**
- ビジネスルール: Activeを経由せずに直接完了も可能だが、同じ条件を満たす必要がある

#### 遷移フロー図

```
         任意の遷移可能（条件なし）
Draft ←──────────────────────────→ Active
  │                                  │
  │ 条件: 仕様+コード必須             │ 条件: 仕様+コード必須
  └──────────────────────────────────┘
                    ↓
                Completed
                    ↓
          再開可能（条件なし）
```

---

### 1.3 Project Deletion Model

#### 段階的削除戦略

プロジェクト削除は2段階で実行されます:

**Phase 1: 論理削除（Soft Delete）**
- **期間**: 削除から30日間
- **動作**: 
  - `deleted_at`フィールドに削除日時を記録
  - プロジェクト一覧には表示されない
  - データベースには保持される
  - 復元可能（Restore機能）
- **目的**: 誤削除からの保護

**Phase 2: 物理削除（Hard Delete）**
- **タイミング**: 論理削除から30日後（自動実行）
- **動作**:
  - データベースからプロジェクトレコードを完全削除
  - 関連する仕様とコードもカスケード削除
  - 復元不可能
- **目的**: ストレージコスト削減

#### 削除制約

**所有者チェック**:
- 共有プロジェクトの場合、所有者のみが削除可能
- 共有されているメンバーは削除できない

**削除確認**:
- UI層で削除確認ダイアログを表示（ビジネスロジック層の責務ではない）

---

## 2. Project Ownership and Permissions Model

### 2.1 Ownership Model (MVP)

#### Single Owner + Sharing

**所有権**:
- プロジェクトには必ず1人の所有者（Owner）が存在
- 所有者 = プロジェクトを作成したユーザー
- 所有者は変更不可（譲渡機能はPost-MVP）

**共有機能**:
- 所有者は他のユーザーとプロジェクトを共有可能
- 共有されたユーザーは**読み取り専用**アクセス
- 共有ユーザーはプロジェクトを閲覧可能だが、編集・削除は不可

#### Permission Matrix (MVP)

| 操作 | 所有者 | 共有ユーザー |
|------|--------|------------|
| 閲覧 | ✅ | ✅ |
| 編集（名前、説明、ステータス等） | ✅ | ❌ |
| 削除 | ✅ | ❌ |
| 共有管理（他ユーザーと共有） | ✅ | ❌ |
| 仕様編集 | ✅ | ❌ |
| コード生成 | ✅ | ❌ |

---

### 2.2 Team Functionality (Post-MVP)

#### Basic Team Model

**Team Entity**:
- チーム名、説明、作成者（Manager）
- チームメンバーリスト
- チームが所有するプロジェクトリスト

**Team Ownership**:
- チームに所属するプロジェクトは、チーム全メンバーがアクセス可能
- チーム内では編集権限も共有可能（ロールベースアクセスはPost-MVP Phase 2）

**Manager Role**:
- チームの作成・管理
- メンバーの招待・削除
- プロジェクトのチーム共有

**Member Role**:
- チーム内プロジェクトへのアクセス
- プロジェクトの作成・編集（チーム所有として）

---

## 3. Project Metadata Model

### 3.1 Core Metadata

すべてのプロジェクトが持つ基本情報:

```typescript
interface ProjectMetadata {
  // 識別情報
  id: string;              // UUID
  name: string;            // プロジェクト名（3-100文字、英数字と一部記号）
  description?: string;    // プロジェクト説明（オプション）
  
  // 所有権
  ownerId: string;         // 所有者のユーザーID
  sharedWith: string[];    // 共有ユーザーIDリスト（読み取り専用）
  
  // ステータス情報
  status: ProjectStatus;   // Draft | Active | Completed
  progressRate: number;    // 進捗率（0-100%）
  
  // カテゴリ/タグ
  tags: string[];          // タグリスト（検索・フィルタリング用）
  category?: string;       // カテゴリ（オプション）
  
  // テンプレート情報
  templateId?: string;     // 元になったテンプレートID（サンプルプロジェクトの場合）
  
  // 統計情報
  specificationChangeCount: number;  // 仕様変更回数
  codeGenerationCount: number;       // コード生成回数
  
  // タイムスタンプ
  createdAt: Date;         // 作成日時
  updatedAt: Date;         // 更新日時
  deletedAt?: Date;        // 削除日時（論理削除用）
}
```

---

### 3.2 Related Resource References

プロジェクトが参照する関連リソース:

```typescript
interface ProjectResourceReferences {
  projectId: string;
  
  // 関連リソース
  specificationIds: string[];      // 仕様IDリスト
  generatedCodeIds: string[];      // 生成コードIDリスト
}
```

**注意**: これらのリソースIDは実際のエンティティではなく、参照のみ。
実体は Specification Domain と Code Generation Domain が管理。

---

## 4. Project Query and Search Model

### 4.1 Search Capabilities

#### Implemented Search Features (MVP)

**Name Search (部分一致)**:
- プロジェクト名での部分一致検索
- 大文字小文字を区別しない
- 例: "My" で検索 → "My Project", "Another My App" がヒット

**Tag/Category Filtering**:
- タグによる完全一致フィルタリング
- カテゴリによる完全一致フィルタリング
- 複数タグ指定時は AND 条件

#### Search Query Model

```typescript
interface ProjectSearchQuery {
  // 名前検索
  nameQuery?: string;       // 部分一致検索
  
  // タグ/カテゴリフィルタ
  tags?: string[];          // AND条件で複数タグ指定可能
  category?: string;        // カテゴリ指定
  
  // ソート
  sortBy: SortField;        // デフォルト: updatedAt
  sortOrder: 'asc' | 'desc'; // デフォルト: desc
  
  // ページネーション
  page: number;             // デフォルト: 1
  pageSize: number;         // デフォルト: 20
}
```

---

### 4.2 Sorting Logic

#### Default Sort Order

**更新日時の新しい順（updatedAt DESC）**

理由:
- ユーザーが最近触ったプロジェクトを最初に表示
- 作業の継続性が高い
- 一般的なプロジェクト管理ツールの標準動作

#### Supported Sort Fields

| Sort Field | 説明 | Order |
|------------|------|-------|
| updatedAt | 更新日時 | DESC（デフォルト） |
| createdAt | 作成日時 | DESC/ASC |
| name | プロジェクト名 | ASC/DESC |
| status | ステータス | Custom Order* |

*Status Custom Order: Active → Draft → Completed

---

### 4.3 Pagination Strategy

**Offset-based Pagination**:
- 実装が簡単
- DynamoDB での実装に適している
- ページサイズ: デフォルト20件、最大100件

```typescript
interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
```

---

## 5. Sample Project Management Model

### 5.1 ProjectTemplate Entity

サンプルプロジェクトは通常のProjectとは別の**ProjectTemplate**エンティティで管理:

```typescript
interface ProjectTemplate {
  id: string;              // テンプレートID
  name: string;            // テンプレート名
  description: string;     // テンプレート説明
  category: string;        // カテゴリ（例: "Tutorial", "Sample", "Starter"）
  
  // プリロードコンテンツ
  specificationTemplate: string;  // 仕様テンプレートJSON
  sampleCodeTemplate: string;     // サンプルコードテンプレートJSON
  
  // メタデータ
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: number;   // 想定完了時間（分）
  tags: string[];
  
  // 管理情報
  isActive: boolean;       // アクティブなテンプレートか
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 5.2 Template Instantiation Logic

ユーザーがサンプルプロジェクトを選択して新規プロジェクトを作成する場合:

**Step 1**: ProjectTemplateから新規Projectを作成
```typescript
{
  name: "ユーザー指定の名前",
  description: template.description,
  templateId: template.id,  // 元テンプレートを記録
  status: "Draft",
  progressRate: 0
}
```

**Step 2**: テンプレートコンテンツをコピー
- `specificationTemplate` → Specification Domain に新規仕様を作成
- `sampleCodeTemplate` → Code Generation Domain に初期コードを作成

**Step 3**: プロジェクトに関連リソースIDを記録
```typescript
{
  specificationIds: [newSpecId],
  generatedCodeIds: [newCodeId]
}
```

---

## 6. Project Creation Logic

### 6.1 Creation Flow

```
User Input → Validation → Default Values → Create Project → Initialize Resources → Return Project
```

#### Validation Rules

**名前の重複チェック**:
- 同じユーザー内で同じ名前のプロジェクトは作成不可
- 他のユーザーとの重複は許容

**名前の形式チェック**:
- 長さ: 3-100文字
- 文字種: 英数字と一部記号（スペース、ハイフン、アンダースコア）
- 正規表現: `^[a-zA-Z0-9 _-]{3,100}$`

**その他の検証**:
- descriptionの長さチェック（最大1000文字）
- tagsの数制限（最大10個）
- tagの長さ制限（各20文字以内）

---

### 6.2 Default Values

#### 通常プロジェクト作成時

```typescript
{
  status: "Draft",
  progressRate: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  specificationChangeCount: 0,
  codeGenerationCount: 0,
  tags: [],
  sharedWith: []
}
```

#### サンプルプロジェクト作成時

上記 + テンプレートコンテンツの自動追加（Section 5.2参照）

---

## 7. Project Update Logic

### 7.1 Updatable Fields

ユーザーが更新可能なフィールド（作成日時以外のすべてのメタデータ）:

```typescript
interface ProjectUpdateInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  progressRate?: number;
  tags?: string[];
  category?: string;
  // createdAt は更新不可
  // updatedAt は自動更新
}
```

---

### 7.2 Update Validation

**名前の重複チェック**:
- 新しい名前が既存の他プロジェクトと重複していないか

**名前の形式チェック**:
- 作成時と同じ検証ルール

**ステータス遷移チェック**:
- Section 1.2 で定義したステータス遷移ルールに従う
- Completedへの遷移時は、仕様とコードの存在を確認

---

### 7.3 Auto-update Fields

**updatedAt**:
- 任意のフィールド更新時に自動的に現在時刻を設定

**progressRate（自動計算）**:
- オプション: 仕様の完成度とコード生成状況から自動計算
- 簡易実装: ユーザーが手動更新

---

## 8. Project Deletion Logic

### 8.1 Deletion Flow

```
Delete Request → Permission Check → Soft Delete → Schedule Hard Delete (30 days)
```

#### Permission Check

**所有者チェック**:
- 削除をリクエストしたユーザーがプロジェクトの所有者か確認
- 共有ユーザーによる削除は拒否

---

### 8.2 Cascade Deletion

プロジェクトを削除したとき、関連リソースも自動削除:

**Phase 1: Soft Delete**
- プロジェクト: `deleted_at` を設定
- 関連リソース: まだ削除しない（復元可能性のため）

**Phase 2: Hard Delete（30日後）**
- プロジェクト: データベースから物理削除
- 関連リソース: カスケード削除
  - Specification Domain: プロジェクトに紐づく仕様を削除
  - Code Generation Domain: プロジェクトに紐づく生成コードを削除

---

## 9. Project Statistics Model (Post-MVP)

### 9.1 Dashboard Statistics

Manager向けダッシュボード（M1.1）で表示する統計情報:

#### Project Counts

```typescript
interface ProjectCounts {
  total: number;              // 総プロジェクト数
  byStatus: {
    draft: number;
    active: number;
    completed: number;
  };
}
```

#### Activity Metrics

```typescript
interface ProjectActivity {
  recentUpdates: Project[];   // 最近更新されたプロジェクト（上位10件）
  createdToday: number;       // 今日作成されたプロジェクト数
  createdThisWeek: number;    // 今週作成されたプロジェクト数
  createdThisMonth: number;   // 今月作成されたプロジェクト数
}
```

#### Completion Metrics

```typescript
interface CompletionMetrics {
  completionRate: number;      // 完了率（completed / total）
  averageCompletionTime: number; // 平均完了時間（日数）
}
```

#### Team Member Activity

```typescript
interface MemberActivity {
  userId: string;
  userName: string;
  projectsCreated: number;
  projectsUpdated: number;
  lastActivityAt: Date;
}
```

---

## 10. Learning Progress Tracking Model (Medium Priority)

### 10.1 Progress Calculation

**マイルストーンベースアプローチ**（S4.1）:

```typescript
interface LearningMilestone {
  id: string;
  name: string;
  description: string;
  achievedAt?: Date;
}

// 定義済みマイルストーン
const milestones = [
  { id: "tutorial_complete", name: "チュートリアル完了" },
  { id: "first_project_created", name: "初プロジェクト作成" },
  { id: "first_spec_created", name: "初仕様作成" },
  { id: "first_code_generated", name: "初コード生成" },
  { id: "first_project_completed", name: "初プロジェクト完了" },
  { id: "five_projects_completed", name: "5プロジェクト完了" },
];
```

#### Progress Calculation Logic

```typescript
interface LearningProgress {
  userId: string;
  achievedMilestones: string[];  // 達成済みマイルストーンIDリスト
  totalMilestones: number;        // 総マイルストーン数
  progressRate: number;           // 達成率（0-100%）
  nextMilestone?: LearningMilestone;
}

// 計算式
progressRate = (achievedMilestones.length / totalMilestones) * 100;
```

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Complete