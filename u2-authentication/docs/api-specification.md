# U2 Authentication Service - API Specification

**Version**: 1.0.0  
**Base URL**: `/api/v1`  
**Protocol**: HTTPS  
**Authentication**: Bearer Token (JWT)

---

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [User Profile Endpoints](#user-profile-endpoints)
3. [Health Check Endpoints](#health-check-endpoints)
4. [Data Models](#data-models)
5. [Error Responses](#error-responses)

---

## Authentication Endpoints

### 1. Initiate Google OAuth Login

**Endpoint**: `POST /auth/google/login`  
**Authentication**: None  
**Rate Limit**: 10 requests/minute per IP

**Description**: Initiates Google OAuth 2.0 authorization flow by generating authorization URL with state token.

**Request Body**: None

**Response**: `200 OK`

```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&state=...",
  "provider": "google",
  "expiresAt": "2026-02-01T10:00:00.000Z"
}
```

**Error Responses**:
- `500 Internal Server Error` - OAuth service error
- `429 Too Many Requests` - Rate limit exceeded

---

### 2. Handle Google OAuth Callback

**Endpoint**: `GET /auth/google/callback`  
**Authentication**: None  
**Rate Limit**: 20 requests/minute per IP

**Description**: Processes Google OAuth callback, exchanges authorization code for tokens, creates user session.

**Query Parameters**:
- `code` (required): Authorization code from Google
- `state` (required): State token generated in login initiation

**Response**: `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": "2026-02-01T11:00:00.000Z",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "role": "student",
    "provider": "google",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Missing or invalid code/state
- `401 Unauthorized` - OAuth provider error or invalid credentials
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 3. Initiate GitHub OAuth Login

**Endpoint**: `POST /auth/github/login`  
**Authentication**: None  
**Rate Limit**: 10 requests/minute per IP

**Description**: Initiates GitHub OAuth 2.0 authorization flow.

**Request Body**: None

**Response**: `200 OK`

```json
{
  "authUrl": "https://github.com/login/oauth/authorize?client_id=...&state=...",
  "provider": "github",
  "expiresAt": "2026-02-01T10:00:00.000Z"
}
```

**Error Responses**:
- `500 Internal Server Error` - OAuth service error
- `429 Too Many Requests` - Rate limit exceeded

---

### 4. Handle GitHub OAuth Callback

**Endpoint**: `GET /auth/github/callback`  
**Authentication**: None  
**Rate Limit**: 20 requests/minute per IP

**Description**: Processes GitHub OAuth callback and creates user session.

**Query Parameters**:
- `code` (required): Authorization code from GitHub
- `state` (required): State token generated in login initiation

**Response**: `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": "2026-02-01T11:00:00.000Z",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "role": "student",
    "provider": "github",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Missing or invalid code/state
- `401 Unauthorized` - OAuth provider error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 5. Refresh Access Token

**Endpoint**: `POST /auth/refresh`  
**Authentication**: None (uses refresh token)  
**Rate Limit**: 30 requests/minute per session

**Description**: Refreshes expired access token using refresh token.

**Request Body**:

```json
{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response**: `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "660e8400-e29b-41d4-a716-446655440001",
  "expiresAt": "2026-02-01T12:00:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request` - Missing refresh token or session ID
- `401 Unauthorized` - Invalid or expired refresh token
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 6. Logout (Revoke Current Session)

**Endpoint**: `POST /auth/logout`  
**Authentication**: Required (Bearer Token)  
**Rate Limit**: 10 requests/minute per user

**Description**: Revokes the current user session.

**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Request Body**:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response**: `200 OK`

```json
{
  "message": "Session terminated successfully"
}
```

**Error Responses**:
- `400 Bad Request` - Missing session ID
- `401 Unauthorized` - Invalid or expired token
- `404 Not Found` - Session not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 7. Logout All Sessions

**Endpoint**: `POST /auth/logout-all`  
**Authentication**: Required (Bearer Token)  
**Rate Limit**: 5 requests/minute per user

**Description**: Revokes all active sessions for the current user.

**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Request Body**: None

**Response**: `200 OK`

```json
{
  "message": "All sessions terminated successfully",
  "count": 3
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or expired token
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## User Profile Endpoints

### 8. Get Current User Profile

**Endpoint**: `GET /users/me`  
**Authentication**: Required (Bearer Token)  
**Rate Limit**: 60 requests/minute per user

**Description**: Retrieves the authenticated user's profile information.

**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Response**: `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "displayName": "John Doe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "role": "student",
  "provider": "google",
  "providerId": "1234567890",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "lastLoginAt": "2026-02-01T09:00:00.000Z"
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or expired token
- `404 Not Found` - User not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 9. List Active Sessions

**Endpoint**: `GET /users/me/sessions`  
**Authentication**: Required (Bearer Token)  
**Rate Limit**: 30 requests/minute per user

**Description**: Lists all active sessions for the authenticated user.

**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Response**: `200 OK`

```json
{
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "createdAt": "2026-02-01T08:00:00.000Z",
      "lastAccessedAt": "2026-02-01T09:30:00.000Z",
      "expiresAt": "2026-02-08T08:00:00.000Z",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "ipAddress": "192.168.1.100",
      "isCurrent": true
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "createdAt": "2026-01-30T12:00:00.000Z",
      "lastAccessedAt": "2026-01-31T15:00:00.000Z",
      "expiresAt": "2026-02-06T12:00:00.000Z",
      "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
      "ipAddress": "192.168.1.101",
      "isCurrent": false
    }
  ],
  "total": 2
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or expired token
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Health Check Endpoints

### 10. Service Health Check

**Endpoint**: `GET /health`  
**Authentication**: None  
**Rate Limit**: None

**Description**: Checks the health status of the authentication service and its dependencies.

**Response**: `200 OK`

```json
{
  "status": "healthy",
  "timestamp": "2026-02-01T10:00:00.000Z",
  "service": "u2-authentication",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 12
    },
    "secretsManager": {
      "status": "healthy",
      "responseTime": 45
    }
  }
}
```

**Response**: `503 Service Unavailable` (if unhealthy)

```json
{
  "status": "unhealthy",
  "timestamp": "2026-02-01T10:00:00.000Z",
  "service": "u2-authentication",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "unhealthy",
      "error": "Connection timeout",
      "responseTime": 5000
    },
    "secretsManager": {
      "status": "healthy",
      "responseTime": 45
    }
  }
}
```

---

## Data Models

### User

```typescript
{
  id: string;              // UUID
  email: string;           // User email address
  displayName: string;     // User's display name
  avatarUrl?: string;      // Profile picture URL (optional)
  role: 'student' | 'manager' | 'developer';
  provider: 'google' | 'github';
  providerId: string;      // ID from OAuth provider
  createdAt: string;       // ISO 8601 timestamp
  lastLoginAt?: string;    // ISO 8601 timestamp (optional)
}
```

### Session

```typescript
{
  id: string;              // UUID
  userId: string;          // UUID reference to User
  createdAt: string;       // ISO 8601 timestamp
  lastAccessedAt: string;  // ISO 8601 timestamp
  expiresAt: string;       // ISO 8601 timestamp
  userAgent?: string;      // Browser/client info (optional)
  ipAddress?: string;      // IP address (optional)
  isCurrent?: boolean;     // Is this the current session? (optional)
}
```

### JWT Payload

```typescript
{
  userId: string;          // UUID
  sessionId: string;       // UUID
  role: string;            // User role
  iat: number;             // Issued at (Unix timestamp)
  exp: number;             // Expires at (Unix timestamp)
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},         // Optional additional details
    "timestamp": "2026-02-01T10:00:00.000Z"
  }
}
```

### Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `BAD_REQUEST` | Invalid request parameters |
| 401 | `UNAUTHORIZED` | Authentication failed or token expired |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource conflict (e.g., duplicate email) |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_SERVER_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

### Example Error Response

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired access token",
    "details": {
      "reason": "token_expired",
      "expiredAt": "2026-02-01T09:00:00.000Z"
    },
    "timestamp": "2026-02-01T10:00:00.000Z"
  }
}
```

---

## Rate Limiting

Rate limits are enforced per endpoint and are based on:
- IP address (for unauthenticated endpoints)
- User ID (for authenticated endpoints)
- Session ID (for refresh endpoint)

When rate limit is exceeded, the API returns:

**Response**: `429 Too Many Requests`

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60,
      "limit": 10,
      "remaining": 0,
      "reset": "2026-02-01T10:01:00.000Z"
    },
    "timestamp": "2026-02-01T10:00:00.000Z"
  }
}
```

**Response Headers**:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1738404060
Retry-After: 60
```

---

## Security Headers

All API responses include the following security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

---

## CORS Configuration

CORS is configured to allow requests from:
- Frontend application domains (configured via environment variables)
- Preflight requests are handled automatically

**Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS  
**Allowed Headers**: Authorization, Content-Type, X-Request-ID  
**Max Age**: 86400 seconds (24 hours)

---

**Last Updated**: 2026-02-01  
**Maintained by**: U2 Authentication Team