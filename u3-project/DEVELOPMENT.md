# Development Guide

## Development Setup

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **AWS CLI**: Configured with appropriate credentials
- **Git**: For version control
- **VS Code** (recommended): With TypeScript and ESLint extensions

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd u3-project

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Update .env with your configuration
nano .env
```

### Environment Configuration

Create a `.env` file with the following variables:

```bash
# Required
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=ProjectDomain
JWT_SECRET=your-secret-key
AUTH_SERVICE_URL=http://localhost:3001

# Optional (with defaults)
NODE_ENV=development
PORT=3000
LOG_LEVEL=INFO
```

## Running Locally

### Development Server

```bash
# Start with hot-reload
npm run dev

# Server runs at http://localhost:3000
# API base path: http://localhost:3000/api/v1
```

### Local DynamoDB (Optional)

For local testing without AWS:

```bash
# Install DynamoDB Local
npm install -g dynamodb-local

# Start local DynamoDB
dynamodb-local

# Add to .env
DYNAMODB_ENDPOINT=http://localhost:8000
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Run specific test file
npm test -- project.service.test.ts
```

### Test Structure

```
tests/
├── repositories/    - Data access tests
├── services/        - Business logic tests
├── controllers/     - Request handler tests
├── middleware/      - Middleware tests
├── validators/      - Validation schema tests
├── utils/           - Utility function tests
├── integration/     - Integration tests
└── smoke/           - Smoke tests
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('ProjectService', () => {
  let service: ProjectService;
  
  beforeEach(() => {
    service = new ProjectService(mockRepository);
  });
  
  it('should create project', async () => {
    const result = await service.createProject(data, userId);
    expect(result).toHaveProperty('id');
  });
});
```

## Code Style

### TypeScript Guidelines

- **Use explicit types**: Avoid `any` when possible
- **Use interfaces**: For object shapes
- **Use enums**: For fixed sets of values
- **Document public APIs**: Use JSDoc comments

```typescript
/**
 * Create a new project
 * 
 * @param data - Project creation data
 * @param userId - Owner user ID
 * @returns Created project
 * @throws ValidationError if data is invalid
 */
async createProject(data: CreateProjectDTO, userId: string): Promise<Project> {
  // Implementation
}
```

### Naming Conventions

- **Files**: kebab-case (`project.service.ts`)
- **Classes**: PascalCase (`ProjectService`)
- **Interfaces**: PascalCase with descriptive names (`CreateProjectDTO`)
- **Functions**: camelCase (`createProject`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_PAGE_SIZE`)

### Code Organization

```typescript
// 1. Imports
import { } from 'external-library';
import { } from '../internal-module';

// 2. Types/Interfaces
interface ProjectData { }

// 3. Constants
const MAX_RETRIES = 3;

// 4. Main class/function
export class ProjectService { }

// 5. Helper functions (private)
function validateData() { }
```

## Debugging

### VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/src/server.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Logging

```typescript
import { logger } from './utils/logger';

// Debug logging
logger.debug('Processing request', { projectId, userId });

// Error logging
logger.error('Failed to create project', { error, context });
```

## Database

### DynamoDB Single-Table Design

```typescript
// Entity format
{
  PK: 'PROJECT#{uuid}',
  SK: 'METADATA',
  EntityType: 'Project',
  // ... project data
}

// Access patterns
// 1. Get project by ID: PK = PROJECT#{id}, SK = METADATA
// 2. List by owner: GSI1PK = OWNER#{userId}, GSI1SK = {updatedAt}
// 3. List templates: GSI2PK = TEMPLATE, GSI2SK = {category}
```

### Testing with DynamoDB

```typescript
// Mock repository in tests
const mockRepository = {
  getById: jest.fn(),
  create: jest.fn(),
  // ...
};

// Or use local DynamoDB
const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000'
});
```

## API Development

### Adding New Endpoints

1. **Define validation schema** (`src/validators/`)
2. **Create service method** (`src/services/`)
3. **Create controller** (`src/controllers/`)
4. **Add route** (`src/routes/`)
5. **Write tests** (`tests/`)
6. **Update API docs** (`docs/api-specification.md`)

