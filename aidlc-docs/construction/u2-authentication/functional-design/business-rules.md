# U2: Authentication Domain - Business Rules

## Overview

本ドキュメントでは、Authentication Domainにおけるビジネスルール、検証ロジック、セキュリティポリシーを定義します。

**Technology Stack**: Node.js + TypeScript + Express  
**Database**: RDS (Aurora Serverless PostgreSQL)

---

## OAuth Authentication Rules

### Rule 1: OAuth Provider Support
**Rule ID**: AUTH-OAUTH-001  
**Description**: サポートされるOAuthプロバイダー

**Rule**:
- MVP Phase: Google OAuth 2.0 および GitHub OAuth 2.0をサポート
- Future: Apple Sign-In統合を追加予定
- Unsupported providers: Reject with error message

**Implementation**:
```typescript
const SUPPORTED_PROVIDERS = ['google', 'github'] as const
type OAuthProvider = typeof SUPPORTED_PROVIDERS[number]

function isSupportedProvider(provider: string): provider is OAuthProvider {
  return SUPPORTED_PROVIDERS.includes(provider as OAuthProvider)
}
```

**Error Handling**:
- Unsupported provider → 400 Bad Request
- Error message: "OAuth provider '{provider}' is not supported"

---

### Rule 2: State Token Validation
**Rule ID**: AUTH-OAUTH-002  
**Description**: OAuth state tokenのセキュリティ検証

**Rule**:
- State tokenは一意（UUID v4）
- State tokenは5分間有効
- State tokenは1回のみ使用可能
- State tokenの検証が必須（CSRF protection）

**Validation Logic**:
```typescript
interface StateTokenValidation {
  checks: [
    'Token exists in database',
    'Token not expired (< 5 minutes)',
    'Token not already used',
    'Token matches callback parameter'
  ]
  
  onSuccess: 'Mark token as used, proceed with OAuth flow'
  onFailure: 'Reject with INVALID_STATE error'
}
```

**Error Handling**:
- Invalid state → 400 Bad Request
- Expired state → 400 Bad Request with "State token expired"
- Used state → 400 Bad Request with "State token already used"

---

### Rule 3: Authorization Code Validation
**Rule ID**: AUTH-OAUTH-003  
**Description**: OAuth authorization codeの検証

**Rule**:
- Authorization code must be present in callback
- Authorization code exchanged immediately for access token
- Authorization code used only once
- Exchange must complete within 10 seconds

**Validation Logic**:
```typescript
function validateAuthorizationCode(code: string): boolean {
  return (
    code !== null &&
    code !== undefined &&
    code.length > 0 &&
    /^[A-Za-z0-9_-]+$/.test(code)  // Alphanumeric + _ and -
  )
}
```

**Error Handling**:
- Missing code → 400 Bad Request
- Invalid code format → 400 Bad Request
- Exchange failure → 500 Internal Server Error (retry allowed)

---

### Rule 4: OAuth User Information Mapping
**Rule ID**: AUTH-OAUTH-004  
**Description**: OAuthプロバイダーからのユーザー情報マッピング

**Rule**:
- **Google**: Require email_verified = true
- **GitHub**: If email is private, use fallback strategy
- **Required fields**: email, displayName
- **Optional fields**: profilePictureUrl

**Mapping Rules**:
```typescript
interface UserInfoMappingRules {
  google: {
    required: ['sub', 'email', 'email_verified', 'name']
    emailVerificationRequired: true
    fallbackDisplayName: 'email'
  }
  
  github: {
    required: ['id', 'login']
    emailFallback: '{login}@github.placeholder'
    displayNameFallback: 'login'
  }
}
```

**Error Handling**:
- Missing required fields → 500 Internal Server Error
- Email not verified (Google) → 403 Forbidden with "Email not verified"
- Invalid user data → 500 Internal Server Error

---

## Session Management Rules

### Rule 5: Token Expiration Policy
**Rule ID**: AUTH-SESSION-001  
**Description**: トークンの有効期限ポリシー

**Rule**:
- **Access Token (JWT)**: 3 hours from issuance
- **Refresh Token (Opaque)**: 30 days from issuance
- Tokens cannot be extended beyond expiration
- Expired tokens must be rejected

**Implementation**:
```typescript
const TOKEN_EXPIRATION = {
  ACCESS_TOKEN: 3 * 60 * 60,      // 3 hours in seconds
  REFRESH_TOKEN: 30 * 24 * 60 * 60 // 30 days in seconds
} as const

function calculateExpiration(tokenType: 'access' | 'refresh'): Date {
  const now = new Date()
  const expirationSeconds = tokenType === 'access' 
    ? TOKEN_EXPIRATION.ACCESS_TOKEN 
    : TOKEN_EXPIRATION.REFRESH_TOKEN
  
  return new Date(now.getTime() + expirationSeconds * 1000)
}
```

