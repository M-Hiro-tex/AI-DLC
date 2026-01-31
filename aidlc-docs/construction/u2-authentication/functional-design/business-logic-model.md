# U2: Authentication Domain - Business Logic Model

## Overview

本ドキュメントでは、Authentication Domainのビジネスロジックとデータフローを詳細に定義します。

**Technology Stack**: Node.js + TypeScript + Express  
**Database**: RDS (Aurora Serverless PostgreSQL)  
**Token Strategy**: Hybrid (Access Token: JWT, Refresh Token: Opaque)

---

## OAuth Authentication Flow

### 1. Google OAuth Flow

```
+--------+                                    +------------+
| Client |                                    | Auth       |
| (SPA)  |                                    | Service    |
+--------+                                    +------------+
    |                                               |
    | 1. Request Google Login URL                   |
    |---------------------------------------------->|
    |                                               |
    |                                               | 2. Generate OAuth State Token
    |                                               | 3. Store State in Database
    |                                               |
    | 4. Return OAuth URL with State                |
    |<----------------------------------------------|
    |                                               |
    | 5. Redirect to Google OAuth                   |
    |-----------------+                             |
    |                 |                             |
    |                 v                             |
    |          +--------------+                     |
    |          | Google OAuth |                     |
    |          | Provider     |                     |
    |          +--------------+                     |
    |                 |                             |
    | 6. User Authenticates                         |
    | 7. Google Redirects with Auth Code            |
    |<----------------+                             |
    |                                               |
    | 8. Send Auth Code + State                     |
    |---------------------------------------------->|
    |                                               |
    |                                               | 9. Validate State Token
    |                                               | 10. Exchange Code for Access Token
    |                                               | 11. Fetch User Info from Google
    |                                               | 12. Create/Update User Profile
    |                                               | 13. Create Session
    |                                               | 14. Generate JWT Access Token
    |                                               | 15. Generate Opaque Refresh Token
    |                                               |
    | 16. Return Tokens                             |
    |<----------------------------------------------|
    |                                               |
```

#### Detailed Steps

**Step 1-4: Initiate OAuth Flow**
- Client requests OAuth login URL
- Server generates unique state token (UUID v4)
- State token stored in database with expiration (5 minutes)
- Server returns Google OAuth URL with state parameter

**Step 5-7: User Authentication**
- Client redirects user to Google OAuth consent screen
- User authenticates and grants permissions
- Google redirects back with authorization code and state

**Step 8-15: Token Exchange and Session Creation**
- Server validates state token matches stored value
- Server exchanges authorization code for Google access token
- Server fetches user information from Google People API
- Server creates or updates user profile in database
- Server creates new session record
- Server generates JWT access token (3 hour expiration)
- Server generates opaque refresh token (30 day expiration)

**Step 16: Return Authentication Result**
- Server returns both tokens to client
- Client stores tokens (access token in memory, refresh token in secure cookie)

---

### 2. GitHub OAuth Flow

```
Similar flow to Google OAuth with GitHub-specific endpoints:
- Authorization URL: https://github.com/login/oauth/authorize
- Token Exchange: https://github.com/login/oauth/access_token
- User Info: https://api.github.com/user
```

#### GitHub-Specific Considerations
- GitHub does not provide refresh tokens by default
- Access tokens are long-lived
- Email address may require additional API call if not public

---

## Session Management Logic

### Session Creation

```typescript
interface SessionCreationLogic {
  input: {
    userId: string
    oauthProvider: 'google' | 'github'
    oauthAccessToken: string
    clientInfo: {
      ipAddress: string
      userAgent: string
    }
  }
  
  process: {
    1. Generate unique session ID (UUID v4)
    2. Generate JWT access token with claims:
       - userId
       - sessionId
       - issued at (iat)
       - expiration (exp: 3 hours from now)
    3. Generate opaque refresh token (secure random 32 bytes, base64 encoded)
    4. Calculate token expiration timestamps
    5. Store session in database
  }
  
  output: {
    sessionId: string
    accessToken: string (JWT)
    refreshToken: string (Opaque)
    expiresIn: number (seconds until access token expires)
  }
}
```

### Session Validation

```typescript
interface SessionValidationLogic {
  input: {
    accessToken: string (JWT)
  }
  
  process: {
    1. Verify JWT signature using secret key
    2. Check token expiration (exp claim)
    3. Extract sessionId from token payload
    4. Query database for session record
    5. Check session is not revoked
    6. Check session not expired
    7. Update last accessed timestamp
  }
  
  output: {
    valid: boolean
    userId?: string
    sessionId?: string
    errorCode?: 'EXPIRED' | 'INVALID' | 'REVOKED' | 'NOT_FOUND'
  }
}
```