### Example: Add New Endpoint

```typescript
// 1. Validator (src/validators/project.validator.ts)
export const archiveProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

// 2. Service (src/services/project.service.ts)
async archiveProject(id: string, userId: string): Promise<void> {
  // Implementation
}

// 3. Controller (src/controllers/project.controller.ts)
async archiveProject(req: Request, res: Response) {
  await projectService.archiveProject(req.params.id, req.user.id);
  res.status(204).send();
}

// 4. Route (src/routes/project.routes.ts)
router.post('/:id/archive',
  authMiddleware,
  ownershipMiddleware,
  validate(archiveProjectSchema),
  projectController.archiveProject
);

// 5. Test (tests/controllers/project.controller.test.ts)
it('should archive project', async () => {
  const response = await request(app)
    .post('/api/v1/projects/123/archive')
    .set('Authorization', 'Bearer token')
    .expect(204);
});
```

## Error Handling

### Custom Errors

```typescript
import { NotFoundError, ValidationError } from './utils/errors';

// Usage
if (!project) {
  throw new NotFoundError('Project', projectId);
}

if (!isValid) {
  throw new ValidationError([
    { field: 'name', message: 'Name is required' }
  ]);
}
```

### Error Middleware

All errors are caught by error middleware and converted to proper HTTP responses.

## Performance

### Optimization Tips

1. **Use indexes**: Query DynamoDB with indexes for performance
2. **Pagination**: Always paginate list operations
3. **Caching**: Cache frequently accessed data (if applicable)
4. **Batch operations**: Use batch gets/writes when possible
5. **Connection pooling**: Reuse DB connections

### Monitoring Performance

```typescript
import { logOperation } from './utils/logger';

const startTime = Date.now();
const result = await operation();
const duration = Date.now() - startTime;

logOperation('create', 'project', projectId, userId, true, { duration });
```

## Security

### Authentication

```typescript
// All routes require authentication
router.get('/projects', authMiddleware, controller.list);

// JWT is validated in authMiddleware
// req.user is populated with { id, email }
```

### Authorization

```typescript
// Owner check for modification
router.put('/projects/:id',
  authMiddleware,
  ownershipMiddleware,  // Checks project ownership
  controller.update
);
```

### Input Validation

```typescript
// All inputs validated with Zod
import { validate } from './middleware/validation.middleware';
import { createProjectSchema } from './validators/project.validator';

router.post('/projects',
  authMiddleware,
  validate(createProjectSchema),
  controller.create
);
```

## Deployment

### Build for Production

```bash
# Build TypeScript
npm run build

# Output in dist/
```

### Lambda Deployment

```bash
# Using CDK
cd infrastructure
npm run deploy

# Manual
zip -r function.zip dist/ node_modules/
aws lambda update-function-code --function-name u3-project --zip-file fileb://function.zip
```

## Troubleshooting

### Common Issues

**Issue**: TypeScript errors after npm install
**Solution**: Delete node_modules and reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

**Issue**: DynamoDB connection fails
**Solution**: Check AWS credentials and region
```bash
aws sts get-caller-identity
aws dynamodb list-tables --region us-east-1
```

**Issue**: Tests failing with timeout
**Solution**: Increase Jest timeout
```typescript
jest.setTimeout(10000);
```

**Issue**: JWT validation fails
**Solution**: Verify JWT_SECRET matches auth service
```bash
echo $JWT_SECRET
```

## Git Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches

### Commit Messages

```
feat: add project archiving endpoint
fix: resolve owner check for shared projects
docs: update API specification
test: add integration tests for templates
refactor: simplify project service logic
```

### Pull Request Checklist

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] Types properly defined

## Useful Commands

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run type-check

# Clean build
npm run clean

# Run in production mode locally
NODE_ENV=production npm start
```

## Resources

- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Lambda Powertools](https://awslabs.github.io/aws-lambda-powertools-typescript/)
- [Zod Documentation](https://zod.dev/)