**Validation Rules**:
- Check `exp` claim in JWT
- Compare current time with expiration timestamp
- Reject if current time >= expiration time

---

### Rule 6: Session Concurrency Policy
**Rule ID**: AUTH-SESSION-002  
**Description**: 複数デバイスからの同時ログインポリシー

**Rule**:
- Unlimited concurrent sessions per user
- Each device/browser gets independent session
- New login does NOT revoke existing sessions
- User can manually logout specific sessions
- User can logout all sessions at once

**Implementation**:
```typescript
interface ConcurrentSessionRules {
  maxSessionsPerUser: null  // Unlimited
  revokeOnNewLogin: false
  allowIndependentLogout: true
  allowLogoutAll: true
}
```

**Session Tracking**:
- Each session tracked with unique sessionId
- Session metadata includes:
  - Device info (user agent)
  - IP address
  - Last accessed timestamp
  - Creation timestamp

---

### Rule 7: Session Refresh Policy
**Rule ID**: AUTH-SESSION-003  
**Description**: セッションリフレッシュのポリシー

**Rule**:
- Refresh token can be used multiple times within validity period
- Each refresh generates new access token
- Refresh token optionally rotated (for enhanced security)
- Refresh token rotation: Generate new refresh token on each use
- Old refresh token invalidated after rotation

**Refresh Token Rotation** (Optional, configurable):
```typescript
const REFRESH_TOKEN_ROTATION_ENABLED = false  // MVP: Disabled

interface RefreshTokenRotationRule {
  enabled: boolean
  
  ifEnabled: {
    onRefresh: [
      'Generate new refresh token',
      'Invalidate old refresh token',
      'Update session record with new token',
      'Return new access token + new refresh token'
    ]
  }
  
  ifDisabled: {
    onRefresh: [
      'Generate new access token',
      'Keep same refresh token',
      'Update session last accessed timestamp',
      'Return new access token + same refresh token'
    ]
  }
}
```

---

### Rule 8: Session Revocation
**Rule ID**: AUTH-SESSION-004  
**Description**: セッション無効化のルール

**Rule**:
- User can explicitly logout (revoke session)
- Admin can revoke user sessions (Post-MVP)
- Expired sessions automatically cleaned up
- Revoked sessions cannot be restored

**Revocation Methods**:
```typescript
interface SessionRevocationRules {
  methods: {
    userLogout: {
      scope: 'single session'
      trigger: 'User clicks logout button'
      action: 'Delete session record from database'
    }
    
    logoutAllSessions: {
      scope: 'all user sessions'
      trigger: 'User clicks "logout all devices"'
      action: 'Delete all session records for user'
    }
    
    expiration: {
      scope: 'expired sessions'
      trigger: 'Background cleanup job (daily)'
      action: 'Delete sessions where expiresAt < now()'
    }
  }
}
```

---

## User Profile Rules

### Rule 9: Email Uniqueness
**Rule ID**: AUTH-PROFILE-001  
**Description**: メールアドレスの一意性制約

**Rule**:
- Each email address can be associated with only one user
- Duplicate emails rejected during account creation
- OAuth provider changes (e.g., changing Google email) trigger validation
- Case-insensitive email comparison

**Validation Logic**:
```typescript
async function validateEmailUniqueness(
  email: string, 
  excludeUserId?: string
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim()
  
  const existingUser = await database.query(
    'SELECT user_id FROM users WHERE LOWER(email) = $1 AND user_id != $2',
    [normalizedEmail, excludeUserId || '']
  )
  
  return existingUser.rows.length === 0
}
```

**Error Handling**:
- Duplicate email → 409 Conflict
- Error message: "Email address already in use"

---

### Rule 10: Profile Auto-Update Policy
**Rule ID**: AUTH-PROFILE-002  
**Description**: ログイン時のプロファイル自動更新ポリシー

**Rule**:
- On each login, fetch latest OAuth user data
- Always update user profile with latest data from OAuth provider
- Update fields: email, displayName, profilePictureUrl
- Exception: If new email violates uniqueness, keep old email and log warning
- Always update lastLoginAt timestamp

**Update Logic**:
```typescript
interface ProfileAutoUpdateRule {
  trigger: 'Every successful OAuth login'
  
  updateFields: [
    'email (with uniqueness check)',
    'displayName',
    'profilePictureUrl',
    'lastLoginAt'
  ]
  
  emailUpdateException: {
    condition: 'New email already exists for another user'
    action: 'Keep old email, log warning, continue authentication'
  }
}
```

---

