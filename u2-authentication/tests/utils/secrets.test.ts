/**
 * Unit tests for secrets utility
 */

import { SecretsManager, getSecretsManager, getSecret, getSecretJson } from '../../src/utils/secrets';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager');

const mockSend = jest.fn();
const mockSecretsManagerClient = SecretsManagerClient as jest.MockedClass<typeof SecretsManagerClient>;

describe('SecretsManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecretsManagerClient.mockImplementation(() => ({
      send: mockSend,
    } as any));
  });

  describe('getSecret', () => {
    it('should fetch secret from AWS Secrets Manager', async () => {
      const secretName = 'test-secret';
      const secretValue = 'secret-value';

      mockSend.mockResolvedValueOnce({
        SecretString: secretValue,
      });

      const manager = new SecretsManager();
      const result = await manager.getSecret(secretName);

      expect(result).toBe(secretValue);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(GetSecretValueCommand));
    });

    it('should cache secret and return from cache on subsequent calls', async () => {
      const secretName = 'test-secret';
      const secretValue = 'secret-value';

      mockSend.mockResolvedValueOnce({
        SecretString: secretValue,
      });

      const manager = new SecretsManager({ cacheTtlMs: 10000 });
      
      // First call - fetch from AWS
      const result1 = await manager.getSecret(secretName);
      expect(result1).toBe(secretValue);
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Second call - return from cache
      const result2 = await manager.getSecret(secretName);
      expect(result2).toBe(secretValue);
      expect(mockSend).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should refetch secret after cache expires', async () => {
      const secretName = 'test-secret';
      const secretValue1 = 'secret-value-1';
      const secretValue2 = 'secret-value-2';

      mockSend
        .mockResolvedValueOnce({ SecretString: secretValue1 })
        .mockResolvedValueOnce({ SecretString: secretValue2 });

      const manager = new SecretsManager({ cacheTtlMs: 100 }); // 100ms cache

      // First call
      const result1 = await manager.getSecret(secretName);
      expect(result1).toBe(secretValue1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second call - cache expired, refetch
      const result2 = await manager.getSecret(secretName);
      expect(result2).toBe(secretValue2);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should throw error if secret has no string value', async () => {
      const secretName = 'test-secret';

      mockSend.mockResolvedValueOnce({
        SecretBinary: Buffer.from('binary-secret'),
      });

      const manager = new SecretsManager();

      await expect(manager.getSecret(secretName)).rejects.toThrow(
        `Secret ${secretName} has no string value`
      );
    });

    it('should throw error if fetching secret fails', async () => {
      const secretName = 'test-secret';
      const error = new Error('Access denied');

      mockSend.mockRejectedValueOnce(error);

      const manager = new SecretsManager();

      await expect(manager.getSecret(secretName)).rejects.toThrow(
        `Failed to fetch secret: ${secretName}`
      );
    });
  });

  describe('getSecretJson', () => {
    it('should parse secret as JSON object', async () => {
      const secretName = 'test-secret';
      const secretObject = { key: 'value', number: 123 };
      const secretValue = JSON.stringify(secretObject);

      mockSend.mockResolvedValueOnce({
        SecretString: secretValue,
      });

      const manager = new SecretsManager();
      const result = await manager.getSecretJson(secretName);

      expect(result).toEqual(secretObject);
    });

    it('should throw error if secret is not valid JSON', async () => {
      const secretName = 'test-secret';
      const invalidJson = 'not-json';

      mockSend.mockResolvedValueOnce({
        SecretString: invalidJson,
      });

      const manager = new SecretsManager();

      await expect(manager.getSecretJson(secretName)).rejects.toThrow(
        `Secret ${secretName} is not valid JSON`
      );
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cached secret', async () => {
      const secretName = 'test-secret';
      const secretValue1 = 'value-1';
      const secretValue2 = 'value-2';

      mockSend
        .mockResolvedValueOnce({ SecretString: secretValue1 })
        .mockResolvedValueOnce({ SecretString: secretValue2 });

      const manager = new SecretsManager();

      // First call - fetch and cache
      const result1 = await manager.getSecret(secretName);
      expect(result1).toBe(secretValue1);

      // Invalidate cache
      manager.invalidateCache(secretName);

      // Second call - refetch because cache was invalidated
      const result2 = await manager.getSecret(secretName);
      expect(result2).toBe(secretValue2);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached secrets', async () => {
      const secret1 = 'secret-1';
      const secret2 = 'secret-2';

      mockSend
        .mockResolvedValueOnce({ SecretString: 'value-1' })
        .mockResolvedValueOnce({ SecretString: 'value-2' })
        .mockResolvedValueOnce({ SecretString: 'value-1-new' })
        .mockResolvedValueOnce({ SecretString: 'value-2-new' });

      const manager = new SecretsManager();

      // Fetch and cache two secrets
      await manager.getSecret(secret1);
      await manager.getSecret(secret2);
      expect(mockSend).toHaveBeenCalledTimes(2);

      // Clear all cache
      manager.clearCache();

      // Refetch both - should call AWS again
      await manager.getSecret(secret1);
      await manager.getSecret(secret2);
      expect(mockSend).toHaveBeenCalledTimes(4);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockSend
        .mockResolvedValueOnce({ SecretString: 'value-1' })
        .mockResolvedValueOnce({ SecretString: 'value-2' });

      const manager = new SecretsManager();

      await manager.getSecret('secret-1');
      await manager.getSecret('secret-2');

      const stats = manager.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('secret-1');
      expect(stats.keys).toContain('secret-2');
    });
  });

  describe('getSecretsManager singleton', () => {
    it('should return the same instance', () => {
      const manager1 = getSecretsManager();
      const manager2 = getSecretsManager();

      expect(manager1).toBe(manager2);
    });
  });

  describe('helper functions', () => {
    it('should call getSecretsManager().getSecret()', async () => {
      const secretName = 'test-secret';
      const secretValue = 'secret-value';

      mockSend.mockResolvedValueOnce({
        SecretString: secretValue,
      });

      const result = await getSecret(secretName);
      expect(result).toBe(secretValue);
    });

    it('should call getSecretsManager().getSecretJson()', async () => {
      const secretName = 'test-secret';
      const secretObject = { key: 'value' };

      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(secretObject),
      });

      const result = await getSecretJson(secretName);
      expect(result).toEqual(secretObject);
    });
  });
});