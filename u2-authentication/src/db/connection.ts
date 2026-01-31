/**
 * Database Connection Pool Management
 * 
 * Manages PostgreSQL connection pool with:
 * - Automatic retry with exponential backoff
 * - Health checks
 * - Graceful shutdown
 */

import { Pool, PoolConfig, PoolClient } from 'pg';
import { logger } from '../utils/logger';

/**
 * Connection pool singleton
 */
let pool: Pool | null = null;

/**
 * Connection configuration from environment variables
 */
function getPoolConfig(): PoolConfig {
  const config: PoolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'auth_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    min: parseInt(process.env.DB_POOL_MIN || '5', 10),
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  // Use connection string if DATABASE_URL is provided (for Aurora Serverless)
  if (process.env.DATABASE_URL) {
    config.connectionString = process.env.DATABASE_URL;
  }

  return config;
}

/**
 * Initialize database connection pool
 * 
 * @param maxRetries - Maximum number of connection attempts
 * @param retryDelayMs - Initial delay between retries (exponential backoff)
 * @returns Initialized connection pool
 */
export async function initializePool(
  maxRetries: number = 5,
  retryDelayMs: number = 1000
): Promise<Pool> {
  if (pool) {
    logger.info('Database pool already initialized');
    return pool;
  }

  const config = getPoolConfig();
  pool = new Pool(config);

  // Set up event listeners
  pool.on('error', (err) => {
    logger.error('Unexpected database pool error', { error: err.message });
  });

  pool.on('connect', () => {
    logger.debug('New database connection established');
  });

  pool.on('remove', () => {
    logger.debug('Database connection removed from pool');
  });

  // Attempt connection with retry logic
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    try {
      // Test connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      logger.info('Database connection pool initialized successfully', {
        host: config.host || 'via connection string',
        database: config.database || 'from connection string',
        poolMin: config.min,
        poolMax: config.max,
      });

      return pool;
    } catch (error) {
      lastError = error as Error;
      attempt++;

      if (attempt < maxRetries) {
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        logger.warn('Database connection failed, retrying...', {
          attempt,
          maxRetries,
          retryInMs: delay,
          error: lastError.message,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  logger.error('Failed to initialize database pool after all retries', {
    attempts: maxRetries,
    lastError: lastError?.message,
  });

  throw new Error(
    `Failed to connect to database after ${maxRetries} attempts: ${lastError?.message}`
  );
}

/**
 * Get the database connection pool
 * 
 * @returns Connection pool instance
 * @throws Error if pool is not initialized
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}

/**
 * Execute a query using a connection from the pool
 * 
 * @param text - SQL query text
 * @param params - Query parameters
 * @returns Query result
 */
export async function query(text: string, params?: any[]) {
  const pool = getPool();
  const start = Date.now();

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    logger.debug('Database query executed', {
      query: text.substring(0, 100),
      duration,
      rows: result.rowCount,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Database query failed', {
      query: text.substring(0, 100),
      duration,
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Execute a transaction with automatic rollback on error
 * 
 * @param callback - Transaction callback function
 * @returns Transaction result
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');

    logger.debug('Transaction committed successfully');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back', {
      error: (error as Error).message,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database connection health
 * 
 * @returns true if database is healthy, false otherwise
 */
export async function checkHealth(): Promise<boolean> {
  try {
    if (!pool) {
      logger.warn('Health check failed: pool not initialized');
      return false;
    }

    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    client.release();

    logger.debug('Database health check passed', {
      serverTime: result.rows[0].time,
    });

    return true;
  } catch (error) {
    logger.error('Database health check failed', {
      error: (error as Error).message,
    });
    return false;
  }
}

/**
 * Get pool statistics
 * 
 * @returns Pool statistics object
 */
export function getPoolStats() {
  if (!pool) {
    return null;
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * Gracefully close the database connection pool
 * 
 * This should be called during application shutdown
 */
export async function closePool(): Promise<void> {
  if (!pool) {
    logger.info('No database pool to close');
    return;
  }

  try {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed successfully');
  } catch (error) {
    logger.error('Error closing database pool', {
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Setup graceful shutdown handlers
 * 
 * Automatically closes the pool on process termination
 */
export function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, closing database connections...`);
    await closePool();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}