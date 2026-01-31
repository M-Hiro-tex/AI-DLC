# Manager User Stories

**Persona**: 鈴木 誠（Makoto Suzuki） - プロジェクトマネージャー

**Main Goals**:
- チーム全体の開発効率を向上させる
- プロジェクトの進捗状況を把握する
- 仕様と実装の整合性を確保する
- 学生や新人への効果的な教育方法を見つける

---

## Epic 1: プロジェクト概要の把握

### Story 1.1: プロジェクトダッシュボードの確認
**As a** Manager  
**I want to** チーム全体のプロジェクト概要をダッシュボードで確認できる  
**So that** プロジェクトの全体像を素早く把握できる

**Priority**: Medium (Post-MVP)  
**Story Points**: 5

**Acceptance Criteria**:
- [ ] すべてのプロジェクトが一覧表示される
- [ ] 各プロジェクトのステータス（進行中、完了など）が表示される
- [ ] チームメンバーとプロジェクトの関連が表示される
- [ ] プロジェクト数の統計が表示される
- [ ] 最近更新されたプロジェクトが強調表示される

---

### Story 1.2: チームメンバーの活動状況確認
**As a** Manager  
**I want to** チームメンバーの活動状況を確認できる  
**So that** チームの生産性を把握し、必要に応じてサポートできる

**Priority**: Medium (Post-MVP)  
**Story Points**: 3

**Acceptance Criteria**:
- [ ] 各メンバーのアクティビティが表示される
- [ ] 最終アクセス日時が表示される
- [ ] 作成したプロジェクト数が表示される
- [ ] 完了したプロジェクト数が表示される

---

## Epic 2: チーム導入と教育

### Story 2.1: チームへの招待
**As a** Manager  
**I want to** チームメンバーをプラットフォームに招待できる  
**So that** チーム全体で仕様駆動開発を導入できる

**Priority**: Low (Post-MVP)  
**Story Points**: 3

**Acceptance Criteria**:
- [ ] メールアドレスでメンバーを招待できる
- [ ] 招待リンクを生成できる
- [ ] 招待状況（承認待ち、完了）が確認できる
- [ ] 招待されたメンバーが簡単に参加できる

---

### Story 2.2: 学習プログラムの管理（教育コーディネーターとして）
**As a** Manager (Education Coordinator)  
**I want to** 学生や新人の学習進捗を管理できる  
**So that** 効果的な教育プログラムを提供できる

**Priority**: Medium (Post-MVP)  
**Story Points**: 5

**Acceptance Criteria**:
- [ ] 学習者一覧が表示される
- [ ] 各学習者の進捗状況が確認できる
- [ ] 完了したチュートリアル数が表示される
- [ ] 学習時間の統計が表示される
- [ ] 学習が停滞している学習者を特定できる

---

## Epic 3: 品質管理

### Story 3.1: 仕様品質のレビュー
**As a** Manager  
**I want to** チームが作成した仕様の品質をレビューできる  
**So that** プロジェクトの品質基準を維持できる

**Priority**: Medium (Post-MVP)  
**Story Points**: 3

**Acceptance Criteria**:
- [ ] チームのプロジェクト一覧にアクセスできる
- [ ] 各プロジェクトの仕様を閲覧できる
- [ ] 仕様にコメントを残せる
- [ ] 品質チェックの結果が表示される
- [ ] 承認/却下のステータスを設定できる

---

### Story 3.2: プロジェクトレポートの生成
**As a** Manager  
**I want to** プロジェクトの進捗や品質に関するレポートを生成できる  
**So that** ステークホルダーに報告できる

**Priority**: Low (Post-MVP)  
**Story Points**: 5

**Acceptance Criteria**:
- [ ] レポート生成ボタンが表示される
- [ ] レポートには統計情報が含まれる
- [ ] レポートをPDFでエクスポートできる
- [ ] レポート期間を指定できる
- [ ] グラフや視覚的な要素が含まれる

---

