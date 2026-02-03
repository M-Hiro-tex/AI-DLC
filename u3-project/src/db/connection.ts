/**
 * DynamoDB Connection
 * 
 * Initializes and exports DynamoDB client with AWS SDK v3
 * Uses DynamoDBDocumentClient for simplified data access
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TABLE_CONFIG } from './schema';

// Initialize base DynamoDB client
const client = new DynamoDBClient({
  region: TABLE_CONFIG.region,
  // Credentials automatically loaded from:
  // - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // - IAM role (when running on Lambda/EC2)
  // - AWS credentials file (~/.aws/credentials)
});

// Create DynamoDB Document Client for simplified operations
// This handles marshalling/unmarshalling of native JavaScript types
export const dynamoDbClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    // Convert empty strings and binary to null
    convertEmptyValues: false,
    // Remove undefined values from objects
    removeUndefinedValues: true,
    // Convert JavaScript Set to DynamoDB Set
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    // Return DynamoDB Set as JavaScript Set (not Array)
    wrapNumbers: false,
  },
});

/**
 * Get table name from environment or use default
 */
export function getTableName(): string {
  return TABLE_CONFIG.tableName;
}

/**
 * Test DynamoDB connection
 * Used for health checks
 */
export async function testConnection(): Promise<boolean> {
  try {
    const { DescribeTableCommand } = await import('@aws-sdk/client-dynamodb');
    const command = new DescribeTableCommand({
      TableName: getTableName(),
    });
    await client.send(command);
    return true;
  } catch (error) {
    console.error('DynamoDB connection test failed:', error);
    return false;
  }
}

/**
 * Close DynamoDB connection
 * Call this when shutting down the application
 */
export async function closeConnection(): Promise<void> {
  client.destroy();
}

// Export client and table name for use in repositories
export { client as dynamoDbBaseClient };
export const tableName = getTableName();