### Session Refresh

```typescript
interface SessionRefreshLogic {
  input: {
    refreshToken: string (Opaque)
  }
  
  process: {
    1. Query database for session by refresh token
    2. Validate session exists and not revoked
    3. Check refresh token not expired (30 days)
    4. Generate new JWT access token (same claims, new exp)
    5. Update session last accessed timestamp
    6. Optionally rotate refresh token (for security)
  }
  
  output: {
    accessToken: string (new JWT)
    refreshToken: string (same or rotated)
    expiresIn: number
  }
}
```

### Session Termination (Logout)

```typescript
interface SessionTerminationLogic {
  input: {
    accessToken: string (JWT)
  }
  
  process: {
    1. Extract sessionId from JWT
    2. Mark session as revoked in database
    3. Delete session record (or soft delete)
    4. Optionally invalidate associated refresh token
  }
  
  output: {
    success: boolean
  }
}
```

---

## User Profile Management Logic

### Profile Creation (First Login)

```typescript
interface ProfileCreationLogic {
  input: {
    oauthProvider: 'google' | 'github'
    oauthUserId: string
    oauthData: {
      email: string
      displayName: string
      profilePictureUrl?: string
    }
  }
  
  process: {
    1. Check if user already exists by oauth provider + oauth user ID
    2. If exists: Update last login timestamp, proceed to session creation
    3. If not exists:
       a. Validate email format
       b. Check email uniqueness (prevent duplicate accounts)
       c. Generate internal user ID (UUID v4)
       d. Create user record with:
          - userId
          - oauthProvider
          - oauthProviderId
          - email
          - displayName
          - profilePictureUrl
          - createdAt (current timestamp)
          - lastLoginAt (current timestamp)
  }
  
  output: {
    userId: string
    isNewUser: boolean
  }
}
```

### Profile Retrieval

```typescript
interface ProfileRetrievalLogic {
  input: {
    userId: string
  }
  
  process: {
    1. Query database for user by userId
    2. Return user profile data
  }
  
  output: {
    userId: string
    email: string
    displayName: string
    profilePictureUrl?: string
    oauthProvider: 'google' | 'github'
    createdAt: string (ISO 8601)
    lastLoginAt: string (ISO 8601)
  }
}
```

### Profile Auto-Update (Login Time)

```typescript
interface ProfileAutoUpdateLogic {
  input: {
    userId: string
    newOAuthData: {
      email: string
      displayName: string
      profilePictureUrl?: string
    }
  }
  
  process: {
    1. Query existing user profile
    2. Compare OAuth data with stored data
    3. If changed:
       a. Update email (if changed and unique)
       b. Update displayName (if changed)
       c. Update profilePictureUrl (if changed)
       d. Update lastLoginAt timestamp
    4. If not changed:
       a. Only update lastLoginAt timestamp
  }
  
  output: {
    updated: boolean
    updatedFields: string[]
  }
}
```

---

## OAuth Provider Data Mapping

### Google OAuth Data Mapping

```typescript
interface GoogleUserInfo {
  sub: string                    // Google User ID
  email: string
  email_verified: boolean
  name: string
  given_name: string
  family_name: string
  picture: string                // Profile picture URL
  locale: string
}

// Map to internal user profile
function mapGoogleUserData(googleUser: GoogleUserInfo): UserProfileData {
  return {
    oauthProviderId: googleUser.sub,
    email: googleUser.email,
    displayName: googleUser.name,
    profilePictureUrl: googleUser.picture
  }
}
```

### GitHub OAuth Data Mapping

```typescript
interface GitHubUserInfo {
  id: number                     // GitHub User ID
  login: string                  // GitHub username
  email: string | null           // May be null if private
  name: string | null
  avatar_url: string
  bio: string | null
}

// Map to internal user profile
function mapGitHubUserData(githubUser: GitHubUserInfo): UserProfileData {
  return {
    oauthProviderId: githubUser.id.toString(),
    email: githubUser.email || `${githubUser.login}@github.placeholder`,
    displayName: githubUser.name || githubUser.login,
    profilePictureUrl: githubUser.avatar_url
  }
}

// Note: If GitHub email is private, may need to fetch from separate endpoint
// GET https://api.github.com/user/emails
```

---

## Concurrent Session Handling

### Multiple Device Support

