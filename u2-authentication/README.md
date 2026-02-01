# U2 Authentication Service

OAuth 2.0 based authentication and session management service for the project management platform.

## Overview

U2 Authentication Service provides secure user authentication and session management using Google and GitHub OAuth 2.0 providers. It issues JWT access tokens and manages refresh tokens for seamless user experience across the platform.

## Features

- 🔐 **OAuth 2.0 Authentication**: Google and GitHub provider support
- 🎫 **JWT Access Tokens**: Short-lived (1 hour) stateless authentication
- 🔄 **Refresh Tokens**: Long-lived (7 days) for token renewal
- 👥 **Multi-Session Support**: Users can be logged in from multiple devices
- 🛡️ **CSRF Protection**: State token validation for OAuth flows
- ⚡ **Rate Limiting**: Protection against brute force and DoS attacks
- 📊 **Session Management**: View and revoke active sessions
- 🔍 **Audit Trail**: Complete logging of authentication events

## Technology Stack

- **Runtime**: Node.js 20.x
- **Language**: TypeScript 5.x
- **Framework**: Express.js 4.x
- **Database**: Aurora Serverless v2 (PostgreSQL compatible)
- **Deployment**: AWS Lambda / ECS Fargate
- **Authentication**: JWT (jsonwebtoken), OAuth 2.0
- **Security**: Helmet, CORS, Rate Limiting

## Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- PostgreSQL 14+ (for local development)
- AWS account (for deployment)
- Google OAuth 2.0 credentials
- GitHub OAuth App credentials

## Installation

### 1. Clone the Repository

```bash
cd u2-authentication
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback

# OAuth - GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/v1/auth/github/callback

# Frontend Configuration
FRONTEND_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3001,http://localhost:3002

# AWS Configuration (for production)
AWS_REGION=ap-northeast-1
AWS_SECRETS_MANAGER_SECRET_ID=auth-service/secrets
```

### 4. Set Up Database

Run database migrations:

```bash
# Using your PostgreSQL client
psql -h localhost -U postgres -d auth_db -f src/db/migrations/001_initial_schema.sql
```

Or use the migration script (when available):

```bash
npm run migrate
```

## Running Locally

### Development Mode (with hot reload)

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

### Production Mode

```bash
npm run build
npm start
```

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Unit Tests Only

```bash
npm run test:unit
```

### Run Integration Tests Only

```bash
npm run test:integration
```

### Watch Mode (during development)

```bash
npm run test:watch
```

## API Documentation

Full API documentation is available at:
- [API Specification](./docs/api-specification.md)
- [Authentication Flow](./docs/authentication-flow.md)

### Quick API Reference

**Authentication Endpoints**:
- `POST /api/v1/auth/google/login` - Initiate Google OAuth
- `GET /api/v1/auth/google/callback` - Google OAuth callback
- `POST /api/v1/auth/github/login` - Initiate GitHub OAuth
- `GET /api/v1/auth/github/callback` - GitHub OAuth callback
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (revoke session)
- `POST /api/v1/auth/logout-all` - Logout all sessions

**User Endpoints**:
- `GET /api/v1/users/me` - Get current user profile
- `GET /api/v1/users/me/sessions` - List active sessions

**Health Check**:
- `GET /api/v1/health` - Service health status

## Deployment

### AWS Lambda

Deploy as serverless function:

```bash
npm run build
npm run package
aws lambda update-function-code \
  --function-name u2-authentication \
  --zip-file fileb://dist/lambda.zip
```

### ECS Fargate

Build and push Docker image:

```bash
docker build -t u2-authentication:latest .
docker tag u2-authentication:latest <ecr-repo-url>:latest
docker push <ecr-repo-url>:latest
```

Deploy using deployment scripts:

```bash
./scripts/deploy.sh production
```

### Infrastructure

Infrastructure code is available in `infrastructure/` directory:

```bash
cd infrastructure
terraform init
terraform plan
terraform apply
```

## Configuration

### JWT Configuration

JWT tokens are used for stateless authentication. Configure in `.env`:

- `JWT_SECRET`: Secret key for signing JWTs (min 32 characters)
- `JWT_EXPIRES_IN`: Access token expiration (default: 1h)
- `REFRESH_TOKEN_EXPIRES_IN`: Refresh token expiration (default: 7d)

### OAuth Provider Setup

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/v1/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

#### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/v1/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

### Rate Limiting

Rate limits are configured per endpoint:

- Login endpoints: 10 requests/minute per IP
- Refresh endpoint: 30 requests/minute per session
- Profile endpoints: 60 requests/minute per user

Adjust in `src/middleware/rate-limit.middleware.ts`.

## Security

### Best Practices

1. **Never commit secrets**: Use `.env` for local, Secrets Manager for production
2. **Rotate secrets regularly**: Change JWT secret and OAuth credentials periodically
3. **Use HTTPS in production**: Always encrypt communication
4. **Monitor suspicious activity**: Set up CloudWatch alarms for failed logins
5. **Keep dependencies updated**: Run `npm audit` and `npm update` regularly

### Security Headers

The service automatically adds security headers to all responses:
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`
- `Content-Security-Policy`

### CORS Configuration

CORS is configured via environment variable:

```env
CORS_ORIGINS=http://localhost:3001,https://app.example.com
```

## Monitoring

### Logging

Structured JSON logging is enabled by default. Log levels:
- `ERROR`: Critical errors requiring immediate attention
- `WARN`: Warning conditions
- `INFO`: Informational messages
- `DEBUG`: Detailed debug information

Configure log level in `.env`:

```env
LOG_LEVEL=info
```

### CloudWatch Integration

In production, logs are automatically sent to CloudWatch:

```typescript
// Logs are structured for easy querying
{
  "level": "info",
  "message": "User authenticated",
  "userId": "uuid",
  "sessionId": "uuid",
  "timestamp": "2026-02-01T10:00:00.000Z"
}
```

### Health Checks

Monitor service health:

```bash
curl http://localhost:3000/api/v1/health
```

Response includes:
- Service status
- Database connectivity
- Secrets Manager status
- Response times

## Troubleshooting

### Database Connection Issues

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Verify PostgreSQL is running and credentials are correct.

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U postgres -d auth_db
```

### OAuth Configuration Issues

```
Error: OAuth provider authentication failed
```

**Solution**: Verify OAuth credentials and redirect URIs match exactly.

1. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. Verify redirect URI in Google Console matches `.env`
3. Ensure OAuth consent screen is configured

### JWT Verification Failures

```
Error: invalid signature
```

**Solution**: JWT secret mismatch or token from different environment.

1. Verify `JWT_SECRET` is consistent across instances
2. Check token wasn't generated with different secret
3. Ensure token hasn't been modified

## Development

For development guidelines, code structure, and contribution instructions, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## Support

For issues and questions:
- **GitHub Issues**: [Project Issues](https://github.com/your-org/your-repo/issues)
- **Documentation**: See `docs/` directory
- **Team Contact**: auth-team@example.com

## License

[Your License Here]

## Contributors

- Development Team
- Security Team
- Infrastructure Team

---

**Last Updated**: 2026-02-01  
**Version**: 1.0.0  
**Status**: Production Ready