# U2 Authentication Service - Development Guide

This guide provides detailed information for developers working on the U2 Authentication Service.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing Strategy](#testing-strategy)
6. [Debugging](#debugging)
7. [Database Management](#database-management)
8. [Contributing](#contributing)

---

## Getting Started

### Development Environment Setup

1. **Install required tools**:
   ```bash
   node --version  # Should be 20.x or higher
   npm --version   # Should be 10.x or higher
   docker --version  # Optional, for containerized PostgreSQL
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Set up PostgreSQL**:

   **Option A: Local PostgreSQL**
   ```bash
   # Install PostgreSQL
   brew install postgresql@14  # macOS
   sudo apt install postgresql-14  # Ubuntu

   # Start PostgreSQL
   brew services start postgresql@14  # macOS
   sudo systemctl start postgresql  # Ubuntu

   # Create database
   createdb auth_db
   ```

   **Option B: Docker PostgreSQL**
   ```bash
   docker run --name auth-postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=auth_db \
     -p 5432:5432 \
     -d postgres:14
   ```

4. **Run database migrations**:
   ```bash
   psql -h localhost -U postgres -d auth_db \
     -f src/db/migrations/001_initial_schema.sql
   ```

5. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

### IDE Setup

**Visual Studio Code** (Recommended):

Install recommended extensions:
- ESLint
- Prettier
- TypeScript
- Thunder Client (for API testing)
- PostgreSQL

**.vscode/settings.json**:
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## Project Structure

```
u2-authentication/
├── src/                        # Source code
│   ├── app.ts                  # Express application setup
│   ├── server.ts               # HTTP server (local development)
│   ├── lambda.ts               # AWS Lambda handler
│   ├── config/                 # Configuration management
│   │   └── index.ts            # Centralized config
│   ├── controllers/            # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   └── health.controller.ts
│   ├── services/               # Business logic
│   │   ├── oauth.service.ts
│   │   ├── session.service.ts
│   │   ├── token.service.ts
│   │   ├── user.service.ts
│   │   └── oauth/              # OAuth providers
│   │       ├── google.provider.ts
│   │       └── github.provider.ts
│   ├── repositories/           # Data access layer
│   │   ├── user.repository.ts
│   │   ├── session.repository.ts
│   │   └── oauth-state.repository.ts
│   ├── middleware/             # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── logging.middleware.ts
│   ├── routes/                 # Route definitions
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   └── health.routes.ts
│   ├── db/                     # Database
│   │   ├── connection.ts       # Connection pool
│   │   ├── schema.ts           # Type definitions
│   │   └── migrations/         # SQL migrations
│   │       └── 001_initial_schema.sql
│   └── utils/                  # Utilities
│       ├── logger.ts
│       ├── errors.ts
│       ├── validators.ts
│       └── secrets.ts
├── tests/                      # Test files
│   ├── setup.ts                # Test setup
│   ├── controllers/            # Controller tests
│   ├── services/               # Service tests
│   ├── repositories/           # Repository tests
│   ├── utils/                  # Utility tests
│   └── integration/            # Integration tests
├── docs/                       # Documentation
│   ├── api-specification.md
│   └── authentication-flow.md
├── infrastructure/             # IaC code
├── scripts/                    # Build & deployment scripts
├── config/                     # Configuration files
├── .env.example                # Environment template
├── .eslintrc.js                # ESLint config
├── .prettierrc                 # Prettier config
├── jest.config.js              # Jest config
├── tsconfig.json               # TypeScript config
├── package.json                # Dependencies
├── README.md                   # Project readme
└── DEVELOPMENT.md              # This file
```

### Layer Architecture

The project follows a layered architecture:

1. **Routes Layer**: Defines API endpoints and applies middleware
2. **Controllers Layer**: Handles HTTP requests/responses
3. **Services Layer**: Implements business logic
4. **Repositories Layer**: Manages data persistence
5. **Database Layer**: Connection management and migrations

**Data flow**:
```
HTTP Request
   ↓
Routes (middleware, validation)
   ↓
Controllers (request/response handling)
   ↓
Services (business logic)
   ↓
Repositories (data access)
   ↓
Database
```

---

## Development Workflow

### Feature Development

1. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write tests first** (TDD approach):
   ```bash
   # Create test file
   touch tests/services/your-service.test.ts
   
   # Write failing tests
   npm test -- your-service.test.ts
   ```

3. **Implement feature**:
   - Write minimal code to pass tests
   - Follow single responsibility principle
   - Keep functions small and focused

4. **Run linter and formatter**:
   ```bash
   npm run lint
   npm run format
   ```

5. **Ensure tests pass**:
   ```bash
   npm test
   npm run test:coverage
   ```

6. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: add user profile update feature"
   ```

7. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples**:
```
feat(auth): add GitHub OAuth provider
fix(session): prevent token reuse after refresh
docs(api): update authentication flow diagram
test(oauth): add state token validation tests
```

---

## Code Standards

### TypeScript Guidelines

1. **Always specify return types**:
   ```typescript
   // ✅ Good
   function getUser(id: string): Promise<User> {
     return userRepository.getUserById(id);
   }

   // ❌ Bad
   function getUser(id: string) {
     return userRepository.getUserById(id);
   }
   ```

2. **Use interfaces for data structures**:
   ```typescript
   interface User {
     id: string;
     email: string;
     displayName: string;
   }
   ```

3. **Avoid `any` type**:
   ```typescript
   // ✅ Good
   function parseJson<T>(json: string): T {
     return JSON.parse(json) as T;
   }

   // ❌ Bad
   function parseJson(json: string): any {
     return JSON.parse(json);
   }
   ```

4. **Use const for immutable values**:
   ```typescript
   const JWT_EXPIRY = '1h';
   const MAX_LOGIN_ATTEMPTS = 5;
   ```

### Error Handling

1. **Use custom error classes**:
   ```typescript
   throw new UnauthorizedError('Invalid credentials');
   throw new NotFoundError('User not found');
   ```

2. **Always handle promises**:
   ```typescript
   // ✅ Good
   try {
     const user = await userService.getUser(id);
   } catch (error) {
     logger.error('Failed to get user', { error, userId: id });
     throw error;
   }

   // ❌ Bad
   const user = await userService.getUser(id);  // Unhandled rejection
   ```

3. **Log errors with context**:
   ```typescript
   logger.error('OAuth authentication failed', {
     provider: 'google',
     error: error.message,
     userId: user?.id,
   });
   ```

### Async/Await Best Practices

1. **Use async/await over promises**:
   ```typescript
   // ✅ Good
   async function createUser(data: CreateUserDto): Promise<User> {
     const existingUser = await userRepository.getUserByEmail(data.email);
     if (existingUser) {
       throw new ConflictError('Email already exists');
     }
     return userRepository.createUser(data);
   }
   ```

2. **Handle concurrent operations**:
   ```typescript
   // ✅ Good - parallel execution
   const [user, sessions] = await Promise.all([
     userRepository.getUserById(userId),
     sessionRepository.getUserSessions(userId),
   ]);

   // ❌ Bad - sequential execution
   const user = await userRepository.getUserById(userId);
   const sessions = await sessionRepository.getUserSessions(userId);
   ```

---

## Testing Strategy

### Test Structure

Follow AAA pattern (Arrange, Act, Assert):

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        displayName: 'Test User',
      };
      mockUserRepository.createUser.mockResolvedValue(mockUser);

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(userData);
    });
  });
});
```

### Unit Tests

Test individual functions in isolation:

```typescript
// Mock dependencies
const mockUserRepository = {
  createUser: jest.fn(),
  getUserById: jest.fn(),
};