```typescript
interface ConcurrentSessionLogic {
  policy: 'UNLIMITED'  // Allow unlimited concurrent sessions
  
  process: {
    1. On new login:
       - Create new session record
       - Do NOT revoke existing sessions
    
    2. Session list per user:
       - User can have multiple active sessions
       - Each session tracked independently
    
    3. Individual session termination:
       - User can logout specific session
       - Other sessions remain active
    
    4. Logout all sessions:
       - Revoke all sessions for user
       - Clear all session records
  }
}
```

---

## Token Security

### JWT Access Token Structure

```typescript
interface JWTPayload {
  // Standard claims
  iss: string          // Issuer: "aidlc-auth-service"
  sub: string          // Subject: userId
  iat: number          // Issued at (Unix timestamp)
  exp: number          // Expiration (Unix timestamp, 3 hours from iat)
  
  // Custom claims
  sessionId: string    // Session identifier
  provider: 'google' | 'github'  // OAuth provider
}

// Signing algorithm: HS256 (HMAC with SHA-256)
// Secret key: Stored in environment variable (AWS Secrets Manager)
```

### Opaque Refresh Token Structure

```typescript
interface RefreshTokenGeneration {
  method: 'crypto.randomBytes'
  bytes: 32
  encoding: 'base64'
  
  // Example: "XJf8kP2mN9qR5vL3wE7sA1bC6dF4gH0iJ"
  
  storage: {
    hashedToken: string  // SHA-256 hash of token
    userId: string
    sessionId: string
    expiresAt: Date      // 30 days from creation
    createdAt: Date
  }
}
```

---

## Error Handling Logic

### OAuth Errors

```typescript
interface OAuthErrorHandling {
  errors: {
    'INVALID_STATE': {
      httpStatus: 400
      message: 'Invalid or expired state token'
      action: 'Redirect to login page'
    }
    'CODE_EXCHANGE_FAILED': {
      httpStatus: 500
      message: 'Failed to exchange authorization code'
      action: 'Display error message, allow retry'
    }
    'USER_INFO_FETCH_FAILED': {
      httpStatus: 500
      message: 'Failed to fetch user information'
      action: 'Display error message, allow retry'
    }
    'ACCESS_DENIED': {
      httpStatus: 403
      message: 'User denied authorization'
      action: 'Redirect to login page with message'
    }
  }
}
```

### Session Errors

```typescript
interface SessionErrorHandling {
  errors: {
    'TOKEN_EXPIRED': {
      httpStatus: 401
      message: 'Access token expired'
      action: 'Use refresh token to get new access token'
    }
    'INVALID_TOKEN': {
      httpStatus: 401
      message: 'Invalid or malformed token'
      action: 'Clear tokens, redirect to login'
    }
    'SESSION_REVOKED': {
      httpStatus: 401
      message: 'Session has been revoked'
      action: 'Clear tokens, redirect to login'
    }
    'REFRESH_TOKEN_EXPIRED': {
      httpStatus: 401
      message: 'Refresh token expired'
      action: 'Clear tokens, redirect to login'
    }
  }
}
```

---

## Data Flow Diagrams

### Complete Authentication Flow

```
User Action: Click "Login with Google"
    |
    v
[Frontend] Generate login request
    |
    v
[Auth Service] POST /api/auth/google/login
    |
    v
Generate state token --> Store in DB (expires in 5 min)
    |
    v
Return Google OAuth URL with state
    |
    v
[Frontend] Redirect to Google
    |
    v
[Google OAuth] User authenticates
    |
    v
[Google] Redirect to callback URL with code + state
    |
    v
[Auth Service] GET /api/auth/google/callback?code=XXX&state=YYY
    |
    v
Validate state token
    |
    v
Exchange code for Google access token
    |
    v
Fetch user info from Google API
    |
    v
Create/Update user profile in DB
    |
    v
Create session record in DB
    |
    v
Generate JWT access token
    |
    v
Generate opaque refresh token
    |
    v
Return tokens to frontend
    |
    v
[Frontend] Store tokens (memory + secure cookie)
    |
    v
User authenticated
```

---

## Performance Considerations

### Database Query Optimization
- Index on userId for fast user lookup
- Index on sessionId for fast session lookup
- Index on refreshToken (hashed) for token validation
- Index on oauthProvider + oauthProviderId for OAuth lookup

### Token Validation Caching
- Cache JWT public key for signature verification
- Cache user profile data with TTL (5 minutes)
- Use database connection pooling for RDS

---

**Document Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Complete