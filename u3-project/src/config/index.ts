/**
 * Application Configuration
 * 
 * Centralized environment variable management with validation and defaults.
 */

/**
 * Environment configuration interface
 */
export interface Config {
  // Application
  nodeEnv: string;
  appVersion: string;
  serviceName: string;
  
  // Server (Local development)
  port: number;
  host: string;
  
  // AWS Configuration
  awsRegion: string;
  awsAccountId?: string;
  
  // DynamoDB
  dynamodbTableName: string;
  dynamodbEndpoint?: string; // For local testing
  
  // Authentication
  jwtSecret: string;
  jwtExpiresIn: string;
  authServiceUrl: string;
  
  // Logging
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  
  // CORS
  allowedOrigins: string;
  
  // Lambda
  basePath: string;
  
  // Rate Limiting
  rateLimitMax: number;
  rateLimitWindowMs: number;
  
  // Pagination
  defaultPageSize: number;
  maxPageSize: number;
}

/**
 * Validate required environment variables
 */
function validateConfig(): void {
  const required = [
    'AWS_REGION',
    'DYNAMODB_TABLE_NAME',
    'JWT_SECRET',
    'AUTH_SERVICE_URL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Parse integer from environment variable with default
 */
function parseIntOrDefault(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get configuration from environment variables
 */
function loadConfig(): Config {
  // Validate required variables
  if (process.env.NODE_ENV !== 'test') {
    validateConfig();
  }
  
  return {
    // Application
    nodeEnv: process.env.NODE_ENV || 'development',
    appVersion: process.env.APP_VERSION || '1.0.0',
    serviceName: process.env.SERVICE_NAME || 'u3-project',
    
    // Server
    port: parseIntOrDefault(process.env.PORT, 3000),
    host: process.env.HOST || '0.0.0.0',
    
    // AWS
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsAccountId: process.env.AWS_ACCOUNT_ID,
    
    // DynamoDB
    dynamodbTableName: process.env.DYNAMODB_TABLE_NAME || 'ProjectDomain',
    dynamodbEndpoint: process.env.DYNAMODB_ENDPOINT, // For local DynamoDB
    
    // Authentication
    jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    
    // Logging
    logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'INFO',
    
    // CORS
    allowedOrigins: process.env.ALLOWED_ORIGINS || '*',
    
    // Lambda
    basePath: process.env.BASE_PATH || '',
    
    // Rate Limiting
    rateLimitMax: parseIntOrDefault(process.env.RATE_LIMIT_MAX, 100),
    rateLimitWindowMs: parseIntOrDefault(process.env.RATE_LIMIT_WINDOW_MS, 60000),
    
    // Pagination
    defaultPageSize: parseIntOrDefault(process.env.DEFAULT_PAGE_SIZE, 20),
    maxPageSize: parseIntOrDefault(process.env.MAX_PAGE_SIZE, 100)
  };
}

/**
 * Export singleton configuration instance
 */
export const config = loadConfig();

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return config.nodeEnv === 'production';
};

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean => {
  return config.nodeEnv === 'development';
};

/**
 * Check if running in test environment
 */
export const isTest = (): boolean => {
  return config.nodeEnv === 'test';
};

/**
 * Get DynamoDB client configuration
 */
export const getDynamoDBConfig = () => {
  const dynamoConfig: any = {
    region: config.awsRegion
  };
  
  // Use local DynamoDB if endpoint is provided (for testing)
  if (config.dynamodbEndpoint) {
    dynamoConfig.endpoint = config.dynamodbEndpoint;
    dynamoConfig.credentials = {
      accessKeyId: 'local',
      secretAccessKey: 'local'
    };
  }
  
  return dynamoConfig;
};

/**
 * Get CORS configuration
 */
export const getCORSConfig = () => {
  const origins = config.allowedOrigins.split(',').map(o => o.trim());
  
  return {
    origin: origins.includes('*') ? '*' : origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
  };
};

export default config;