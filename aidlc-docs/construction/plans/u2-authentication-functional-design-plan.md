# U2: Authentication Domain - Functional Design Plan

## Unit Context

**Unit**: U2 - Authentication Domain  
**Type**: Backend Service  
**Technology**: Node.js/Python + Express/FastAPI  
**Deployment**: Lambda/ECS Fargate

### Assigned Stories (MVP Focus)
- **D1.1**: ソーシャルログイン（Google） - MVP
- **M5.1**: 基本的な使用（認証部分） - MVP

### Components from Application Design
- Authentication Service Component
- OAuth Integration
- Session Service
- User Profile Service

### Responsibilities
- OAuth Provider統合（Google、GitHub）
- セッショントークン管理
- ユーザープロファイル管理
- 認証状態検証
- セキュリティポリシー適用

---

## Functional Design Plan

### Step 1: Business Logic Modeling
- [ ] Define OAuth authentication flow
  - [ ] Google OAuth flow (authorization code flow)
  - [ ] GitHub OAuth flow (for future)
  - [ ] OAuth state management and security
  - [ ] OAuth callback handling
- [ ] Define session management logic
  - [ ] Session creation upon successful authentication
  - [ ] Session token generation (JWT)
  - [ ] Session validation logic
  - [ ] Session refresh logic
  - [ ] Session expiration handling
- [ ] Define user profile management logic
  - [ ] User profile creation on first login
  - [ ] User profile retrieval
  - [ ] User profile updates
  - [ ] User data mapping from OAuth provider

### Step 2: Domain Model Design
- [ ] Define User entity
  - [ ] User ID (primary key)
  - [ ] OAuth provider ID
  - [ ] OAuth provider type (Google/GitHub)
  - [ ] Email address
  - [ ] Display name
  - [ ] Profile picture URL
  - [ ] Created timestamp
  - [ ] Last login timestamp
- [ ] Define Session entity
  - [ ] Session ID (primary key)
  - [ ] User ID (foreign key)
  - [ ] Access token (JWT)
  - [ ] Refresh token
  - [ ] Token expiration time
  - [ ] Created timestamp
  - [ ] Last accessed timestamp
- [ ] Define OAuth State entity
  - [ ] State token (primary key)
  - [ ] Redirect URL
  - [ ] Created timestamp
  - [ ] Expiration time

### Step 3: Business Rules Definition
- [ ] OAuth authentication rules
  - [ ] Validate OAuth provider credentials
  - [ ] Verify OAuth callback state token
  - [ ] Handle OAuth errors (denied access, invalid credentials)
  - [ ] Map OAuth user data to internal user profile
- [ ] Session management rules
  - [ ] Access token validity period (e.g., 1 hour)
  - [ ] Refresh token validity period (e.g., 30 days)
  - [ ] Session token refresh rules
  - [ ] Session termination rules
  - [ ] Concurrent session handling
- [ ] User profile rules
  - [ ] Email uniqueness validation
  - [ ] User profile required fields
  - [ ] User profile update validation

### Step 4: Data Flow Design
- [ ] OAuth login flow
  - [ ] Client requests OAuth login URL
  - [ ] Generate and store OAuth state token
  - [ ] Redirect to OAuth provider
  - [ ] Handle OAuth callback
  - [ ] Exchange authorization code for access token
  - [ ] Retrieve user information from OAuth provider
  - [ ] Create or update user profile
  - [ ] Create session
  - [ ] Return session tokens to client
- [ ] Session validation flow
  - [ ] Client provides access token
  - [ ] Validate token signature
  - [ ] Check token expiration
  - [ ] Retrieve session from database
  - [ ] Return session status
- [ ] Session refresh flow
  - [ ] Client provides refresh token
  - [ ] Validate refresh token
  - [ ] Generate new access token
  - [ ] Update session record
  - [ ] Return new tokens
- [ ] Logout flow
  - [ ] Client provides session token
  - [ ] Invalidate session
  - [ ] Delete session from database

### Step 5: Error Handling Design
- [ ] OAuth authentication errors
  - [ ] Invalid OAuth credentials
  - [ ] User denied access
  - [ ] OAuth provider unavailable
  - [ ] State token mismatch
- [ ] Session errors
  - [ ] Expired access token
  - [ ] Invalid refresh token
  - [ ] Session not found
  - [ ] Concurrent session conflicts
- [ ] User profile errors
  - [ ] Duplicate email address
  - [ ] Invalid user data
  - [ ] Database errors

### Step 6: Security Considerations
- [ ] OAuth security
  - [ ] CSRF protection using state token
  - [ ] Secure storage of OAuth client secrets
  - [ ] HTTPS-only communication
