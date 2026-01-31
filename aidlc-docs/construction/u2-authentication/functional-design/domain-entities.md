# U2: Authentication Domain - Domain Entities

## Overview

本ドキュメントでは、Authentication Domainのドメインエンティティとデータベーススキーマを定義します。

**Database**: RDS (Aurora Serverless PostgreSQL)  
**ORM**: Prisma または TypeORM (実装時に選択)

---

## Entity Relationship Diagram

```
+------------------+         +------------------+         +---------------------+
|     User         |         |    Session       |         |   OAuthState        |
+------------------+         +------------------+         +---------------------+
| PK: user_id      |<---+    | PK: session_id   |         | PK: state_token     |
| oauth_provider   |    |    | FK: user_id      |         | redirect_url        |
| oauth_provider_id|    |    | access_token_hash|         | created_at          |
| email            |    |    | refresh_token_hash|        | expires_at          |
| display_name     |    |    | expires_at       |         +---------------------+
| profile_pic_url  |    |    | created_at       |
| created_at       |    |    | last_accessed_at |
| last_login_at    |    |    | ip_address       |
+------------------+    |    | user_agent       |
                        |    | revoked          |
                        |    +------------------+
                        |            |
                        +------------+
                        1         *
```

---

## Entity Definitions

### 1. User Entity

**Purpose**: ユーザープロファイル情報を保存

**Table Name**: `users`

#### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | PRIMARY KEY | 内部ユーザーID (UUID v4) |
| oauth_provider | VARCHAR(20) | NOT NULL | OAuth provider ('google', 'github') |
| oauth_provider_id | VARCHAR(255) | NOT NULL | OAuth providerのユーザーID |
| email | VARCHAR(255) | NOT NULL, UNIQUE | メールアドレス (lowercase) |
| display_name | VARCHAR(100) | NOT NULL | 表示名 |
| profile_picture_url | TEXT | NULLABLE | プロフィール画像URL |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | アカウント作成日時 |
| last_login_at | TIMESTAMP | NOT NULL | 最終ログイン日時 |

#### Indexes

```sql
-- Primary Key
CREATE UNIQUE INDEX idx_users_pk ON users(user_id);

-- OAuth Provider Lookup (unique constraint)
CREATE UNIQUE INDEX idx_users_oauth 
  ON users(oauth_provider, oauth_provider_id);

-- Email Lookup (unique constraint)
CREATE UNIQUE INDEX idx_users_email 
  ON users(LOWER(email));

-- Last Login (for analytics)
CREATE INDEX idx_users_last_login 
  ON users(last_login_at DESC);
```

#### TypeScript Interface

```typescript
interface User {
  userId: string                          // UUID v4
  oauthProvider: 'google' | 'github'
  oauthProviderId: string
  email: string
  displayName: string
  profilePictureUrl: string | null
  createdAt: Date
  lastLoginAt: Date
}
```

#### Business Rules

- **Email Uniqueness**: Case-insensitive uniqueness enforced via index
- **OAuth Uniqueness**: Each OAuth provider + provider ID combination must be unique
- **Display Name**: Required, 1-100 characters
- **Profile Picture**: Optional, valid URL

#### Sample Data

```sql
INSERT INTO users (
  user_id, 
  oauth_provider, 
  oauth_provider_id, 
  email, 
  display_name, 
  profile_picture_url,
  created_at,
  last_login_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'google',
  '1234567890',
  'user@example.com',
  'John Doe',
  'https://lh3.googleusercontent.com/a/default-user',
  '2026-01-15 10:30:00',
  '2026-02-01 09:15:00'
);
```

---

### 2. Session Entity

**Purpose**: ユーザーセッションとトークン情報を保存

**Table Name**: `sessions`

#### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| session_id | UUID | PRIMARY KEY | セッションID (UUID v4) |
| user_id | UUID | NOT NULL, FK → users(user_id) | ユーザーID |
| access_token_hash | VARCHAR(64) | NOT NULL | JWTアクセストークンのSHA-256ハッシュ |
| refresh_token_hash | VARCHAR(64) | NOT NULL, UNIQUE | リフレッシュトークンのSHA-256ハッシュ |
| expires_at | TIMESTAMP | NOT NULL | セッション有効期限 (リフレッシュトークンの期限) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | セッション作成日時 |
| last_accessed_at | TIMESTAMP | NOT NULL | 最終アクセス日時 |
| ip_address | VARCHAR(45) | NULLABLE | クライアントIPアドレス (IPv4/IPv6) |
| user_agent | TEXT | NULLABLE | クライアントUser-Agent |
| revoked | BOOLEAN | NOT NULL, DEFAULT FALSE | セッション無効化フラグ |

#### Indexes

```sql
-- Primary Key
CREATE UNIQUE INDEX idx_sessions_pk ON sessions(session_id);

-- User Sessions Lookup
CREATE INDEX idx_sessions_user_id 
  ON sessions(user_id, created_at DESC);

-- Refresh Token Lookup (unique constraint)
CREATE UNIQUE INDEX idx_sessions_refresh_token 
  ON sessions(refresh_token_hash);

-- Session Cleanup (expired sessions)
CREATE INDEX idx_sessions_expires_at 
  ON sessions(expires_at) 
  WHERE revoked = FALSE;

-- Active Sessions Per User
CREATE INDEX idx_sessions_active 
  ON sessions(user_id, revoked, expires_at);
```

