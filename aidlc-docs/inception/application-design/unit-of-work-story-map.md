# Unit of Work Story Mapping

## Overview

本ドキュメントでは、31のユーザーストーリーを7つのユニットにマッピングします。

**Total Stories**: 31 (MVP: 19, Post-MVP: 12)  
**Total Units**: 7 (Frontend: 1, Backend: 6)  
**Mapping Strategy**: 機能ドメインベース

---

## Story-to-Unit Mapping Matrix

| Story ID | Story Title | Persona | Priority | Units |
|----------|-------------|---------|----------|-------|
| D1.1 | ソーシャルログイン（Google） | Developer | MVP | U1, U2 |
| D1.2 | 初回ログイン時のウェルカムツアー | Developer | MVP | U1 |
| D2.1 | 新しいプロジェクトの作成 | Developer | MVP | U1, U3 |
| D2.2 | インタラクティブな仕様エディタ | Developer | MVP | U1, U4 |
| D2.3 | リアルタイム検証 | Developer | MVP | U1, U6 |
| D2.4 | 保存と読み込み | Developer | MVP | U1, U4 |
| D3.1 | 仕様からコード生成 | Developer | MVP | U1, U5 |
| D3.2 | 生成コードのプレビュー | Developer | MVP | U1, U5 |
| D3.3 | コードのダウンロード | Developer | MVP | U1, U5 |
| D4.1 | 整合性チェック | Developer | MVP | U1, U6 |
| D4.2 | 差分の可視化 | Developer | Post-MVP | U1, U6 |
| D5.1 | プロジェクト一覧表示 | Developer | MVP | U1, U3 |
| D5.2 | プロジェクト削除 | Developer | MVP | U1, U3 |
| D6.1 | AIによるコード生成支援 | Developer | MVP | U1, U5, U7 |
| S1.1 | ステップバイステップチュートリアル | Student | MVP | U1 |
| S1.2 | サンプルプロジェクト | Student | MVP | U1, U3, U4 |
| S2.1 | ガイダンス付き仕様作成 | Student | MVP | U1, U4 |
| S2.2 | コード生成体験 | Student | MVP | U1, U5 |
| S3.1 | 分かりやすいエラーメッセージ | Student | MVP | U1, U6 |
| S3.2 | ヘルプとドキュメント | Student | Medium | U1 |
| S4.1 | 学習進捗確認（基本） | Student | Medium | U1, U3 |
| S4.2 | 小規模プロジェクト完成 | Student | MVP | U1, U3, U4, U5 |
| M1.1 | プロジェクトダッシュボード | Manager | Post-MVP | U1, U3 |
| M1.2 | チームメンバー活動状況 | Manager | Post-MVP | U1, U2, U3 |
| M2.1 | チームメンバー招待 | Manager | Post-MVP | U1, U2 |
| M2.2 | 学習プログラム管理 | Manager | Post-MVP | U1, U3 |
| M3.1 | 仕様品質レビュー | Manager | Post-MVP | U1, U4, U6 |
| M3.2 | プロジェクトレポート生成 | Manager | Post-MVP | U1, U3 |
| M4.1 | ベストプラクティス共有 | Manager | Post-MVP | U1, U3, U4 |
| M4.2 | テンプレート管理 | Manager | Post-MVP | U1, U4 |
| M5.1 | 基本的な使用（Developer機能共有） | Manager | MVP | U1, U2, U3, U4, U5, U6 |

---

## Unit-Centric View

### Unit 1: Frontend Unit (31 stories)
**All stories involve frontend UI**

#### MVP Stories (19)
- D1.1, D1.2, D2.1, D2.2, D2.3, D2.4, D3.1, D3.2, D3.3, D4.1, D5.1, D5.2, D6.1
- S1.1, S1.2, S2.1, S2.2, S3.1, S4.2

#### Post-MVP Stories (12)
- D4.2, M1.1, M1.2, M2.1, M2.2, M3.1, M3.2, M4.1, M4.2

#### Medium Priority (2)
- S3.2, S4.1

**Features**:
- Auth UI, Project UI, Editor UI, Code Preview UI, Validation UI, Tutorial UI

---

### Unit 2: Authentication Domain (4 stories)

#### MVP Stories (2)
- **D1.1**: ソーシャルログイン（Google）
  - Backend OAuth integration
  - Session token management
  
- **M5.1**: 基本的な使用（認証部分）
  - Shared authentication for all personas

#### Post-MVP Stories (2)
- **M1.2**: チームメンバー活動状況
  - User activity tracking
  