- [ ] Token security
  - [ ] JWT signing algorithm (RS256 or HS256)
  - [ ] Token encryption at rest
  - [ ] Secure token transmission
- [ ] Session security
  - [ ] Rate limiting for authentication attempts
  - [ ] Brute force protection
  - [ ] IP-based session validation (optional)

### Step 7: Validation Logic Design
- [ ] Input validation
  - [ ] OAuth callback parameters validation
  - [ ] Token format validation
  - [ ] User profile data validation
- [ ] Business validation
  - [ ] Email format validation
  - [ ] Required fields validation
  - [ ] Data type validation

### Step 8: Generate Functional Design Artifacts
- [ ] Create `aidlc-docs/construction/u2-authentication/functional-design/business-logic-model.md`
- [ ] Create `aidlc-docs/construction/u2-authentication/functional-design/business-rules.md`
- [ ] Create `aidlc-docs/construction/u2-authentication/functional-design/domain-entities.md`

---

## Questions for Clarification

### Question 1: OAuth Provider Configuration
どのOAuthプロバイダーを最初に実装しますか？

A) Googleのみ（MVP最小構成）
B) Google + GitHub（将来の拡張性を考慮）
C) Google + GitHubの両方をMVPで実装
D) その他（説明してください）

[Answer]: D.Google + GitHubの両方をMVPで実装。将来的にApple ID連携もしたい

### Question 2: Session Token Strategy
セッショントークンの実装方式を選択してください。

A) JWT (JSON Web Token) - ステートレス、スケーラブル
B) Opaque Token + Database Lookup - より制御可能
C) ハイブリッド（アクセストークン：JWT、リフレッシュトークン：Opaque）
D) その他（説明してください）

[Answer]: C

### Question 3: Token Expiration Policy
トークンの有効期限を設定してください。

A) アクセストークン：15分、リフレッシュトークン：7日間（高セキュリティ）
B) アクセストークン：1時間、リフレッシュトークン：30日間（標準）
C) アクセストークン：24時間、リフレッシュトークン：90日間（ユーザーフレンドリー）
D) その他（カスタム設定を説明してください）

[Answer]: D. アクセストークン：3時間、リフレッシュトークン：30日間（標準）

### Question 4: User Profile Storage
ユーザープロファイルの保存方式を選択してください。

A) DynamoDB（NoSQL、スケーラブル）
B) RDS（リレーショナル、ACID準拠）
C) DynamoDB（メイン） + ElastiCache（キャッシング）
D) その他（説明してください）

[Answer]: B. RDS（Aurora Serverless PostgreSQL）

### Question 5: Concurrent Session Handling
同一ユーザーの複数デバイスからのログインをどう扱いますか？

A) 許可しない（1デバイスのみ、新しいログインで既存セッションを無効化）
B) 複数セッション許可（無制限）
C) 複数セッション許可（上限あり、例：5デバイスまで）
D) その他（説明してください）

[Answer]: B

### Question 6: OAuth Error Handling
OAuthプロバイダーからのエラーをどう処理しますか？

A) ユーザーにエラーメッセージを表示してログイン画面に戻る
B) リトライロジックを実装（最大3回）
C) フォールバックメカニズム（別の認証方法を提案）
D) その他（説明してください）

[Answer]: A

### Question 7: User Profile Auto-Update
OAuth情報（名前、メールアドレス、プロフィール画像）の更新ポリシーは？

A) ログイン時に常に最新情報で上書き
B) 初回ログイン時のみ保存、以降はユーザーが手動更新
C) ログイン時に変更を検出して確認画面を表示
D) その他（説明してください）

[Answer]: A

### Question 8: Session Storage Strategy
セッション情報の保存先を選択してください。

A) DynamoDB（永続化、スケーラブル）
B) ElastiCache/Redis（高速、一時的）
C) ハイブリッド（アクティブセッション：Redis、履歴：DynamoDB）
D) その他（説明してください）

[Answer]: D. RDS (Aurora Serverless PostgreSQL) 内の Session テーブルに保存

### Question 9: Security - Rate Limiting
認証APIのレート制限を設定しますか？

A) はい、IP単位で制限（例：1時間に10回まで）
B) はい、ユーザー単位で制限（例：1時間に5回まで）
C) 両方（IP単位 + ユーザー単位）
D) いいえ、MVPでは実装しない

[Answer]: C

### Question 10: Technology Stack Choice
バックエンドの実装言語を選択してください。

A) Node.js + TypeScript + Express
B) Python + FastAPI
C) Node.js + NestJS（エンタープライズグレード）
D) その他（説明してください）

[Answer]: A

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Awaiting User Input