#### Foreign Keys

```sql
ALTER TABLE sessions
ADD CONSTRAINT fk_sessions_user_id
FOREIGN KEY (user_id) REFERENCES users(user_id)
ON DELETE CASCADE;
```

#### TypeScript Interface

```typescript
interface Session {
  sessionId: string                      // UUID v4
  userId: string                         // UUID v4
  accessTokenHash: string                // SHA-256 hex
  refreshTokenHash: string               // SHA-256 hex
  expiresAt: Date                        // 30 days from creation
  createdAt: Date
  lastAccessedAt: Date
  ipAddress: string | null
  userAgent: string | null
  revoked: boolean
}
```

#### Business Rules

- **Token Hashing**: All tokens stored as SHA-256 hashes, never plain text
- **Session Expiration**: Expires 30 days after creation (refresh token expiry)
- **Automatic Cleanup**: Expired sessions deleted by background job
- **Revocation**: Revoked sessions cannot be restored
- **Cascade Delete**: Deleting user deletes all associated sessions

#### Sample Data

```sql
INSERT INTO sessions (
  session_id,
  user_id,
  access_token_hash,
  refresh_token_hash,
  expires_at,
  created_at,
  last_accessed_at,
  ip_address,
  user_agent,
  revoked
) VALUES (
  '660e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  'a1b2c3d4e5f6...', -- SHA-256 hash
  'f6e5d4c3b2a1...', -- SHA-256 hash
  '2026-03-03 09:15:00',
  '2026-02-01 09:15:00',
  '2026-02-01 09:15:00',
  '192.168.1.100',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
  FALSE
);
```

---

### 3. OAuthState Entity

**Purpose**: OAuth認証フローのstate tokenを一時的に保存

**Table Name**: `oauth_states`

#### Schema

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| state_token | UUID | PRIMARY KEY | OAuthステートトークン (UUID v4) |
| redirect_url | TEXT | NOT NULL | OAuth完了後のリダイレクトURL |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | トークン作成日時 |
| expires_at | TIMESTAMP | NOT NULL | トークン有効期限 (5分後) |
| used | BOOLEAN | NOT NULL, DEFAULT FALSE | トークン使用済みフラグ |

#### Indexes

```sql
-- Primary Key
CREATE UNIQUE INDEX idx_oauth_states_pk 
  ON oauth_states(state_token);

-- Expiration Cleanup
CREATE INDEX idx_oauth_states_expires_at 
  ON oauth_states(expires_at);
```

#### TypeScript Interface

```typescript
interface OAuthState {
  stateToken: string                     // UUID v4
  redirectUrl: string
  createdAt: Date
  expiresAt: Date                        // 5 minutes from creation
  used: boolean
}
```

#### Business Rules

- **Short-lived**: State tokens expire after 5 minutes
- **Single Use**: Each state token can only be used once
- **CSRF Protection**: State tokens prevent cross-site request forgery
- **Automatic Cleanup**: Expired state tokens deleted by background job

#### Sample Data

```sql
INSERT INTO oauth_states (
  state_token,
  redirect_url,
  created_at,
  expires_at,
  used
) VALUES (
  '770e8400-e29b-41d4-a716-446655440002',
  'https://app.example.com/auth/callback',
  '2026-02-01 09:10:00',
  '2026-02-01 09:15:00',
  FALSE
);
```

---

## Database Schema DDL

### Complete Schema Creation

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oauth_provider VARCHAR(20) NOT NULL CHECK (oauth_provider IN ('google', 'github')),
  oauth_provider_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  profile_picture_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_users_oauth UNIQUE (oauth_provider, oauth_provider_id),
  CONSTRAINT uq_users_email UNIQUE (LOWER(email)),
  CONSTRAINT chk_display_name_length CHECK (LENGTH(display_name) >= 1 AND LENGTH(display_name) <= 100)
);

-- Create sessions table
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  access_token_hash VARCHAR(64) NOT NULL,
  refresh_token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  
  CONSTRAINT fk_sessions_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES users(user_id) 
    ON DELETE CASCADE
);

-- Create oauth_states table
CREATE TABLE oauth_states (
  state_token UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  redirect_url TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create indexes
CREATE INDEX idx_users_last_login ON users(last_login_at DESC);
CREATE INDEX idx_sessions_user_id ON sessions(user_id, created_at DESC);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at) WHERE revoked = FALSE;
CREATE INDEX idx_sessions_active ON sessions(user_id, revoked, expires_at);
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Create function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_last_accessed_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session last accessed timestamp
CREATE TRIGGER trg_sessions_last_accessed
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_last_accessed_at();
```

---

## Data Migration Strategies

### Initial Schema Creation

```sql
-- Run this once during initial deployment
\i schema.sql
```

### Adding Apple OAuth Support (Future)

```sql
-- Add 'apple' to oauth_provider enum constraint
ALTER TABLE users
DROP CONSTRAINT users_oauth_provider_check;