- **M2.1**: チームメンバー招待
  - User invitation system

**Primary Responsibilities**:
- OAuth integration (Google, GitHub)
- Session management
- User profile management

---

### Unit 3: Project Domain (10 stories)

#### MVP Stories (6)
- **D2.1**: 新しいプロジェクトの作成
- **D5.1**: プロジェクト一覧表示
- **D5.2**: プロジェクト削除
- **S1.2**: サンプルプロジェクト
- **S4.2**: 小規模プロジェクト完成
- **M5.1**: 基本的な使用（プロジェクト管理部分）

#### Medium Priority (1)
- **S4.1**: 学習進捗確認（基本）

#### Post-MVP Stories (3)
- **M1.1**: プロジェクトダッシュボード
- **M1.2**: チームメンバー活動状況
- **M2.2**: 学習プログラム管理
- **M3.2**: プロジェクトレポート生成
- **M4.1**: ベストプラクティス共有

**Primary Responsibilities**:
- Project CRUD operations
- Project statistics and dashboards
- Team collaboration features (Post-MVP)

---

### Unit 4: Specification Domain (9 stories)

#### MVP Stories (5)
- **D2.2**: インタラクティブな仕様エディタ（バックエンド連携）
- **D2.4**: 保存と読み込み
- **S1.2**: サンプルプロジェクト（仕様コンテンツ）
- **S2.1**: ガイダンス付き仕様作成
- **S4.2**: 小規模プロジェクト完成（仕様部分）
- **M5.1**: 基本的な使用（仕様作成部分）

#### Post-MVP Stories (3)
- **M3.1**: 仕様品質レビュー
- **M4.1**: ベストプラクティス共有（仕様テンプレート）
- **M4.2**: テンプレート管理

**Primary Responsibilities**:
- Specification CRUD
- Version management
- Content storage (DB + S3)
- Template management (Post-MVP)

---

### Unit 5: Code Generation Domain (6 stories)

#### MVP Stories (5)
- **D3.1**: 仕様からコード生成
- **D3.2**: 生成コードのプレビュー
- **D3.3**: コードのダウンロード
- **D6.1**: AIによるコード生成支援（基本）
- **S2.2**: コード生成体験
- **S4.2**: 小規模プロジェクト完成（コード生成部分）
- **M5.1**: 基本的な使用（コード生成部分）

#### Post-MVP Stories (0)
- None (MVP focus)

**Primary Responsibilities**:
- Code generation from specifications
- Template application
- AI integration for code suggestions
- Generated code storage (DB + S3)

---

### Unit 6: Validation Domain (6 stories)

#### MVP Stories (5)
- **D2.3**: リアルタイム検証
- **D4.1**: 整合性チェック
- **S3.1**: 分かりやすいエラーメッセージ
- **M5.1**: 基本的な使用（検証部分）

#### Post-MVP Stories (2)
- **D4.2**: 差分の可視化
- **M3.1**: 仕様品質レビュー

**Primary Responsibilities**:
- Syntax validation
- Semantic validation
- Consistency checking
- Validation result generation

---

### Unit 7: AI Service (1 story)

#### MVP Stories (1)
- **D6.1**: AIによるコード生成支援（基本機能）
  - AI-powered code suggestions
  - Integration with Code Generation Domain

#### Post-MVP Stories (0)
- Future: Advanced AI features (paid tier)

**Primary Responsibilities**:
- AI API integration (OpenAI, Claude)
- Code suggestion generation
- Usage tracking (for future billing)

---

## MVP Story Distribution

### Sprint 1 (Week 1): Foundation
**Focus**: Authentication, Projects, Basic Editor

| Unit | Stories | Story Points |
|------|---------|--------------|
| U1 (Frontend) | D1.1, D1.2, D2.1, D5.1, D5.2 | ~15 |
| U2 (Auth) | D1.1 | ~3 |
| U3 (Project) | D2.1, D5.1, D5.2 | ~4 |

**Deliverable**: Users can login, create projects, basic UI

---

### Sprint 2 (Week 1-2): Editor & Validation
**Focus**: Specification editing, Validation

| Unit | Stories | Story Points |
|------|---------|--------------|
| U1 (Frontend) | D2.2, D2.3, D2.4, D4.1, S1.1, S1.2, S2.1, S3.1 | ~30 |
| U4 (Spec) | D2.2, D2.4, S1.2, S2.1 | ~15 |
| U6 (Validation) | D2.3, D4.1, S3.1 | ~8 |

