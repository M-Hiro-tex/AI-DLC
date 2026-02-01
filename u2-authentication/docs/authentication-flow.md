# U2 Authentication Service - Authentication Flow Documentation

This document describes the authentication and session management flows in the U2 Authentication Service.

---

## Table of Contents

1. [OAuth 2.0 Login Flow](#oauth-20-login-flow)
2. [Session Management Flow](#session-management-flow)
3. [Token Refresh Flow](#token-refresh-flow)
4. [Logout Flow](#logout-flow)
5. [Security Considerations](#security-considerations)
6. [Error Handling](#error-handling)

---

## OAuth 2.0 Login Flow

### Google OAuth Flow

```
+----------+                                           +-------------+
|          |                                           |             |
|  Client  |                                           | U2 Service  |
|   (UI)   |                                           |  (Backend)  |
|          |                                           |             |
+----+-----+                                           +------+------+
     |                                                        |
     | 1. POST /api/v1/auth/google/login                     |
     |------------------------------------------------------->|
     |                                                        |
     |                                                        | 2. Generate state token
     |                                                        | 3. Store in oauth_states table
     |                                                        |
     | 4. { authUrl, provider, expiresAt }                   |
     |<-------------------------------------------------------|
     |                                                        |
     | 5. Redirect to Google OAuth                           |
     |-------------------------------------------------------->
     |                                                        |
     |                        +-------------------+           |
     |                        |                   |           |
     |                        | Google OAuth      |           |
     |                        | Authorization     |           |
     |                        |                   |           |
     |                        +--------+----------+           |
     |                                 |                      |
     | 6. User authenticates           |                      |
     |    and approves                 |                      |
     |<--------------------------------+                      |
     |                                                        |
     | 7. Redirect to callback with code & state             |
     |------------------------------------------------------->|
     |                   GET /api/v1/auth/google/callback    |
     |                                                        |
     |                                                        | 8. Validate state token
     |                                                        | 9. Exchange code for token
     |                                                        | 10. Fetch user info
     |                                                        | 11. Create/update user
     |                                                        | 12. Create session
     |                                                        | 13. Generate JWT
     |                                                        | 14. Generate refresh token
     |                                                        |
     | 15. { accessToken, refreshToken, user, expiresAt }    |
     |<-------------------------------------------------------|
     |                                                        |
     | 16. Store tokens securely                             |
     |                                                        |
     | 17. Access protected resources                        |
     |    Authorization: Bearer <accessToken>                |
     |------------------------------------------------------->|
     |                                                        |
     | 18. { resource data }                                 |
     |<-------------------------------------------------------|
     |                                                        |
+----+-----+                                           +------+------+
```

### Key Steps Explained

1. **Client initiates login**: User clicks "Login with Google" button
2. **Generate state token**: Backend creates CSRF protection token
3. **Store state**: Token stored in database with expiration (5 minutes)
4. **Return auth URL**: Client receives Google authorization URL
5. **Redirect to Google**: User redirected to Google login page
6. **User authenticates**: User logs in with Google credentials
7. **OAuth callback**: Google redirects back with authorization code
8. **Validate state**: Backend verifies CSRF token matches
9. **Exchange code**: Trade authorization code for access token
10. **Fetch user info**: Get user profile from Google API
11. **Create/update user**: Store user in database
12. **Create session**: Generate new session record
13. **Generate JWT**: Create access token (1 hour expiration)
14. **Generate refresh token**: Create opaque refresh token (7 days)
15. **Return tokens**: Send tokens and user data to client
16. **Store tokens**: Client stores in secure storage
17-18. **Use tokens**: Client includes JWT in subsequent requests

---

## Session Management Flow

### Session Creation

When a user successfully completes OAuth login:

```
Database Actions:
1. INSERT INTO users (email, display_name, ...)
   OR UPDATE users SET last_login_at = NOW()
   
2. INSERT INTO sessions (
     session_id,
     user_id,
     refresh_token_hash,
     expires_at,
     user_agent,
     ip_address
   )
   
3. RETURN session_id, expires_at
```

**Session Properties**:
- **Session ID**: UUID v4
- **Refresh Token**: Cryptographically secure random 32-byte string
- **Refresh Token Hash**: SHA-256 hash of refresh token
- **Expiration**: 7 days from creation
- **Metadata**: User agent, IP address for security audit

### Session Validation

Every protected endpoint validates the session:

```
+----------+                                           +-------------+
|  Client  |                                           | U2 Service  |
+----+-----+                                           +------+------+
     |                                                        |
     | GET /api/v1/users/me                                  |
     | Authorization: Bearer <JWT>                           |
     |------------------------------------------------------->|
     |                                                        |
     |                                                        | 1. Extract JWT
     |                                                        | 2. Verify signature
     |                                                        | 3. Check expiration
     |                                                        | 4. Extract userId
     |                                                        |    and sessionId
     |                                                        | 5. Query session
     |                                                        | 6. Verify not revoked
     |                                                        | 7. Update last_accessed
     |                                                        | 8. Process request
     |                                                        |
     | 9. { user data }                                      |
     |<-------------------------------------------------------|
     |                                                        |
+----+-----+                                           +------+------+
```

**Validation Steps**:
1. Extract JWT from Authorization header
2. Verify JWT signature using secret key
3. Check JWT hasn't expired
4. Extract userId and sessionId from payload
5. Query sessions table for sessionId
6. Verify session is not revoked (revoked_at IS NULL)
7. Update last_accessed_at timestamp
8. Attach user to request object for controllers

---

## Token Refresh Flow

When access token expires (after 1 hour):

```
+----------+                                           +-------------+
|  Client  |                                           | U2 Service  |
+----+-----+                                           +------+------+
     |                                                        |
     | 1. GET /api/v1/users/me                               |
     |    Authorization: Bearer <expired_JWT>                |
     |------------------------------------------------------->|
     |                                                        |
     |                                                        | 2. JWT expired error
     |                                                        |
     | 3. 401 Unauthorized                                   |
     |    { code: "UNAUTHORIZED", reason: "token_expired" }  |
     |<-------------------------------------------------------|
     |                                                        |
     | 4. POST /api/v1/auth/refresh                          |
     |    { refreshToken, sessionId }                        |
     |------------------------------------------------------->|
     |                                                        |
     |                                                        | 5. Hash refresh token
     |                                                        | 6. Query session by ID
     |                                                        | 7. Compare token hashes
     |                                                        | 8. Check not revoked
     |                                                        | 9. Check not expired
     |                                                        | 10. Generate new JWT
     |                                                        | 11. Generate new refresh
     |                                                        | 12. Update session record
     |                                                        |
     | 13. { accessToken, refreshToken, expiresAt }          |
     |<-------------------------------------------------------|
     |                                                        |
     | 14. Store new tokens                                  |
     |                                                        |
     | 15. Retry original request                            |
     |    Authorization: Bearer <new_JWT>                    |
     |------------------------------------------------------->|
     |                                                        |
     | 16. { user data }                                     |
     |<-------------------------------------------------------|
     |                                                        |
+----+-----+                                           +------+------+
```

**Token Rotation**:
- Old refresh token is invalidated
- New refresh token is generated
- New JWT is issued with fresh expiration
- Session record is updated with new refresh token hash

**Security Benefits**:
- Limits damage if refresh token is compromised
- Provides audit trail of token usage
- Enables detection of token theft

---

## Logout Flow

### Single Session Logout

```
+----------+                                           +-------------+
|  Client  |                                           | U2 Service  |
+----+-----+                                           +------+------+
     |                                                        |
     | POST /api/v1/auth/logout                              |
     | Authorization: Bearer <JWT>                           |
     | { sessionId }                                         |
     |------------------------------------------------------->|
     |                                                        |
     |                                                        | 1. Validate JWT
     |                                                        | 2. Extract userId
     |                                                        | 3. Verify session
     |                                                        |    belongs to user
     |                                                        | 4. UPDATE sessions
     |                                                        |    SET revoked_at = NOW()
     |                                                        |    WHERE session_id = ?
     |                                                        |
     | 5. { message: "Session terminated" }                  |
     |<-------------------------------------------------------|
     |                                                        |
     | 6. Clear local tokens                                 |
     |                                                        |
     | 7. Redirect to login page                             |
     |                                                        |
+----+-----+                                           +------+------+
```

### Logout All Sessions

```
+----------+                                           +-------------+
|  Client  |                                           | U2 Service  |
+----+-----+                                           +------+------+
     |                                                        |
     | POST /api/v1/auth/logout-all                          |
     | Authorization: Bearer <JWT>                           |
     |------------------------------------------------------->|
     |                                                        |
     |                                                        | 1. Validate JWT
     |                                                        | 2. Extract userId
     |                                                        | 3. UPDATE sessions
     |                                                        |    SET revoked_at = NOW()
     |                                                        |    WHERE user_id = ?
     |                                                        |    AND revoked_at IS NULL
     |                                                        | 4. Count affected rows
     |                                                        |
     | 5. { message: "All sessions terminated", count: 3 }   |
     |<-------------------------------------------------------|
     |                                                        |
     | 6. Clear local tokens                                 |
     |                                                        |
     | 7. Redirect to login page                             |
     |                                                        |
+----+-----+                                           +------+------+
```

---

## Security Considerations

### State Token (CSRF Protection)

**Purpose**: Prevent Cross-Site Request Forgery attacks

**Implementation**:
- Generate cryptographically secure random 32-byte string
- Store in database with 5-minute expiration
- Include in OAuth authorization URL
- Validate on callback that state matches stored value
- Mark state as "used" after successful validation
- Delete expired states periodically

**Attack Prevention**:
- Attacker cannot guess state token
- Attacker cannot reuse old state tokens
- Attacker cannot bypass state validation

### Refresh Token Security

**Storage**:
- Never store refresh token in plain text
- Always store SHA-256 hash in database
- Client stores refresh token in secure storage only

**Validation**:
- Hash incoming refresh token before comparison
- Use constant-time comparison to prevent timing attacks
- Verify session not revoked before accepting

**Rotation**:
- Generate new refresh token on every refresh
- Invalidate old refresh token immediately
- Prevents token reuse attacks

### JWT Security

**Best Practices**:
- Short expiration (1 hour)
- Include minimal claims (userId, sessionId, role)
- Sign with HS256 algorithm
- Store secret in AWS Secrets Manager
- Rotate signing key periodically

**Validation**:
- Verify signature on every request
- Check expiration timestamp
- Validate session still active in database
- Reject if session revoked

### Session Security

**Features**:
- Session timeout after 7 days
- Track last accessed timestamp
- Store user agent and IP for audit
- Support session revocation
- Periodic cleanup of expired sessions

**Monitoring**:
- Log all authentication events
- Alert on suspicious activity (multiple failed logins)
- Track session creation patterns
- Monitor refresh token usage

### Rate Limiting

**Protection Against**:
- Brute force attacks on OAuth endpoints
- Token enumeration attempts
- Denial of service attacks

**Implementation**:
- IP-based rate limiting for login endpoints
- User-based rate limiting for authenticated endpoints
- Session-based rate limiting for refresh endpoint
- Progressive backoff for repeated failures

---

## Error Handling

### OAuth Errors

**State Validation Failure**:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid or expired state token",
    "timestamp": "2026-02-01T10:00:00.000Z"
  }
}
```

**OAuth Provider Error**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "OAuth provider authentication failed",
    "details": {
      "provider": "google",
      "reason": "access_denied"
    },
    "timestamp": "2026-02-01T10:00:00.000Z"
  }
}
```

### Token Errors

**Expired Access Token**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token has expired",
    "details": {
      "reason": "token_expired",
      "expiredAt": "2026-02-01T09:00:00.000Z"
    },
    "timestamp": "2026-02-01T10:00:00.000Z"
  }
}
```

**Invalid Refresh Token**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired refresh token",
    "details": {
      "reason": "token_invalid"
    },
    "timestamp": "2026-02-01T10:00:00.000Z"
  }
}
```

**Revoked Session**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Session has been revoked",
    "details": {
      "reason": "session_revoked",
      "revokedAt": "2026-02-01T08:00:00.000Z"
    },
    "timestamp": "2026-02-01T10:00:00.000Z"
  }
}
```

### Rate Limit Errors

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60,
      "limit": 10,
      "remaining": 0
    },
    "timestamp": "2026-02-01T10:00:00.000Z"
  }
}
```

