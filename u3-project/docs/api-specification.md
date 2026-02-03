# API Specification

**Version**: 1.0.0  
**Base URL**: `/api/v1`  
**Authentication**: Bearer JWT Token

## Table of Contents

- [Authentication](#authentication)
- [Error Responses](#error-responses)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Projects](#projects)
  - [Templates](#templates)

---

## Authentication

All endpoints (except health check) require JWT authentication via Bearer token:

```http
Authorization: Bearer <jwt-token>
```

**JWT Claims Required**:
- `sub`: User ID (UUID)
- `email`: User email

**Example**:
```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  https://api.example.com/api/v1/projects
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "statusCode": 400
}
```

### Validation Error Format

```json
{
  "error": "ValidationError",
  "message": "Validation failed",
  "statusCode": 422,
  "errors": [
    {
      "field": "name",
      "message": "Name is required",
      "code": "required"
    }
  ]
}
```

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `204 No Content`: Successful request with no response body
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

---

## Endpoints

### Health Check

#### Get Health Status

```http
GET /health
```

**Description**: Check service health status

**Authentication**: None required

**Response**: `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "u3-project",
  "version": "1.0.0"
}
```

---

### Projects

#### List Projects

```http
GET /projects
```

**Description**: Get list of user's projects with pagination

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number (min: 1) |
| pageSize | integer | No | 20 | Items per page (max: 100) |
| status | string | No | - | Filter by status: Draft, Active, Completed |
| includeDeleted | boolean | No | false | Include soft-deleted projects |
| sortBy | string | No | updatedAt | Sort field: name, createdAt, updatedAt |
| sortOrder | string | No | desc | Sort order: asc, desc |

**Example Request**:
```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.example.com/api/v1/projects?page=1&pageSize=20&status=Active"
```

**Response**: `200 OK`
```json
{
  "projects": [
    {
      "id": "123e4567-e89b-42d3-a456-426614174000",
      "name": "My First Project",
      "description": "Learning TypeScript basics",
      "status": "Active",
      "ownerId": "user-123",
      "progressRate": 45,
      "tags": ["typescript", "learning"],
      "sharedWith": [],
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-15T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

#### Create Project

```http
POST /projects
```

**Description**: Create a new project

**Authentication**: Required

**Request Body**:
```json
{
  "name": "My Project",
  "description": "Project description",
  "tags": ["tag1", "tag2"]
}
```

**Validation Rules**:
- `name`: Required, 1-200 characters
- `description`: Optional, max 2000 characters
- `tags`: Optional array, max 20 tags, each 1-50 characters

**Response**: `201 Created`
```json
{
  "id": "123e4567-e89b-42d3-a456-426614174000",
  "name": "My Project",
  "description": "Project description",
  "status": "Draft",
  "ownerId": "user-123",
  "progressRate": 0,
  "tags": ["tag1", "tag2"],
  "sharedWith": [],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

#### Get Project

```http
GET /projects/:id
```

**Description**: Get project by ID

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Project ID |

**Response**: `200 OK`
```json
{
  "id": "123e4567-e89b-42d3-a456-426614174000",
  "name": "My Project",
  "description": "Project description",
  "status": "Active",
  "ownerId": "user-123",
  "progressRate": 45,
  "tags": ["tag1", "tag2"],
  "sharedWith": ["user-456"],
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Project not found
- `403 Forbidden`: Not owner or shared user

---

#### Update Project

```http
PUT /projects/:id
```

**Description**: Update project details

**Authentication**: Required (must be owner)

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Project ID |

**Request Body**:
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "Active",
  "progressRate": 60,
  "tags": ["updated", "tags"]
}
```

**Validation Rules**:
- `name`: Optional, 1-200 characters
- `description`: Optional, max 2000 characters
- `status`: Optional, one of: Draft, Active, Completed
- `progressRate`: Optional, 0-100
- `tags`: Optional array, max 20 tags

**Status Transition Rules**:
- Draft → Active, Draft
- Active → Completed, Active
- Completed → Completed (no changes)

**Response**: `200 OK`
```json
{
  "id": "123e4567-e89b-42d3-a456-426614174000",
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "Active",
  "ownerId": "user-123",
  "progressRate": 60,
  "tags": ["updated", "tags"],
  "sharedWith": [],
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-15T15:00:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid status transition
- `403 Forbidden`: Not project owner
- `404 Not Found`: Project not found

---

#### Delete Project

```http
DELETE /projects/:id
```

**Description**: Soft delete project (can be restored)

**Authentication**: Required (must be owner)

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Project ID |

**Response**: `204 No Content`

**Error Responses**:
- `403 Forbidden`: Not project owner
- `404 Not Found`: Project not found

---

#### Restore Project

```http
POST /projects/:id/restore
```

**Description**: Restore soft-deleted project

**Authentication**: Required (must be owner)

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Project ID |

**Response**: `200 OK`
```json
{
  "id": "123e4567-e89b-42d3-a456-426614174000",
  "name": "Restored Project",
  "status": "Draft",
  "deletedAt": null,
  "updatedAt": "2024-01-15T15:30:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Project not deleted
- `403 Forbidden`: Not project owner
- `404 Not Found`: Project not found

---

#### Share Project

```http
POST /projects/:id/share
```

**Description**: Share project with other users

**Authentication**: Required (must be owner)

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Project ID |

**Request Body**:
```json
{
  "userIds": [
    "user-456",
    "user-789"
  ]
}
```

**Validation Rules**:
- `userIds`: Required array, 1-50 UUIDs, no duplicates

**Response**: `200 OK`
```json
{
  "id": "123e4567-e89b-42d3-a456-426614174000",
  "name": "Shared Project",
  "sharedWith": ["user-456", "user-789"],
  "updatedAt": "2024-01-15T16:00:00.000Z"
}
```

**Error Responses**:
- `403 Forbidden`: Not project owner
- `404 Not Found`: Project not found
- `422 Unprocessable Entity`: Invalid user IDs

---

### Templates

#### List Templates

```http
GET /templates
```

**Description**: Get available project templates

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| category | string | No | - | Filter by category |

**Response**: `200 OK`
```json
{
  "templates": [
    {
      "id": "template-1",
      "name": "Basic Web Project",
      "description": "Simple HTML/CSS/JS project",
      "category": "web",
      "difficulty": "beginner",
      "estimatedHours": 10,
      "tags": ["html", "css", "javascript"]
    },
    {
      "id": "template-2",
      "name": "React Todo App",
      "description": "Todo application with React",
      "category": "web",
      "difficulty": "intermediate",
      "estimatedHours": 20,
      "tags": ["react", "typescript"]
    }
  ]
}
```

---

#### Create Project from Template

```http
POST /projects/from-template
```

**Description**: Create new project from template

**Authentication**: Required

**Request Body**:
```json
{
  "templateId": "template-1",
  "projectName": "My Custom Name"
}
```

**Validation Rules**:
- `templateId`: Required
- `projectName`: Optional, 1-200 characters

**Response**: `201 Created`
```json
{
  "id": "123e4567-e89b-42d3-a456-426614174000",
  "name": "My Custom Name",
  "description": "Simple HTML/CSS/JS project",
  "status": "Draft",
  "ownerId": "user-123",
  "progressRate": 0,
  "tags": ["html", "css", "javascript"],
  "templateId": "template-1",
  "createdAt": "2024-01-15T16:30:00.000Z",
  "updatedAt": "2024-01-15T16:30:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Template not found

---

## Rate Limiting

**Limits**:
- 100 requests per minute per user
- Response header: `X-RateLimit-Remaining`

**Exceeded Response**: `429 Too Many Requests`
```json
{
  "error": "RateLimitError",
  "message": "Too many requests",
  "statusCode": 429,
  "retryAfter": 30
}
```

---

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial API specification
- Project CRUD operations
- Template listing and instantiation
- Project sharing functionality
- Soft delete and restore