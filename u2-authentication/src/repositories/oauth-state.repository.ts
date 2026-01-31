/**
 * OAuth State Repository
 * 
 * Data access layer for OAuth state token operations
 * Used for CSRF protection during OAuth flow
 */

import { Pool } from 'pg';
import {
  OAuthState,
  OAuthStateCreateInput,
  OAuthProvider,
  mapOAuthStateRow,
  oAuthStateToDbRow,
} from '../db/schema';
import { logger } from '../utils/logger';

export class OAuthStateRepository {
  constructor(private pool: Pool) {}

  /**
   * Create a new OAuth state token
   * 
   * @param input - OAuth state creation data
   * @returns Created OAuth state
   */
  async createState(input: OAuthStateCreateInput): Promise<OAuthState> {
    const dbRow = oAuthStateToDbRow(input);

    const query = `
      INSERT INTO oauth_states (
        state_token, provider, redirect_url, expires_at
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      dbRow.state_token,
      dbRow.provider,
      dbRow.redirect_url,
      dbRow.expires_at,
    ];

    try {
      const result = await this.pool.query(query, values);

      logger.debug('OAuth state created', {
        stateId: result.rows[0].id,
        provider: input.provider,
      });

      return mapOAuthStateRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create OAuth state', {
        provider: input.provider,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get OAuth state by token
   * 
   * @param stateToken - State token string
   * @returns OAuth state if found and not used, null otherwise
   */
  async getState(stateToken: string): Promise<OAuthState | null> {
    const query = `
      SELECT * FROM oauth_states 
      WHERE state_token = $1 
        AND used_at IS NULL 
        AND expires_at > NOW()
    `;

    try {
      const result = await this.pool.query(query, [stateToken]);

      if (result.rows.length === 0) {
        logger.warn('Valid OAuth state not found', { stateToken });
        return null;
      }

      return mapOAuthStateRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get OAuth state', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Mark OAuth state as used (one-time use)
   * 
   * @param stateToken - State token string
   * @returns Updated OAuth state
   */
  async markStateUsed(stateToken: string): Promise<OAuthState> {
    const query = `
      UPDATE oauth_states 
      SET used_at = CURRENT_TIMESTAMP
      WHERE state_token = $1
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [stateToken]);

      if (result.rows.length === 0) {
        throw new Error(`OAuth state not found: ${stateToken}`);
      }

      logger.debug('OAuth state marked as used', {
        stateId: result.rows[0].id,
      });

      return mapOAuthStateRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to mark OAuth state as used', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete expired OAuth states (cleanup job)
   * 
   * @returns Number of states deleted
   */
  async deleteExpiredStates(): Promise<number> {
    const query = 'DELETE FROM oauth_states WHERE expires_at < NOW()';

    try {
      const result = await this.pool.query(query);

      logger.info('Expired OAuth states deleted', {
        count: result.rowCount,
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to delete expired OAuth states', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete used OAuth states older than specified minutes
   * This helps clean up states that were successfully used
   * 
   * @param olderThanMinutes - Delete states used more than this many minutes ago
   * @returns Number of states deleted
   */
  async deleteUsedStates(olderThanMinutes: number = 60): Promise<number> {
    const query = `
      DELETE FROM oauth_states 
      WHERE used_at IS NOT NULL 
        AND used_at < NOW() - INTERVAL '${olderThanMinutes} minutes'
    `;

    try {
      const result = await this.pool.query(query);

      logger.info('Used OAuth states deleted', {
        count: result.rowCount,
        olderThanMinutes,
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to delete used OAuth states', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}