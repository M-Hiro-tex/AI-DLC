# U3: Project Domain - Business Rules

## Overview

本ドキュメントでは、Project Domainのビジネスルールを定義します。

**Focus**: 検証ルール、制約、ビジネスポリシー

---

## 1. Project Creation Rules

### Rule 1.1: Name Uniqueness (同一ユーザー内)

**Rule ID**: PR-CREATE-001  
**Category**: Validation  
**Priority**: High

**Description**:
同じユーザーが所有するプロジェクト間で、プロジェクト名の重複を許可しない。

**Conditions**:
- 作成しようとするプロジェクトの名前
- 同じユーザー（ownerId）が所有する既存プロジェクトの名前リスト

**Validation Logic**:
```
IF exists(project WHERE project.ownerId == currentUserId AND project.name == newProjectName AND project.deletedAt IS NULL)
THEN reject with error "プロジェクト名が既に存在します"
```

**Error Message**:
- Japanese: "このプロジェクト名は既に使用されています。別の名前を選択してください。"
- English: "A project with this name already exists. Please choose a different name."

---

### Rule 1.2: Name Format Validation

**Rule ID**: PR-CREATE-002  
**Category**: Validation  
**Priority**: High

**Description**:
プロジェクト名は3-100文字の範囲で、英数字、スペース、ハイフン、アンダースコアのみ使用可能。

**Validation Rules**:
- 最小長: 3文字
- 最大長: 100文字
- 許可文字: a-z, A-Z, 0-9, スペース, ハイフン(-), アンダースコア(_)
- 正規表現: `^[a-zA-Z0-9 _-]{3,100}$`

**Validation Logic**:
```
IF newProjectName.length < 3 OR newProjectName.length > 100
THEN reject with error "プロジェクト名は3-100文字である必要があります"

IF NOT newProjectName.matches("^[a-zA-Z0-9 _-]{3,100}$")
THEN reject with error "プロジェクト名に使用できない文字が含まれています"
```

**Error Messages**:
- Too short: "プロジェクト名は3文字以上である必要があります"
- Too long: "プロジェクト名は100文字以下である必要があります"
- Invalid characters: "プロジェクト名には英数字、スペース、ハイフン、アンダースコアのみ使用できます"

---

### Rule 1.3: Description Length Validation

**Rule ID**: PR-CREATE-003  
**Category**: Validation  
**Priority**: Medium

**Description**:
プロジェクト説明は最大1000文字まで。

**Validation Rules**:
- 最大長: 1000文字
- オプションフィールド（nullまたは空文字列可）

**Validation Logic**:
```
IF description IS NOT NULL AND description.length > 1000
THEN reject with error "説明は1000文字以下である必要があります"
```

---

### Rule 1.4: Tags Validation

**Rule ID**: PR-CREATE-004  
**Category**: Validation  
**Priority**: Medium

**Description**:
プロジェクトに設定できるタグは最大10個まで。各タグは20文字以内。

**Validation Rules**:
- 最大タグ数: 10個
- 各タグの最大長: 20文字
- タグは空文字列不可

**Validation Logic**:
```
IF tags.length > 10
THEN reject with error "タグは最大10個までです"

FOR EACH tag IN tags
  IF tag.length == 0 OR tag.length > 20
  THEN reject with error "各タグは1-20文字である必要があります"
END FOR
```

---

### Rule 1.5: Default Values Assignment

**Rule ID**: PR-CREATE-005  
**Category**: Business Logic  
**Priority**: High

**Description**:
プロジェクト作成時に自動的に設定されるデフォルト値。

**Default Values**:
```typescript
{
  status: "Draft",
  progressRate: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  specificationChangeCount: 0,
  codeGenerationCount: 0,
  tags: [],
  sharedWith: [],
  deletedAt: null
}
```

**Template Project Special Handling**:
```
IF templateId IS PROVIDED
THEN
  - Load ProjectTemplate(templateId)
  - Create Specification from template.specificationTemplate
  - Create GeneratedCode from template.sampleCodeTemplate
  - Set specificationIds = [newSpecId]
  - Set generatedCodeIds = [newCodeId]
END IF
```

---

## 2. Project Update Rules

### Rule 2.1: Name Update Validation

**Rule ID**: PR-UPDATE-001  
**Category**: Validation  
**Priority**: High

**Description**:
プロジェクト名を更新する際の検証ルール（作成時と同じ）。

