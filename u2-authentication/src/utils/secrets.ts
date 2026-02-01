/**
 * AWS Secrets Manager client with caching
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  GetSecretValueCommandOutput,
} from '@aws-sdk/client-secrets-manager';
import { logger } from './logger';

/**
 * Cached secret with TTL
 */
interface CachedSecret {
  value: string;
  expiresAt: number;
}

/**
 * Secrets Manager configuration
 */
interface SecretsConfig {
  region?: string;
  cacheTtlMs?: number;
}

/**
 * Secrets Manager wrapper with caching
 */
export class SecretsManager {
  private client: SecretsManagerClient;
  private cache: Map<string, CachedSecret>;
  private cacheTtlMs: number;

  constructor(config: SecretsConfig = {}) {
    this.client = new SecretsManagerClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
    });
    
    this.cache = new Map();
    
    // Default cache TTL: 5 minutes
    this.cacheTtlMs = config.cacheTtlMs || 5 * 60 * 1000;
  }

  /**
   * Get secret value from Secrets Manager
   * Uses cache if available and not expired
   */
  async getSecret(secretName: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) {
      logger.debug('Secret retrieved from cache', { secretName });
      return cached.value;
    }

    // Fetch from Secrets Manager
    logger.info('Fetching secret from Secrets Manager', { secretName });
    
    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      });

      const response: GetSecretValueCommandOutput = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} has no string value`);
      }

      const secretValue = response.SecretString;

      // Cache the secret
      this.cache.set(secretName, {
        value: secretValue,
        expiresAt: Date.now() + this.cacheTtlMs,
      });

      logger.info('Secret fetched and cached successfully', { secretName });
      
      return secretValue;
    } catch (error) {
      logger.error('Failed to fetch secret from Secrets Manager', {
        secretName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Failed to fetch secret: ${secretName}`);
    }
  }

  /**
   * Get secret as JSON object
   */
  async getSecretJson<T = any>(secretName: string): Promise<T> {
    const secretString = await this.getSecret(secretName);
    
    try {
      return JSON.parse(secretString) as T;
    } catch (error) {
      logger.error('Failed to parse secret as JSON', {
        secretName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(`Secret ${secretName} is not valid JSON`);
    }
  }

  /**
   * Invalidate cached secret (force refresh on next access)
   */
  invalidateCache(secretName: string): void {
    this.cache.delete(secretName);
    logger.debug('Secret cache invalidated', { secretName });
  }

  /**
   * Clear all cached secrets
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('All secrets cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Singleton instance for secrets manager
 */
let secretsManagerInstance: SecretsManager | null = null;

/**
 * Get secrets manager singleton instance
 */
export function getSecretsManager(config?: SecretsConfig): SecretsManager {
  if (!secretsManagerInstance) {
    secretsManagerInstance = new SecretsManager(config);
  }
  return secretsManagerInstance;
}

/**
 * Helper function to get secret directly
 */
export async function getSecret(secretName: string): Promise<string> {
  const manager = getSecretsManager();
  return manager.getSecret(secretName);
}

/**
 * Helper function to get secret as JSON
 */
export async function getSecretJson<T = any>(secretName: string): Promise<T> {
  const manager = getSecretsManager();
  return manager.getSecretJson<T>(secretName);
}