## Epic 4: プロセス改善

### Story 4.1: ベストプラクティスの共有
**As a** Manager  
**I want to** チーム内でベストプラクティスを共有できる  
**So that** チーム全体のスキルを向上させられる

**Priority**: Low (Post-MVP)  
**Story Points**: 3

**Acceptance Criteria**:
- [ ] ベストプラクティスのライブラリがある
- [ ] 新しいベストプラクティスを追加できる
- [ ] チームメンバーにベストプラクティスを通知できる
- [ ] ベストプラクティスの適用例が表示される

---

### Story 4.2: テンプレートの作成と管理
**As a** Manager  
**I want to** 組織標準のプロジェクトテンプレートを作成・管理できる  
**So that** チーム全体で統一された開発プロセスを実現できる

**Priority**: Low (Post-MVP)  
**Story Points**: 5

**Acceptance Criteria**:
- [ ] 新しいテンプレートを作成できる
- [ ] テンプレートに仕様のひな形を含められる
- [ ] テンプレートをチームメンバーと共有できる
- [ ] テンプレートからプロジェクトを開始できる
- [ ] テンプレートを編集・削除できる

---

## Epic 5: 認証と基本機能（Managerも利用）

### Story 5.1: ソーシャルログイン
**As a** Manager  
**I want to** ソーシャルアカウント（Google または GitHub）でログインできる  
**So that** 迅速にプラットフォームにアクセスできる

**Priority**: High (MVP)  
**Story Points**: 0 (Developer Story 1.1と共通)

**Acceptance Criteria**:
- Developer Story 1.1 と同じ

---

### Story 5.2: 自分のプロジェクト作成と管理
**As a** Manager  
**I want to** 自分のプロジェクトを作成・管理できる  
**So that** 仕様駆動開発を実際に体験できる

**Priority**: High (MVP)  
**Story Points**: 0 (Developer Stories 2.x, 5.xと共通)

**Acceptance Criteria**:
- Developer Stories 2.x, 5.x と同じ

---

## Story-Requirement Traceability

| Story ID | Requirement ID | Requirement Description |
|----------|----------------|-------------------------|
| 1.1 | FR2 | 複数ユーザータイプのサポート |
| 1.2 | FR2 | チーム管理 |
| 2.1 | FR3 | ユーザー管理 |
| 2.2 | FR2, FR6 | 教育プログラム管理 |
| 3.1 | FR4.3 | 品質管理 |
| 3.2 | FR2 | レポート機能 |
| 4.1 | FR6 | ベストプラクティス |
| 4.2 | FR1 | テンプレート管理 |
| 5.1 | FR3 | 認証 |
| 5.2 | FR1, FR7 | プロジェクト管理 |

---

## MVP vs. Post-MVP

### MVP Features (1-2 Week Prototype)
- Epic 5: 基本機能（Story 5.1, 5.2）
  - Managerも基本的にはDeveloperと同じ機能を使用
  - ログイン、プロジェクト作成、仕様作成、コード生成

### Post-MVP Features (Future)
- Epic 1: プロジェクト概要の把握（Story 1.1, 1.2）
- Epic 2: チーム導入と教育（Story 2.1, 2.2）
- Epic 3: 品質管理（Story 3.1, 3.2）
- Epic 4: プロセス改善（Story 4.1, 4.2）

---

## Summary

**Total Stories for Manager Persona**: 10 (MVP: 2 shared, Post-MVP: 8)  
**Total Story Points**: 32 (Post-MVP only, MVP stories shared with Developer)  
**Estimated Timeline**: Post-MVP features for future releases  
**Primary Value**: チーム管理、品質保証、教育支援

**Note**: MVPでは、ManagerペルソナはDeveloperと同じ基本機能を使用します。Manager固有の機能（ダッシュボード、チーム管理、レポート等）はPost-MVP機能として将来実装予定です。これにより、1-2週間のプロトタイプ期間内で実現可能な範囲に絞り込んでいます。