**Applies**:
- Rule 1.1: Name Uniqueness（更新対象プロジェクト自身は除外）
- Rule 1.2: Name Format Validation

**Modified Logic for Update**:
```
IF exists(project WHERE project.ownerId == currentUserId 
                   AND project.name == newProjectName 
                   AND project.id != updatingProjectId
                   AND project.deletedAt IS NULL)
THEN reject with error "プロジェクト名が既に存在します"
```

---

### Rule 2.2: Status Transition Validation

**Rule ID**: PR-UPDATE-002  
**Category**: Business Logic  
**Priority**: High

**Description**:
プロジェクトステータスの遷移時の検証ルール。

**Transition Rules**:

**Draft → Active**:
```
// 条件なし、常に許可
ALLOW transition
```

**Active → Completed**:
```
IF project.specificationIds.length == 0
THEN reject with error "完了するには仕様が必要です"

IF project.generatedCodeIds.length == 0
THEN reject with error "完了するにはコード生成が必要です"

ALLOW transition
```

**Draft → Completed**:
```
// Active → Completed と同じ条件
IF project.specificationIds.length == 0 OR project.generatedCodeIds.length == 0
THEN reject with error "完了するには仕様とコード生成が必要です"

ALLOW transition
```

**Completed → Draft/Active**:
```
// 条件なし、常に許可（再開）
ALLOW transition
```

**Error Messages**:
- No Specification: "プロジェクトを完了するには、少なくとも1つの仕様が必要です"
- No Generated Code: "プロジェクトを完了するには、少なくとも1つのコード生成が必要です"

---

### Rule 2.3: UpdatedAt Auto-Update

**Rule ID**: PR-UPDATE-003  
**Category**: Business Logic  
**Priority**: High

**Description**:
プロジェクトの任意のフィールドが更新された際、updatedAtを自動的に現在時刻に更新。

**Logic**:
```
ON UPDATE project
SET project.updatedAt = new Date()
```

---

### Rule 2.4: Owner Modification Restriction

**Rule ID**: PR-UPDATE-004  
**Category**: Authorization  
**Priority**: High

**Description**:
MVPでは、プロジェクトの所有者（ownerId）は変更できない。

**Validation**:
```
IF updateInput.ownerId IS PROVIDED AND updateInput.ownerId != project.ownerId
THEN reject with error "プロジェクトの所有者は変更できません"
```

**Note**: 所有者譲渡機能はPost-MVPで実装予定。

---

### Rule 2.5: Shared Users Update Authorization

**Rule ID**: PR-UPDATE-005  
**Category**: Authorization  
**Priority**: High

**Description**:
プロジェクトを共有されているユーザーは、プロジェクトを更新できない（読み取り専用）。

**Authorization Check**:
```
IF currentUserId != project.ownerId
THEN reject with error "このプロジェクトを編集する権限がありません"
```

---

## 3. Project Deletion Rules

### Rule 3.1: Owner-Only Deletion

**Rule ID**: PR-DELETE-001  
**Category**: Authorization  
**Priority**: High

**Description**:
プロジェクトの削除は所有者のみが実行可能。

**Authorization Check**:
```
IF currentUserId != project.ownerId
THEN reject with error "このプロジェクトを削除する権限がありません"
```

---

### Rule 3.2: Soft Delete Execution

**Rule ID**: PR-DELETE-002  
**Category**: Business Logic  
**Priority**: High

**Description**:
削除操作は論理削除（Soft Delete）として実行される。

**Logic**:
```
ON DELETE request
SET project.deletedAt = new Date()
DO NOT physically delete from database
```

**Implications**:
- プロジェクトは一覧クエリには表示されない（WHERE deletedAt IS NULL）
- 30日間は復元可能
- 関連リソース（仕様、コード）はまだ削除されない

---

### Rule 3.3: Hard Delete Scheduling

**Rule ID**: PR-DELETE-003  
**Category**: Business Logic  
**Priority**: Medium

**Description**:
論理削除から30日後、自動的に物理削除を実行。

**Scheduled Job Logic**:
```
SCHEDULE daily job:
  SELECT projects WHERE deletedAt <= (NOW() - 30 days)
  FOR EACH project IN results
    - Delete related Specifications (call Specification Domain)
    - Delete related GeneratedCodes (call Code Generation Domain)
    - Physically delete project record
  END FOR
```

---

### Rule 3.4: Cascade Deletion

**Rule ID**: PR-DELETE-004  
**Category**: Business Logic  
**Priority**: High