### Rule 11: Profile Required Fields
**Rule ID**: AUTH-PROFILE-003  
**Description**: ユーザープロファイル必須フィールド

**Rule**:
- **Required fields**:
  - userId (UUID v4, generated)
  - oauthProvider ('google' | 'github')
  - oauthProviderId (from OAuth provider)
  - email
  - displayName
  - createdAt (ISO 8601 timestamp)
  - lastLoginAt (ISO 8601 timestamp)

- **Optional fields**:
  - profilePictureUrl

**Validation Logic**:
```typescript
interface UserProfileValidation {
  userId: 'UUID v4 format'
  oauthProvider: 'Enum: google | github'
  oauthProviderId: 'String, length > 0'
  email: 'Valid email format, RFC 5322'
  displayName: 'String, length 1-100'
  profilePictureUrl: 'Valid URL or null'
  createdAt: 'ISO 8601 timestamp'
  lastLoginAt: 'ISO 8601 timestamp'
}
```

---

## Security Rules

### Rule 12: Rate Limiting - IP-based
**Rule ID**: AUTH-SECURITY-001  
**Description**: IP単位のレート制限

**Rule**:
- OAuth login attempts: Maximum 10 per hour per IP address
- Token refresh: Maximum 60 per hour per IP address
- Session validation: Maximum 300 per hour per IP address
- Rate limit reset: Every 1 hour (rolling window)

**Implementation**:
```typescript
interface IPRateLimitRules {
  endpoints: {
    '/api/auth/*/login': {
      limit: 10
      window: '1 hour'
      identifier: 'IP address'
    }
    
    '/api/auth/refresh': {
      limit: 60
      window: '1 hour'
      identifier: 'IP address'
    }
    
    '/api/auth/session': {
      limit: 300
      window: '1 hour'
      identifier: 'IP address'
    }
  }
  
  onExceeded: {
    httpStatus: 429
    message: 'Too many requests. Please try again later.'
    retryAfter: 'seconds until window resets'
  }
}
```

---

### Rule 13: Rate Limiting - User-based
**Rule ID**: AUTH-SECURITY-002  
**Description**: ユーザー単位のレート制限

**Rule**:
- OAuth login attempts: Maximum 5 per hour per user (by email)
- Token refresh: Maximum 30 per hour per user
- Profile updates: Maximum 10 per hour per user

**Implementation**:
```typescript
interface UserRateLimitRules {
  endpoints: {
    '/api/auth/*/login': {
      limit: 5
      window: '1 hour'
      identifier: 'Email address'
    }
    
    '/api/auth/refresh': {
      limit: 30
      window: '1 hour'
      identifier: 'User ID from refresh token'
    }
    
    '/api/users/*': {
      limit: 10
      window: '1 hour'
      identifier: 'User ID from access token'
    }
  }
}
```

---

### Rule 14: JWT Signing and Verification
**Rule ID**: AUTH-SECURITY-003  
**Description**: JWT署名と検証のセキュリティルール

**Rule**:
- Signing algorithm: HS256 (HMAC with SHA-256)
- Secret key: Stored in AWS Secrets Manager
- Secret key rotation: Every 90 days (Post-MVP)
- Token signature must be verified on every validation

**JWT Security Rules**:
```typescript
interface JWTSecurityRules {
  algorithm: 'HS256'
  secretKeySource: 'AWS Secrets Manager'
  secretKeyRotation: {
    enabled: false  // MVP: Disabled, Post-MVP: Enable
    frequency: '90 days'
  }
  
  validation: {
    verifySignature: true
    verifyExpiration: true
    verifyIssuer: true
    requiredClaims: ['sub', 'iat', 'exp', 'sessionId', 'provider']
  }
  
  generation: {
    issuer: 'aidlc-auth-service'
    audience: 'aidlc-frontend'
  }
}
```

---

### Rule 15: Refresh Token Storage Security
**Rule ID**: AUTH-SECURITY-004  
**Description**: リフレッシュトークンの安全な保存

**Rule**:
- Refresh tokens stored as SHA-256 hash in database
- Original token never stored in plain text
- Token comparison using hash comparison
- Token transmitted over HTTPS only

**Storage Rules**:
```typescript
interface RefreshTokenStorageRules {
  storage: {
    format: 'SHA-256 hash'
    algorithm: 'crypto.createHash("sha256")'
    encoding: 'hex'
  }
  
  transmission: {
    protocol: 'HTTPS only'
    header: 'Set-Cookie with Secure, HttpOnly, SameSite=Strict flags'
  }
  
  validation: {
    method: 'Hash incoming token and compare with stored hash'
    timing: 'Use constant-time comparison to prevent timing attacks'
  }
}
```

---