---

## Client Implementation Guide

### Storing Tokens

**Recommended Approach**:
```javascript
// Store tokens in httpOnly cookies (most secure)
// Backend sets cookies with Secure and SameSite flags
// Client automatically includes cookies in requests

// Alternative: Secure localStorage (if cookies not possible)
const tokens = {
  accessToken: 'jwt_token_here',
  refreshToken: 'refresh_token_here',
  expiresAt: '2026-02-01T10:00:00.000Z'
};
localStorage.setItem('auth_tokens', JSON.stringify(tokens));
```

### Making Authenticated Requests

```javascript
async function fetchProtectedResource() {
  const tokens = JSON.parse(localStorage.getItem('auth_tokens'));
  
  const response = await fetch('/api/v1/users/me', {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`
    }
  });
  
  if (response.status === 401) {
    // Token expired, refresh it
    const newTokens = await refreshTokens();
    // Retry request with new token
    return fetchProtectedResource();
  }
  
  return response.json();
}
```

### Token Refresh Logic

```javascript
async function refreshTokens() {
  const tokens = JSON.parse(localStorage.getItem('auth_tokens'));
  
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken: tokens.refreshToken,
      sessionId: tokens.sessionId
    })
  });
  
  if (!response.ok) {
    // Refresh failed, redirect to login
    window.location.href = '/login';
    return;
  }
  
  const newTokens = await response.json();
  localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
  return newTokens;
}
```

---

**Last Updated**: 2026-02-01  
**Maintained by**: U2 Authentication Team