ALTER TABLE users
ADD CONSTRAINT users_oauth_provider_check
CHECK (oauth_provider IN ('google', 'github', 'apple'));
```

### Adding Session Metadata (Future)

```sql
-- Add device_name column for better session management
ALTER TABLE sessions
ADD COLUMN device_name VARCHAR(100);

-- Add location info (optional)
ALTER TABLE sessions
ADD COLUMN country_code VARCHAR(2),
ADD COLUMN city VARCHAR(100);
```

---

## Database Maintenance Tasks

### 1. Expired Session Cleanup

```sql
-- Delete expired and revoked sessions (run daily)
DELETE FROM sessions
WHERE revoked = TRUE
   OR expires_at < NOW();
```

**Recommended**: Run as daily cron job or AWS EventBridge scheduled task

### 2. Expired OAuth State Cleanup

```sql
-- Delete expired OAuth state tokens (run hourly)
DELETE FROM oauth_states
WHERE expires_at < NOW()
   OR used = TRUE;
```

**Recommended**: Run as hourly cron job

### 3. User Inactivity Cleanup (Optional, Post-MVP)

```sql
-- Archive users who haven't logged in for 365 days
-- (Implement soft delete for compliance)
UPDATE users
SET archived = TRUE
WHERE last_login_at < NOW() - INTERVAL '365 days'
  AND archived = FALSE;
```

---

## Data Backup and Recovery

### Backup Strategy

```sql
-- Full database backup (automated via RDS)
-- - Automated daily backups (retention: 30 days)
-- - Point-in-time recovery enabled
-- - Multi-AZ deployment for high availability
```

### Recovery Procedures

1. **Point-in-time recovery**: Restore to specific timestamp
2. **Snapshot recovery**: Restore from daily snapshot
3. **Manual backup**: Create manual snapshot before major changes

---

## Performance Optimization

### Query Performance

**Most Common Queries**:

```sql
-- 1. User lookup by email (login)
SELECT * FROM users WHERE LOWER(email) = LOWER($1);
-- Uses: idx_users_email (unique index)

-- 2. Session validation
SELECT * FROM sessions 
WHERE session_id = $1 
  AND revoked = FALSE 
  AND expires_at > NOW();
-- Uses: idx_sessions_pk (primary key)

-- 3. User sessions list
SELECT * FROM sessions 
WHERE user_id = $1 
  AND revoked = FALSE 
ORDER BY created_at DESC;
-- Uses: idx_sessions_user_id

-- 4. Refresh token lookup
SELECT * FROM sessions 
WHERE refresh_token_hash = $1 
  AND revoked = FALSE;
-- Uses: idx_sessions_refresh_token (unique index)
```

### Connection Pooling

```typescript
// Database connection pool configuration
const poolConfig = {
  max: 20,              // Maximum connections
  min: 5,               // Minimum connections
  idle: 10000,          // Idle timeout (10 seconds)
  connectionTimeout: 5000 // Connection timeout (5 seconds)
}
```

---

## Security Considerations

### Data Protection

1. **Token Hashing**: All tokens stored as SHA-256 hashes
2. **Email Normalization**: Stored as lowercase for case-insensitive comparison
3. **No Plain Text Secrets**: OAuth client secrets in AWS Secrets Manager
4. **Encrypted at Rest**: RDS encryption enabled
5. **Encrypted in Transit**: TLS/SSL for all connections

### Access Control

```sql
-- Create read-only user for reporting/analytics
CREATE USER reporting_user WITH PASSWORD 'secure_password';
GRANT SELECT ON users TO reporting_user;
GRANT SELECT ON sessions TO reporting_user;
```

---

## Data Retention Policy

### Session Data

- **Active Sessions**: Retained until expiration (30 days) or logout
- **Expired Sessions**: Deleted after 7 days of expiration
- **Revoked Sessions**: Deleted immediately after 24 hours

### User Data

- **Active Users**: Retained indefinitely
- **Inactive Users** (Post-MVP): Archive after 365 days of inactivity
- **Deleted Users** (Post-MVP): Soft delete, purge after 90 days

### OAuth State Tokens

- **Unused Tokens**: Deleted after expiration (5 minutes)
- **Used Tokens**: Deleted immediately after use

---

## Testing Data

### Sample Test Users

```sql
-- Developer test user (Google)
INSERT INTO users (user_id, oauth_provider, oauth_provider_id, email, display_name, created_at, last_login_at)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'google',
  'test_google_123',
  'developer@test.com',
  'Test Developer',
  NOW(),
  NOW()
);

-- Student test user (GitHub)
INSERT INTO users (user_id, oauth_provider, oauth_provider_id, email, display_name, created_at, last_login_at)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'github',
  'test_github_456',
  'student@test.com',
  'Test Student',
  NOW(),
  NOW()
);
```

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Complete