### Rule 16: HTTPS-Only Communication
**Rule ID**: AUTH-SECURITY-005  
**Description**: HTTPS必須の通信ルール

**Rule**:
- All authentication endpoints require HTTPS
- HTTP requests automatically redirected to HTTPS
- OAuth redirect URIs must be HTTPS
- Cookies use Secure flag

**Implementation**:
```typescript
interface HTTPSEnforcementRules {
  enforcement: {
    production: 'Strict - reject HTTP'
    development: 'Relaxed - allow HTTP for localhost'
  }
  
  redirectURIs: {
    allowed: ['https://*']
    blocked: ['http://* (except localhost in dev)']
  }
  
  cookies: {
    flags: ['Secure', 'HttpOnly', 'SameSite=Strict']
    requireHTTPS: true
  }
}
```

---

## Validation Rules

### Rule 17: Email Format Validation
**Rule ID**: AUTH-VALIDATION-001  
**Description**: メールアドレス形式の検証

**Rule**:
- Email must match RFC 5322 format
- Email length: 5-255 characters
- Case-insensitive storage (lowercase)
- Trim whitespace before validation

**Validation Logic**:
```typescript
function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const trimmedEmail = email.trim()
  
  return (
    trimmedEmail.length >= 5 &&
    trimmedEmail.length <= 255 &&
    emailRegex.test(trimmedEmail)
  )
}
```

---

### Rule 18: Display Name Validation
**Rule ID**: AUTH-VALIDATION-002  
**Description**: 表示名の検証

**Rule**:
- Length: 1-100 characters
- Allowed characters: Unicode letters, numbers, spaces, hyphens, underscores
- Cannot be only whitespace
- Trim leading/trailing whitespace

**Validation Logic**:
```typescript
function validateDisplayName(name: string): boolean {
  const trimmedName = name.trim()
  
  return (
    trimmedName.length >= 1 &&
    trimmedName.length <= 100 &&
    /^[\p{L}\p{N}\s\-_]+$/u.test(trimmedName)
  )
}
```

---

### Rule 19: Token Format Validation
**Rule ID**: AUTH-VALIDATION-003  
**Description**: トークン形式の検証

**Rule**:
- **JWT Access Token**: Must match JWT format (header.payload.signature)
- **Opaque Refresh Token**: Base64 string, 32-64 characters
- Token must not contain whitespace
- Token must not be empty

**Validation Logic**:
```typescript
function validateJWTFormat(token: string): boolean {
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/
  return jwtRegex.test(token)
}

function validateRefreshTokenFormat(token: string): boolean {
  return (
    /^[A-Za-z0-9+/=]+$/.test(token) &&
    token.length >= 32 &&
    token.length <= 64
  )
}
```

---

## Error Handling Rules

### Rule 20: Error Response Format
**Rule ID**: AUTH-ERROR-001  
**Description**: エラーレスポンスの統一フォーマット

**Rule**:
- All errors return consistent JSON structure
- Include error code, message, timestamp
- Include request ID for tracing
- Do not expose sensitive information

**Error Response Format**:
```typescript
interface ErrorResponse {
  error: {
    code: string              // e.g., "INVALID_TOKEN"
    message: string           // User-friendly message
    details?: any             // Optional additional details
    timestamp: string         // ISO 8601 timestamp
    requestId: string         // Unique request identifier
  }
}
```

**Example**:
```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Access token has expired. Please refresh your token.",
    "timestamp": "2026-02-01T12:30:00Z",
    "requestId": "req_abc123xyz"
  }
}
```

---

## Audit and Logging Rules

### Rule 21: Security Event Logging
**Rule ID**: AUTH-AUDIT-001  
**Description**: セキュリティイベントのログ記録

**Rule**:
- Log all authentication attempts (success and failure)
- Log all token refresh requests
- Log all session terminations
- Log rate limit violations
- Do NOT log sensitive data (passwords, tokens, secrets)

**Logged Events**:
```typescript
interface SecurityEventLogging {
  events: {
    authAttempt: {
      level: 'INFO'
      data: ['userId', 'provider', 'ipAddress', 'timestamp', 'success']
    }
    
    authFailure: {
      level: 'WARNING'
      data: ['provider', 'ipAddress', 'errorCode', 'timestamp']
    }
    
    tokenRefresh: {
      level: 'INFO'
      data: ['userId', 'sessionId', 'ipAddress', 'timestamp']
    }
    
    sessionRevoked: {
      level: 'INFO'
      data: ['userId', 'sessionId', 'reason', 'timestamp']
    }
    
    rateLimitViolation: {
      level: 'WARNING'
      data: ['ipAddress', 'endpoint', 'limit', 'timestamp']
    }
  }
}
```

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Complete