**Description**:
プロジェクトの物理削除時、関連リソースもカスケード削除。

**Cascade Logic**:
```
ON HARD DELETE project
FOR EACH specId IN project.specificationIds
  CALL SpecificationDomain.deleteSpecification(specId)
END FOR

FOR EACH codeId IN project.generatedCodeIds
  CALL CodeGenerationDomain.deleteGeneratedCode(codeId)
END FOR

DELETE project
```

---

## 4. Project Query Rules

### Rule 4.1: Soft-Deleted Projects Exclusion

**Rule ID**: PR-QUERY-001  
**Category**: Business Logic  
**Priority**: High

**Description**:
通常のクエリでは、論理削除されたプロジェクトを除外。

**Query Filter**:
```
ALL project queries MUST include:
WHERE project.deletedAt IS NULL
```

**Exception**:
- 復元機能用の「削除済みプロジェクト一覧」クエリのみ、deletedAt IS NOT NULL を使用

---

### Rule 4.2: Owner-Based Filtering

**Rule ID**: PR-QUERY-002  
**Category**: Authorization  
**Priority**: High

**Description**:
ユーザーは自分が所有するプロジェクト、または共有されているプロジェクトのみ閲覧可能。

**Query Filter**:
```
WHERE (project.ownerId == currentUserId 
       OR currentUserId IN project.sharedWith)
  AND project.deletedAt IS NULL
```

---

### Rule 4.3: Search Query Sanitization

**Rule ID**: PR-QUERY-003  
**Category**: Security  
**Priority**: High

**Description**:
検索クエリ文字列のサニタイゼーション（SQLインジェクション対策）。

**Sanitization**:
- 入力文字列のエスケープ処理
- 特殊文字の無害化
- プリペアドステートメントの使用

---

### Rule 4.4: Pagination Limits

**Rule ID**: PR-QUERY-004  
**Category**: Performance  
**Priority**: Medium

**Description**:
ページネーションのサイズ制限。

**Limits**:
- デフォルトページサイズ: 20件
- 最小ページサイズ: 1件
- 最大ページサイズ: 100件

**Validation**:
```
IF pageSize < 1
THEN pageSize = 1

IF pageSize > 100
THEN pageSize = 100
```

---

## 5. Project Sharing Rules (MVP)

### Rule 5.1: Owner-Only Sharing Management

**Rule ID**: PR-SHARE-001  
**Category**: Authorization  
**Priority**: High

**Description**:
プロジェクトの共有設定は所有者のみが管理可能。

**Authorization Check**:
```
IF currentUserId != project.ownerId
THEN reject with error "このプロジェクトの共有設定を変更する権限がありません"
```

---

### Rule 5.2: User Existence Validation

**Rule ID**: PR-SHARE-002  
**Category**: Validation  
**Priority**: High

**Description**:
共有先ユーザーが実在することを確認。

**Validation**:
```
FOR EACH userId IN shareWithUserIds
  IF NOT exists(User WHERE User.id == userId)
  THEN reject with error "ユーザーが存在しません: {userId}"
END FOR
```

---

### Rule 5.3: Self-Sharing Prevention

**Rule ID**: PR-SHARE-003  
**Category**: Validation  
**Priority**: Medium

**Description**:
自分自身とプロジェクトを共有することを防止。

**Validation**:
```
IF project.ownerId IN shareWithUserIds
THEN remove project.ownerId from shareWithUserIds
// Error は発生させず、silently 除外
```

---

### Rule 5.4: Read-Only Access Enforcement

**Rule ID**: PR-SHARE-004  
**Category**: Authorization  
**Priority**: High

**Description**:
共有されたユーザーは読み取り専用アクセスのみ。

**Permission Check**:
```
FOR ANY modification operation (update, delete, share)
IF currentUserId IN project.sharedWith AND currentUserId != project.ownerId
THEN reject with error "このプロジェクトを編集する権限がありません（読み取り専用）"
```

---

## 6. Template Project Rules

### Rule 6.1: Template Instantiation

**Rule ID**: PR-TEMPLATE-001  
**Category**: Business Logic  
**Priority**: High

**Description**:
テンプレートからプロジェクトを作成する際のルール。

**Logic**:
```
IF templateId IS PROVIDED
THEN
  1. Validate: ProjectTemplate(templateId) exists and isActive == true
  2. Create new Project with metadata from template
  3. Call SpecificationDomain.createFromTemplate(template.specificationTemplate)
  4. Call CodeGenerationDomain.createFromTemplate(template.sampleCodeTemplate)
  5. Link created resources to project
END IF
```