const userService = new UserService(mockUserRepository);

// Test
it('should throw error if email exists', async () => {
  mockUserRepository.getUserByEmail.mockResolvedValue(existingUser);
  
  await expect(
    userService.createUser({ email: 'existing@example.com' })
  ).rejects.toThrow(ConflictError);
});
```

### Integration Tests

Test complete workflows:

```typescript
describe('OAuth Flow', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it('should complete Google OAuth flow', async () => {
    // Initiate login
    const { authUrl } = await request(app)
      .post('/api/v1/auth/google/login')
      .expect(200);

    // Simulate callback
    const response = await request(app)
      .get('/api/v1/auth/google/callback')
      .query({ code: 'test-code', state: 'test-state' })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });
});
```

### Test Coverage Goals

- **Overall**: 80% minimum
- **Critical paths**: 100% (authentication, session management)
- **Business logic**: 90%
- **Utils/helpers**: 80%

Run coverage report:
```bash
npm run test:coverage
```

---

## Debugging

### Local Debugging

**VS Code launch.json**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["${workspaceFolder}/src/server.ts"],
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
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

Use structured logging:

```typescript
import { logger } from './utils/logger';

// Log with context
logger.info('User authenticated', {
  userId: user.id,
  sessionId: session.id,
  provider: 'google',
});

// Log errors
logger.error('OAuth failed', {
  error: error.message,
  stack: error.stack,
  provider: 'google',
});
```

### Database Debugging

Enable query logging:

```typescript
// In db/connection.ts
const pool = new Pool({
  // ... other config
  log: (msg) => logger.debug('Database query', { query: msg }),
});
```

View slow queries:
```bash
# PostgreSQL slow query log
tail -f /var/log/postgresql/postgresql-14-main.log | grep "duration:"
```

---

## Database Management

### Migrations

Create new migration:

```bash
# Create migration file
touch src/db/migrations/002_add_user_preferences.sql
```

Migration template:
```sql
-- Migration: Add user preferences
-- Created: 2026-02-01

-- Up migration
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Down migration (for rollback)
-- DROP TABLE user_preferences;
```

Apply migration:
```bash
psql -h localhost -U postgres -d auth_db \
  -f src/db/migrations/002_add_user_preferences.sql
```

### Database Backup

```bash
# Backup
pg_dump -h localhost -U postgres auth_db > backup.sql

# Restore
psql -h localhost -U postgres -d auth_db < backup.sql
```

### Query Performance

Use EXPLAIN ANALYZE:

```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'test@example.com';
```

Add indexes for frequently queried columns:

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

---

## Contributing

### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure CI passes** (lint, tests, build)
4. **Request review** from team members
5. **Address feedback** and update PR
6. **Squash commits** before merging

### Code Review Checklist

**For Reviewers**:
- [ ] Code follows project standards
- [ ] Tests cover new functionality
- [ ] No security vulnerabilities
- [ ] Performance implications considered
- [ ] Documentation updated
- [ ] Error handling is appropriate
- [ ] Logging is sufficient
- [ ] No hardcoded secrets

**For Authors**:
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] Linter passes
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main
- [ ] No merge conflicts

### Getting Help

- **Ask questions**: Use team chat or GitHub discussions
- **Review docs**: Check README and API documentation
- **Pair programming**: Schedule sessions with team members
- **Code reviews**: Learn from feedback on PRs

---

## Additional Resources

### Documentation
- [API Specification](./docs/api-specification.md)
- [Authentication Flow](./docs/authentication-flow.md)
- [README](./README.md)

### External Resources
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [OAuth 2.0 Spec](https://oauth.net/2/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Last Updated**: 2026-02-01  
**Maintained by**: U2 Authentication Team