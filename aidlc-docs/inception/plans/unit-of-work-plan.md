# Unit of Work Plan

## Context

**Project**: Web-based Specification-Driven Development Platform  
**Type**: Greenfield  
**Architecture**: Frontend/Backend完全分離、BFF Pattern、SPA  
**Components**: 14 (Frontend: 7, Backend: 7)  
**User Stories**: 31 (MVP: 19, Post-MVP: 12)  
**Timeline**: 1-2 weeks MVP

---

## Unit Decomposition Questions

以下の質問に回答して、システムをユニットに分解する方針を明確にしてください。各質問の選択肢の文字（A、B、C等）を [Answer]: タグの後に記入してください。

### Deployment Architecture

#### Question 1
このシステムのデプロイメントモデルは？

A) モノリス - すべてを1つのデプロイ可能なアプリケーションとして構築
B) マイクロサービス - 各ユニットを独立してデプロイ可能なサービスとして構築
C) ハイブリッド - フロントエンドはモノリス、バックエンドは複数サービス
D) Other (please describe after [Answer]: tag below)

[Answer]: C

#### Question 2
フロントエンドとバックエンドのデプロイメント戦略は？

A) 完全分離デプロイ - フロントエンド（SPA）とバックエンド（BFF）を別々にデプロイ
B) 統合デプロイ - 両方を1つのパッケージとしてデプロイ
C) CDN + API分離 - フロントエンドはCDN、バックエンドは独立サーバー
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Unit Organization Strategy

#### Question 3
バックエンドサービスの組織化方法は？

A) 単一BFFサービス - すべてのBFF機能を1つのサービスに統合
B) 機能別サービス分割 - 認証、プロジェクト、仕様、コード生成等を別サービス化
C) レイヤー別分割 - BFF層、ビジネスロジック層、データ層を分離
D) ドメイン別分割 - 認証ドメイン、プロジェクトドメイン、仕様ドメイン等
E) Other (please describe after [Answer]: tag below)

[Answer]: D

#### Question 4
フロントエンドコンポーネントの組織化方法は？

A) 単一SPA - すべてのフロントエンドコンポーネントを1つのSPAに統合
B) 機能別モジュール - 各機能を独立したモジュールとして構成
C) Micro Frontend - 各機能を独立したフロントエンドアプリとして構築
D) Other (please describe after [Answer]: tag below)

[Answer]: B

### Story-to-Unit Mapping

#### Question 5
ユーザーストーリーをユニットにマッピングする基準は？

A) 機能ドメイン - 認証、プロジェクト管理、エディタ等の機能領域
B) ペルソナ - Developer向け、Student向け、Manager向け
C) MVP優先度 - MVP機能を1つのユニット、Post-MVPを別ユニット
D) 技術スタック - フロントエンド機能、バックエンド機能で分割
E) Other (please describe after [Answer]: tag below)

[Answer]: A

#### Question 6
MVPとPost-MVP機能の取り扱いは？

A) 統合 - すべてを同じユニットに含め、実装時に優先度で制御
B) 分離 - MVP機能とPost-MVP機能を別ユニットとして設計
C) 段階的 - MVP完了後にPost-MVP用のユニット追加を検討
D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Development Workflow

#### Question 7
開発チームの構成と並行開発の方針は？

A) 単一チーム順次開発 - 1チームがユニットを順番に開発
B) 複数チーム並行開発 - 複数チームが異なるユニットを並行開発
C) フロント/バック分離 - フロントエンドチームとバックエンドチームが並行作業
D) 機能別チーム - 機能領域ごとにチームを分けて並行開発
E) Other (please describe after [Answer]: tag below)

[Answer]: D

#### Question 8
ユニット間の依存関係管理方針は？

A) 最小依存 - ユニット間の依存を最小化、独立性重視
B) 階層的依存 - 明確な階層構造で依存を管理
C) 疎結合API - APIインターフェースで疎結合を実現
D) イベント駆動 - イベントベースで非同期連携
E) Other (please describe after [Answer]: tag below)

[Answer]: C

### Code Organization (Greenfield)

#### Question 9
Greenfieldプロジェクトのディレクトリ構造戦略は？

A) モノレポ - すべてのユニットを1つのリポジトリに配置
B) マルチレポ - 各ユニットを独立したリポジトリに配置
C) ハイブリッド - フロントエンドとバックエンドを別リポジトリに配置
D) Other (please describe after [Answer]: tag below)

[Answer]: A

#### Question 10
ユニット内のコード構成パターンは？

A) レイヤードアーキテクチャ - Controller, Service, Repository層
B) ドメイン駆動設計 - Domain, Application, Infrastructure層
C) 機能ベース - 機能ごとにフォルダを作成（Feature-based）
D) MVCパターン - Model, View, Controller分離
E) Other (please describe after [Answer]: tag below)

[Answer]: C

### Technical Considerations

