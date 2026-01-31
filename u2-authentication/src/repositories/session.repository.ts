/**
 * Session Repository
 * 
 * Data access layer for session operations using Repository Pattern
 */

import { Pool } from 'pg';
import {
  Session,
  SessionCreateInput,
  SessionWithUser,
  mapSessionRow,
  sessionToDbRow,
  mapUserRow,
} from '../db/schema';
import { logger } from '../utils/logger';

export class SessionRepository {
  constructor(private pool: Pool) {}

  /**
   * Create a new session
   * 
   * @param input - Session creation data
   * @returns Created session
   */
  async createSession(input: SessionCreateInput): Promise<Session> {
    const dbRow = sessionToDbRow(input);

    const query = `
      INSERT INTO sessions (
        user_id, refresh_token_hash, ip_address, user_agent, expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      dbRow.user_id,
      dbRow.refresh_token_hash,
      dbRow.ip_address,
      dbRow.user_agent,
      dbRow.expires_at,
    ];

    try {
      const result = await this.pool.query(query, values);

      logger.info('Session created successfully', {
        sessionId: result.rows[0].id,
        userId: input.userId,
      });

      return mapSessionRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create session', {
        userId: input.userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get session by ID
   * 
   * @param sessionId - Session UUID
   * @returns Session if found, null otherwise
   */
  async getSessionById(sessionId: string): Promise<Session | null> {
    const query = 'SELECT * FROM sessions WHERE id = $1';

    try {
      const result = await this.pool.query(query, [sessionId]);

      if (result.rows.length === 0) {
        logger.debug('Session not found by ID', { sessionId });
        return null;
      }

      return mapSessionRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get session by ID', {
        sessionId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get session by refresh token hash
   * 
   * @param refreshTokenHash - SHA-256 hash of refresh token
   * @returns Session if found, null otherwise
   */
  async getSessionByRefreshToken(
    refreshTokenHash: string
  ): Promise<Session | null> {
    const query = `
      SELECT * FROM sessions 
      WHERE refresh_token_hash = $1 
        AND revoked_at IS NULL 
        AND expires_at > NOW()
    `;

    try {
      const result = await this.pool.query(query, [refreshTokenHash]);

      if (result.rows.length === 0) {
        logger.debug('Active session not found by refresh token');
        return null;
      }

      return mapSessionRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get session by refresh token', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get all active sessions for a user
   * 
   * @param userId - User UUID
   * @returns Array of active sessions
   */
  async getUserSessions(userId: string): Promise<SessionWithUser[]> {
    const query = `
      SELECT 
        s.*,
        u.id as user_id,
        u.email as user_email,
        u.display_name as user_display_name,
        u.avatar_url as user_avatar_url,
        u.oauth_provider as user_oauth_provider,
        u.oauth_provider_id as user_oauth_provider_id,
        u.last_login_at as user_last_login_at,
        u.created_at as user_created_at,
        u.updated_at as user_updated_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = $1 
        AND s.revoked_at IS NULL 
        AND s.expires_at > NOW()
      ORDER BY s.created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [userId]);

      return result.rows.map((row) => {
        const session = mapSessionRow(row);
        const user = mapUserRow({
          id: row.user_id,
          email: row.user_email,
          display_name: row.user_display_name,
          avatar_url: row.user_avatar_url,
          oauth_provider: row.user_oauth_provider,
          oauth_provider_id: row.user_oauth_provider_id,
          last_login_at: row.user_last_login_at,
          created_at: row.user_created_at,
          updated_at: row.user_updated_at,
        });

        return {
          ...session,
          user,
        };
      });
    } catch (error) {
      logger.error('Failed to get user sessions', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update session last accessed timestamp
   * 
   * @param sessionId - Session UUID
   * @returns Updated session
   */
  async updateSessionAccess(sessionId: string): Promise<Session> {
    const query = `
      UPDATE sessions 
      SET last_accessed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [sessionId]);

      if (result.rows.length === 0) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      logger.debug('Session access timestamp updated', { sessionId });

      return mapSessionRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update session access', {
        sessionId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Revoke a specific session (logout)
   * 
   * @param sessionId - Session UUID
   * @returns Revoked session
   */
  async revokeSession(sessionId: string): Promise<Session> {
    const query = `
      UPDATE sessions 
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [sessionId]);

      if (result.rows.length === 0) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      logger.info('Session revoked', { sessionId });

      return mapSessionRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to revoke session', {
        sessionId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Revoke all sessions for a user (logout all devices)
   * 
   * @param userId - User UUID
   * @returns Number of sessions revoked
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const query = `
      UPDATE sessions 
      SET revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 
        AND revoked_at IS NULL
    `;

    try {
      const result = await this.pool.query(query, [userId]);

      logger.info('All user sessions revoked', {
        userId,
        count: result.rowCount,
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to revoke all user sessions', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete expired sessions (cleanup job)
   * 
   * @returns Number of sessions deleted
   */
  async deleteExpiredSessions(): Promise<number> {
    const query = 'DELETE FROM sessions WHERE expires_at < NOW()';

    try {
      const result = await this.pool.query(query);

      logger.info('Expired sessions deleted', {
        count: result.rowCount,
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to delete expired sessions', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}