**Validation**:
```
IF NOT exists(ProjectTemplate WHERE id == templateId AND isActive == true)
THEN reject with error "テンプレートが存在しないか、利用できません"
```

---

### Rule 6.2: Template Content Copying

**Rule ID**: PR-TEMPLATE-002  
**Category**: Business Logic  
**Priority**: High

**Description**:
テンプレートコンテンツは新しいエンティティとしてコピーされる（参照ではない）。

**Logic**:
```
// テンプレート自体は変更されず、新しいインスタンスを作成
newSpecification = COPY(template.specificationTemplate)
newGeneratedCode = COPY(template.sampleCodeTemplate)

// 元テンプレートへの参照は保持
project.templateId = template.id
```

---

## 7. Statistics and Progress Rules (Post-MVP)

### Rule 7.1: Statistics Calculation

**Rule ID**: PR-STATS-001  
**Category**: Business Logic  
**Priority**: Medium

**Description**:
プロジェクト統計情報の計算ルール。

**Metrics**:
```typescript
// プロジェクト数（ステータス別）
totalProjects = COUNT(projects WHERE deletedAt IS NULL)
draftProjects = COUNT(projects WHERE status == 'Draft' AND deletedAt IS NULL)
activeProjects = COUNT(projects WHERE status == 'Active' AND deletedAt IS NULL)
completedProjects = COUNT(projects WHERE status == 'Completed' AND deletedAt IS NULL)

// 完了率
completionRate = (completedProjects / totalProjects) * 100

// 平均完了時間（日数）
averageCompletionTime = AVG(completedProjects.map(p => p.updatedAt - p.createdAt)) / (24 * 60 * 60 * 1000)
```

---

### Rule 7.2: Learning Progress Calculation

**Rule ID**: PR-PROGRESS-001  
**Category**: Business Logic  
**Priority**: Medium

**Description**:
学習進捗の計算ルール（マイルストーンベース）。

**Milestones**:
```typescript
const milestones = [
  "tutorial_complete",
  "first_project_created",
  "first_spec_created",
  "first_code_generated",
  "first_project_completed",
  "five_projects_completed"
];
```

**Calculation**:
```typescript
achievedMilestones = getUserAchievedMilestones(userId)
progressRate = (achievedMilestones.length / milestones.length) * 100
```

**Milestone Trigger Rules**:
```
ON project.created
  IF userProjectCount(userId) == 1
  THEN achieve("first_project_created")

ON specification.created
  IF userSpecificationCount(userId) == 1
  THEN achieve("first_spec_created")

ON generatedCode.created
  IF userGeneratedCodeCount(userId) == 1
  THEN achieve("first_code_generated")

ON project.statusChanged TO 'Completed'
  IF userCompletedProjectCount(userId) == 1
  THEN achieve("first_project_completed")
  
  IF userCompletedProjectCount(userId) == 5
  THEN achieve("five_projects_completed")
```

---

## 8. Team Collaboration Rules (Post-MVP)

### Rule 8.1: Team Project Creation

**Rule ID**: PR-TEAM-001  
**Category**: Business Logic  
**Priority**: Low (Post-MVP)

**Description**:
チームプロジェクト作成時のルール。

**Logic**:
```
IF teamId IS PROVIDED
THEN
  - Validate: Team(teamId) exists
  - Validate: currentUser is member of Team(teamId)
  - Set project.teamId = teamId
  - Set project.ownerId = currentUserId (作成者は個人として記録)
  - All team members have edit access
END IF
```

---

### Rule 8.2: Team Member Access

**Rule ID**: PR-TEAM-002  
**Category**: Authorization  
**Priority**: Low (Post-MVP)

**Description**:
チームメンバーのアクセス権限ルール。

**Permission Matrix**:
```
FOR team projects:
IF currentUser IS member of project.teamId
THEN
  - Allow read access
  - Allow edit access
  - Allow delete access (team manager only)
END IF
```

---

## Summary

### Rule Categories

| Category | Count | Priority Distribution |
|----------|-------|----------------------|
| Validation | 10 | High: 7, Medium: 3 |
| Business Logic | 11 | High: 7, Medium: 4 |
| Authorization | 7 | High: 7 |
| Performance | 1 | Medium: 1 |
| Security | 1 | High: 1 |

### Total Rules: 30

**MVP Rules**: 24  
**Post-MVP Rules**: 6

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Complete