#### Question 11
AI Service Componentの配置戦略は？

A) 独立ユニット - AI機能を完全に独立したユニットとして分離
B) コード生成ユニットに統合 - Code Generation Unitの一部として配置
C) 共有サービス - 複数ユニットから参照される共有サービス
D) Other (please describe after [Answer]: tag below)

[Answer]: A

#### Question 12
Data Persistence Serviceの配置戦略は？

A) 独立ユニット - データ永続化を専用ユニットとして分離
B) 各ユニットに統合 - 各ユニットが独自のデータアクセス層を持つ
C) 共有データ層 - すべてのユニットが共有するデータアクセス層
D) Other (please describe after [Answer]: tag below)

[Answer]: B

### Testing Strategy

#### Question 13
ユニット間の統合テスト戦略は？

A) ユニット完成後統合 - 各ユニット完成後に統合テスト実施
B) 継続的統合 - 開発中から継続的に統合テスト実施
C) エンドツーエンドのみ - ユニットテストとE2Eテストのみ、統合テストなし
D) Other (please describe after [Answer]: tag below)

[Answer]:B

---

## Unit of Work Execution Plan

### Phase 1: Unit Identification
- [x] Step 1.1: Analyze components and group into logical units
- [x] Step 1.2: Map user stories to identified units
- [x] Step 1.3: Validate unit boundaries and responsibilities

### Phase 2: Unit Definition
- [x] Step 2.1: Define each unit's purpose and scope
- [x] Step 2.2: Specify unit responsibilities and interfaces
- [x] Step 2.3: Document deployment and runtime characteristics

### Phase 3: Dependency Analysis
- [x] Step 3.1: Identify dependencies between units
- [x] Step 3.2: Create dependency matrix
- [x] Step 3.3: Validate no circular dependencies
- [x] Step 3.4: Define integration points and APIs

### Phase 4: Story Mapping
- [x] Step 4.1: Map MVP stories to units
- [x] Step 4.2: Map Post-MVP stories to units
- [x] Step 4.3: Ensure all stories are assigned
- [x] Step 4.4: Validate story distribution across units

### Phase 5: Code Organization Strategy
- [x] Step 5.1: Define repository structure
- [x] Step 5.2: Define directory structure per unit
- [x] Step 5.3: Specify build and deployment strategy
- [x] Step 5.4: Document development workflow

### Phase 6: Documentation Generation
- [x] Step 6.1: Generate unit-of-work.md
- [x] Step 6.2: Generate unit-of-work-dependency.md
- [x] Step 6.3: Generate unit-of-work-story-map.md
- [x] Step 6.4: Validate completeness

---

## Mandatory Artifacts

- [x] **unit-of-work.md**: Unit definitions with purpose, scope, responsibilities
- [x] **unit-of-work-dependency.md**: Dependency matrix and integration points
- [x] **unit-of-work-story-map.md**: Story-to-unit mapping with traceability
- [x] **Code Organization Strategy**: Directory structure and deployment model (in unit-of-work.md)

---

## Preliminary Unit Candidates

Based on Application Design components, potential units include:

### Frontend Units
1. **Authentication & User UI Unit**
   - Components: Authentication Component, Session Management
   - Stories: Social login, Welcome tour

2. **Project Management UI Unit**
   - Components: Project Management Component
   - Stories: Project CRUD, Project list

3. **Specification Editor UI Unit**
   - Components: Specification Editor Component, Validation Viewer Component
   - Stories: Spec creation, editing, real-time validation

4. **Code Preview UI Unit**
   - Components: Code Preview Component
   - Stories: Code preview, download

5. **Tutorial & Help UI Unit**
   - Components: Tutorial Component
   - Stories: Tutorial, samples, help

6. **UI Shell Unit**
   - Components: UI Shell Component
   - Stories: Navigation, layout

### Backend Units
7. **Authentication Service Unit**
   - Components: Authentication Service Component
   - Stories: OAuth integration, session management

8. **Project Service Unit**
   - Components: Project Service Component
   - Stories: Project data management

9. **Specification Service Unit**
   - Components: Specification Service Component
   - Stories: Spec storage, versioning

10. **Code Generation Service Unit**
    - Components: Code Generation Service Component, AI Service Component
    - Stories: Code generation, AI assistance

11. **Validation Service Unit**
    - Components: Validation Service Component
    - Stories: Validation, consistency check

12. **Data Persistence Service Unit**
    - Components: Data Persistence Service Component
    - Stories: Data storage (DB + S3)

**Note**: Final unit structure will be determined based on user answers to questions above.

---

## Notes

- Focus on logical grouping for development purposes
- Consider deployment model and team structure
- Ensure clear boundaries and minimal coupling
- Map all 31 user stories to units
- Maintain MVP focus for 1-2 week timeline

---

すべての質問に回答したら、「done」または「完了しました」とお知らせください。