/**
 * Configuration Management
 * 
 * Centralized configuration loading from environment variables
 * with validation and type-safety.
 */

import * as dotenv from 'dotenv';

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

/**
 * Application Configuration Interface
 */
export interface AppConfig {
  // Environment
  nodeEnv: string;
  port: number;

  // Database
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    resourceArn?: string; // For RDS Data API
    secretArn?: string;   // For RDS Data API
    maxConnections: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };

  // JWT Configuration
  jwt: {
    accessTokenSecret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };

  // OAuth Configuration
  oauth: {
    google: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    github: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
  };

  // Security
  security: {
    bcryptRounds: number;
    sessionExpiry: number; // in seconds
    stateTokenExpiry: number; // in seconds
  };

  // CORS
  cors: {
    origin: string | string[];
    credentials: boolean;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };

  // Logging
  logging: {
    level: string;
  };

  // AWS
  aws: {
    region: string;
  };
}

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): AppConfig {
  // Helper function to get required environment variable
  const getEnvVar = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  };

  // Helper function to get optional environment variable
  const getOptionalEnvVar = (key: string, defaultValue: string): string => {
    return process.env[key] || defaultValue;
  };

  return {
    // Environment
    nodeEnv: getOptionalEnvVar('NODE_ENV', 'development'),
    port: parseInt(getOptionalEnvVar('PORT', '3000'), 10),

    // Database
    database: {
      host: getOptionalEnvVar('DB_HOST', 'localhost'),
      port: parseInt(getOptionalEnvVar('DB_PORT', '5432'), 10),
      name: getEnvVar('DB_NAME'),
      user: getOptionalEnvVar('DB_USER', ''),
      password: getOptionalEnvVar('DB_PASSWORD', ''),
      resourceArn: process.env.DB_CLUSTER_ARN, // Optional for RDS Data API
      secretArn: process.env.DB_SECRET_ARN,     // Optional for RDS Data API
      maxConnections: parseInt(getOptionalEnvVar('DB_MAX_CONNECTIONS', '20'), 10),
      idleTimeoutMillis: parseInt(getOptionalEnvVar('DB_IDLE_TIMEOUT_MS', '30000'), 10),
      connectionTimeoutMillis: parseInt(getOptionalEnvVar('DB_CONNECTION_TIMEOUT_MS', '2000'), 10),
    },

    // JWT Configuration
    jwt: {
      accessTokenSecret: getEnvVar('JWT_ACCESS_SECRET'),
      accessTokenExpiry: getOptionalEnvVar('JWT_ACCESS_EXPIRY', '15m'),
      refreshTokenExpiry: getOptionalEnvVar('JWT_REFRESH_EXPIRY', '30d'),
    },

    // OAuth Configuration
    oauth: {
      google: {
        clientId: getEnvVar('GOOGLE_CLIENT_ID'),
        clientSecret: getEnvVar('GOOGLE_CLIENT_SECRET'),
        redirectUri: getEnvVar('GOOGLE_REDIRECT_URI'),
      },
      github: {
        clientId: getEnvVar('GITHUB_CLIENT_ID'),
        clientSecret: getEnvVar('GITHUB_CLIENT_SECRET'),
        redirectUri: getEnvVar('GITHUB_REDIRECT_URI'),
      },
    },

    // Security
    security: {
      bcryptRounds: parseInt(getOptionalEnvVar('BCRYPT_ROUNDS', '10'), 10),
      sessionExpiry: parseInt(getOptionalEnvVar('SESSION_EXPIRY_SECONDS', '2592000'), 10), // 30 days
      stateTokenExpiry: parseInt(getOptionalEnvVar('STATE_TOKEN_EXPIRY_SECONDS', '600'), 10), // 10 minutes
    },

    // CORS
    cors: {
      origin: process.env.CORS_ORIGIN 
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : ['http://localhost:3000'],
      credentials: getOptionalEnvVar('CORS_CREDENTIALS', 'true') === 'true',
    },

    // Rate Limiting
    rateLimit: {
      windowMs: parseInt(getOptionalEnvVar('RATE_LIMIT_WINDOW_MS', '900000'), 10), // 15 minutes
      maxRequests: parseInt(getOptionalEnvVar('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
    },

    // Logging
    logging: {
      level: getOptionalEnvVar('LOG_LEVEL', 'info'),
    },

    // AWS
    aws: {
      region: getOptionalEnvVar('AWS_REGION', 'us-east-1'),
    },
  };
}

/**
 * Singleton configuration instance
 */
let configInstance: AppConfig | null = null;

/**
 * Get application configuration
 * Lazily loads configuration on first access
 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Export default configuration
 */
export default getConfig();