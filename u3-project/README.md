# U3-Project Service

Project management service for the learning management platform. Provides CRUD operations for student projects, project templates, and basic progress tracking.

## Overview

The U3-Project service handles:
- **Project Management**: Create, read, update, delete projects
- **Project Templates**: Pre-configured project templates for quick start
- **Project Sharing**: Share projects with other users
- **Soft Deletion**: Recover deleted projects
- **Progress Tracking**: Basic learning progress statistics

## Technology Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: Amazon DynamoDB (Single-Table Design)
- **Deployment**: AWS Lambda + API Gateway
- **Authentication**: JWT (validated against Auth service)
- **Logging**: AWS Lambda Powertools
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate credentials
- Access to DynamoDB table
- JWT secret from authentication service

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Local Development

```bash
# Start development server
npm run dev

# Server will start at http://localhost:3000
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Building

```bash
# Build for production
npm run build

# Output will be in dist/
```

## API Endpoints

### Health Check
```
GET /api/v1/health
```

### Projects
```
GET    /api/v1/projects              - List user's projects
POST   /api/v1/projects              - Create new project
GET    /api/v1/projects/:id          - Get project by ID
PUT    /api/v1/projects/:id          - Update project
DELETE /api/v1/projects/:id          - Soft delete project
POST   /api/v1/projects/:id/restore  - Restore deleted project
POST   /api/v1/projects/:id/share    - Share project with users
```

### Templates
```
GET    /api/v1/templates                  - List available templates
POST   /api/v1/projects/from-template     - Create project from template
```

See [API Specification](./docs/api-specification.md) for detailed documentation.

## Authentication

All endpoints (except health check) require JWT authentication:

```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
  http://localhost:3000/api/v1/projects
```

The JWT must contain:
- `sub`: User ID
- `email`: User email

## Environment Variables

See `.env.example` for all available configuration options.

Required variables:
- `AWS_REGION`: AWS region for DynamoDB
- `DYNAMODB_TABLE_NAME`: DynamoDB table name
- `JWT_SECRET`: Secret for JWT validation
- `AUTH_SERVICE_URL`: Authentication service URL

## Project Structure

```
u3-project/
├── src/
│   ├── app.ts              - Express app configuration
│   ├── lambda.ts           - Lambda handler
│   ├── server.ts           - Local dev server
│   ├── config/             - Configuration management
│   ├── controllers/        - Request handlers
│   ├── db/                 - Database schema and connection
│   ├── middleware/         - Express middleware
│   ├── repositories/       - Data access layer
│   ├── routes/             - API routes
│   ├── services/           - Business logic
│   ├── utils/              - Utilities and helpers
│   └── validators/         - Request validation schemas
├── tests/                  - Test files
├── infrastructure/         - AWS CDK infrastructure
└── docs/                   - Additional documentation
```

## Deployment

### Using AWS CDK

```bash
# Navigate to infrastructure directory
cd infrastructure

# Install CDK dependencies
npm install

# Deploy to AWS
npm run deploy
```

### Manual Deployment

```bash
# Build the project
npm run build

# Package for Lambda
zip -r function.zip dist/ node_modules/

# Deploy using AWS CLI or Console
```

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development guidelines.

## Error Handling

The API uses standard HTTP status codes:

- `200 OK`: Successful request
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

Error responses follow this format:

```json
{
  "error": "ValidationError",
  "message": "Validation failed",
  "statusCode": 422,
  "errors": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

## Logging

The service uses AWS Lambda Powertools for structured logging. Logs include:
- Request/response details
- Business operations
- Errors with stack traces
- Correlation IDs for request tracking

## Performance

- DynamoDB queries use indexes for efficient access
- Pagination support for list operations
- Rate limiting to prevent abuse
- Caching headers for static resources

## Security

- JWT authentication required for all operations
- Owner-based access control
- Input validation on all requests
- SQL injection prevention (NoSQL)
- XSS protection via sanitization
- CORS configuration

## Monitoring

When deployed to AWS:
- CloudWatch Logs for application logs
- CloudWatch Metrics for performance metrics
- CloudWatch Alarms for error monitoring
- X-Ray tracing (optional)

## Support

For issues or questions:
- Check [DEVELOPMENT.md](./DEVELOPMENT.md)
- Review [API Specification](./docs/api-specification.md)
- Contact the development team

## License

Internal use only.