**Deliverable**: Full editor with validation, tutorial

---

### Sprint 3 (Week 2): Code Generation & AI
**Focus**: Code generation, AI integration

| Unit | Stories | Story Points |
|------|---------|--------------|
| U1 (Frontend) | D3.1, D3.2, D3.3, D6.1, S2.2, S4.2 | ~25 |
| U5 (CodeGen) | D3.1, D3.2, D3.3, D6.1, S2.2, S4.2 | ~13 |
| U7 (AI) | D6.1 | ~8 |

**Deliverable**: Complete MVP with code generation and AI

---

## Post-MVP Story Distribution

### Phase 1: Manager Features
**Focus**: Team management, Dashboards

| Unit | Stories | Story Points |
|------|---------|--------------|
| U1 (Frontend) | M1.1, M1.2, M2.1, M2.2 | ~16 |
| U2 (Auth) | M1.2, M2.1 | ~8 |
| U3 (Project) | M1.1, M1.2, M2.2 | ~8 |

---

### Phase 2: Quality & Process
**Focus**: Quality review, Templates, Best practices

| Unit | Stories | Story Points |
|------|---------|--------------|
| U1 (Frontend) | M3.1, M3.2, M4.1, M4.2, D4.2 | ~16 |
| U4 (Spec) | M3.1, M4.1, M4.2 | ~8 |
| U6 (Validation) | M3.1, D4.2 | ~8 |

---

## Story Coverage Validation

### All Stories Mapped ✓
- **Developer Stories**: 13/13 mapped
- **Student Stories**: 8/8 mapped
- **Manager Stories**: 10/10 mapped (including shared D stories)
- **Total**: 31/31 mapped

### All Units Have Stories ✓
- **U1 (Frontend)**: 31 stories (all stories have UI)
- **U2 (Auth)**: 4 stories
- **U3 (Project)**: 10 stories
- **U4 (Spec)**: 9 stories
- **U5 (CodeGen)**: 6 stories
- **U6 (Validation)**: 6 stories
- **U7 (AI)**: 1 story

### Priority Coverage ✓
- **MVP Stories**: 19 stories mapped to all 7 units
- **Post-MVP Stories**: 12 stories mapped to Units 1-6
- **Medium Priority**: 2 stories mapped to Unit 1

---

## Traceability Matrix

### Requirements → Stories → Units

| Requirement | Stories | Units Involved |
|-------------|---------|----------------|
| FR1 (Core Platform) | D2.1, D5.1, S1.2, S4.2, M4.2, M5.2 | U1, U3, U4 |
| FR2 (Multi-User) | M1.1, M1.2, M2.1, M2.2 | U1, U2, U3 |
| FR3 (Authentication) | D1.1, M2.1, M5.1 | U1, U2 |
| FR4.1 (Spec Creation) | D2.2, D2.3, S2.1 | U1, U4, U6 |
| FR4.2 (Code Generation) | D3.1, D3.2, D3.3, S2.2 | U1, U5 |
| FR4.3 (Validation) | D4.1, D4.2, M3.1 | U1, U6 |
| FR4.4 (AI Assistance) | D6.1 | U1, U5, U7 |
| FR5 (Interactive Editor) | D2.2 | U1, U4 |
| FR6 (User-Friendly UI) | D1.2, S1.1, S1.2, S2.1, S3.1, S3.2, S4.1, M4.1 | U1 |
| FR7 (Data Persistence) | D2.1, D2.4, D5.1, D5.2, S4.2, M5.2 | U3, U4, U5 |

---

## Development Dependencies

### Critical Path (MVP)
1. **U2 (Auth)** → Foundation (Week 1)
2. **U3 (Project)** → Depends on U2 (Week 1)
3. **U4 (Spec)** → Depends on U2, U3 (Week 1-2)
4. **U6 (Validation)** → Depends on U2, U4 (Week 1-2, parallel with U4)
5. **U7 (AI)** → Independent (Week 2, parallel)
6. **U5 (CodeGen)** → Depends on U2, U4, U7 (Week 2)
7. **U1 (Frontend)** → Depends on all (continuous, all weeks)

### Parallel Development Opportunities
- **Week 1**: U2 + U3 + U1 (Auth & Project modules)
- **Week 1-2**: U4 + U6 + U7 + U1 (Editor, Validation, AI, UI modules)
- **Week 2**: U5 + U1 (Code generation, final integration)

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-31  
**Status**: Complete