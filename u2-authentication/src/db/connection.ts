/**
 * Database Connection Management using RDS Data API
 * 
 * Manages database connections using AWS RDS Data API with:
 * - No connection pooling needed (HTTP-based)
 * - Automatic credential management via Secrets Manager
 * - IAM authentication
 * - Simplified Lambda integration
 */

import {
  RDSDataClient,
  ExecuteStatementCommand,
  BatchExecuteStatementCommand,
  BeginTransactionCommand,
  CommitTransactionCommand,
  RollbackTransactionCommand,
} from '@aws-sdk/client-rds-data';
import { logger } from '../utils/logger';

/**
 * RDS Data API Client singleton
 */
let dataApiClient: RDSDataClient | null = null;

/**
 * Database configuration from environment variables
 */
export interface DataApiConfig {
  resourceArn: string;
  secretArn: string;
  database: string;
}

function getDataApiConfig(): DataApiConfig {
  const config: DataApiConfig = {
    resourceArn: process.env.DB_CLUSTER_ARN || '',
    secretArn: process.env.DB_SECRET_ARN || '',
    database: process.env.DB_NAME || 'auth_db',
  };

  if (!config.resourceArn || !config.secretArn) {
    throw new Error(
      'Missing required environment variables: DB_CLUSTER_ARN and DB_SECRET_ARN must be set'
    );
  }

  return config;
}

/**
 * Initialize RDS Data API client
 * 
 * @returns Initialized RDS Data API client
 */
export function initializeDataApiClient(): RDSDataClient {
  if (dataApiClient) {
    logger.info('RDS Data API client already initialized');
    return dataApiClient;
  }

  const region = process.env.AWS_REGION || 'ap-northeast-1';
  
  dataApiClient = new RDSDataClient({
    region,
  });

  logger.info('RDS Data API client initialized successfully', {
    region,
    database: process.env.DB_NAME,
  });

  return dataApiClient;
}

/**
 * Get the RDS Data API client
 * 
 * @returns RDS Data API client instance
 * @throws Error if client is not initialized
 */
export function getDataApiClient(): RDSDataClient {
  if (!dataApiClient) {
    return initializeDataApiClient();
  }
  return dataApiClient;
}

/**
 * Get database configuration
 * 
 * @returns Database configuration object
 */
export function getDbConfig(): DataApiConfig {
  return getDataApiConfig();
}

/**
 * Execute a SQL statement using RDS Data API
 * 
 * @param sql - SQL statement to execute
 * @param parameters - Query parameters
 * @returns Query result
 */
export async function executeStatement(
  sql: string,
  parameters?: Array<{ name: string; value: any }>
) {
  const client = getDataApiClient();
  const config = getDataApiConfig();
  const start = Date.now();

  try {
    const command = new ExecuteStatementCommand({
      resourceArn: config.resourceArn,
      secretArn: config.secretArn,
      database: config.database,
      sql,
      parameters,
      includeResultMetadata: true,
    });

    const result = await client.send(command);
    const duration = Date.now() - start;

    logger.debug('SQL statement executed', {
      sql: sql.substring(0, 100),
      duration,
      numberOfRecordsUpdated: result.numberOfRecordsUpdated,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('SQL statement execution failed', {
      sql: sql.substring(0, 100),
      duration,
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Execute multiple SQL statements in a batch
 * 
 * @param sql - SQL statement template
 * @param parameterSets - Array of parameter sets
 * @returns Batch execution result
 */
export async function batchExecuteStatement(
  sql: string,
  parameterSets: Array<Array<{ name: string; value: any }>>
) {
  const client = getDataApiClient();
  const config = getDataApiConfig();
  const start = Date.now();

  try {
    const command = new BatchExecuteStatementCommand({
      resourceArn: config.resourceArn,
      secretArn: config.secretArn,
      database: config.database,
      sql,
      parameterSets,
    });

    const result = await client.send(command);
    const duration = Date.now() - start;

    logger.debug('Batch SQL statement executed', {
      sql: sql.substring(0, 100),
      batchSize: parameterSets.length,
      duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Batch SQL statement execution failed', {
      sql: sql.substring(0, 100),
      batchSize: parameterSets.length,
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
export async function executeTransaction<T>(
  callback: (transactionId: string) => Promise<T>
): Promise<T> {
  const client = getDataApiClient();
  const config = getDataApiConfig();
  let transactionId: string | undefined;

  try {
    // Begin transaction
    const beginCommand = new BeginTransactionCommand({
      resourceArn: config.resourceArn,
      secretArn: config.secretArn,
      database: config.database,
    });

    const beginResult = await client.send(beginCommand);
    transactionId = beginResult.transactionId;

    if (!transactionId) {
      throw new Error('Failed to begin transaction: no transaction ID returned');
    }

    logger.debug('Transaction begun', { transactionId });

    // Execute transaction callback
    const result = await callback(transactionId);

    // Commit transaction
    const commitCommand = new CommitTransactionCommand({
      resourceArn: config.resourceArn,
      secretArn: config.secretArn,
      transactionId,
    });

    await client.send(commitCommand);
    logger.debug('Transaction committed successfully', { transactionId });

    return result;
  } catch (error) {
    // Rollback transaction on error
    if (transactionId) {
      try {
        const rollbackCommand = new RollbackTransactionCommand({
          resourceArn: config.resourceArn,
          secretArn: config.secretArn,
          transactionId,
        });

        await client.send(rollbackCommand);
        logger.debug('Transaction rolled back', { transactionId });
      } catch (rollbackError) {
        logger.error('Transaction rollback failed', {
          transactionId,
          error: (rollbackError as Error).message,
        });
      }
    }

    logger.error('Transaction failed', {
      transactionId,
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Check database connection health
 * 
 * @returns true if database is healthy, false otherwise
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const result = await executeStatement('SELECT NOW() as time');

    if (result.records && result.records.length > 0) {
      logger.debug('Database health check passed', {
        serverTime: result.records[0][0].stringValue,
      });
      return true;
    }

    logger.warn('Health check failed: no records returned');
    return false;
  } catch (error) {
    logger.error('Database health check failed', {
      error: (error as Error).message,
    });
    return false;
  }
}

/**
 * Helper function to convert RDS Data API parameters
 * 
 * @param params - Key-value pairs of parameters
 * @returns Array of RDS Data API parameters
 */
export function toDataApiParameters(params: Record<string, any>) {
  return Object.entries(params).map(([name, value]) => ({
    name,
    value: convertToDataApiValue(value),
  }));
}

/**
 * Convert a value to RDS Data API parameter format
 * 
 * @param value - Value to convert
 * @returns RDS Data API value object
 */
function convertToDataApiValue(value: any) {
  if (value === null || value === undefined) {
    return { isNull: true };
  }

  if (typeof value === 'string') {
    return { stringValue: value };
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { longValue: value };
    }
    return { doubleValue: value };
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (value instanceof Date) {
    return { stringValue: value.toISOString() };
  }

  if (Buffer.isBuffer(value)) {
    return { blobValue: value };
  }

  // For objects and arrays, serialize to JSON string
  return { stringValue: JSON.stringify(value) };
}

/**
 * No need for graceful shutdown with Data API
 * (HTTP-based, no persistent connections)
 */
export function setupGracefulShutdown(): void {
  logger.info('RDS Data API does not require graceful shutdown (HTTP-based)');
}