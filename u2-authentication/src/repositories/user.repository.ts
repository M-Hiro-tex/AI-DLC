/**
 * User Repository
 * 
 * Data access layer for user operations using Repository Pattern
 */

import { Pool } from 'pg';
import {
  User,
  UserCreateInput,
  UserUpdateInput,
  OAuthProvider,
  mapUserRow,
  userToDbRow,
} from '../db/schema';
import { logger } from '../utils/logger';

export class UserRepository {
  constructor(private pool: Pool) {}

  /**
   * Create a new user
   * 
   * @param input - User creation data
   * @returns Created user
   */
  async createUser(input: UserCreateInput): Promise<User> {
    const dbRow = userToDbRow(input);

    const query = `
      INSERT INTO users (
        email, display_name, avatar_url, oauth_provider, oauth_provider_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      dbRow.email,
      dbRow.display_name,
      dbRow.avatar_url,
      dbRow.oauth_provider,
      dbRow.oauth_provider_id,
    ];

    try {
      const result = await this.pool.query(query, values);

      logger.info('User created successfully', {
        userId: result.rows[0].id,
        email: input.email,
        provider: input.oauthProvider,
      });

      return mapUserRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create user', {
        email: input.email,
        provider: input.oauthProvider,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get user by ID
   * 
   * @param userId - User UUID
   * @returns User if found, null otherwise
   */
  async getUserById(userId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';

    try {
      const result = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) {
        logger.debug('User not found by ID', { userId });
        return null;
      }

      return mapUserRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get user by ID', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get user by OAuth provider and provider ID
   * 
   * @param provider - OAuth provider (google, github)
   * @param providerId - Unique user ID from provider
   * @returns User if found, null otherwise
   */
  async getUserByOAuth(
    provider: OAuthProvider,
    providerId: string
  ): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE oauth_provider = $1 AND oauth_provider_id = $2
    `;

    try {
      const result = await this.pool.query(query, [provider, providerId]);

      if (result.rows.length === 0) {
        logger.debug('User not found by OAuth', { provider, providerId });
        return null;
      }

      return mapUserRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get user by OAuth', {
        provider,
        providerId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get user by email
   * 
   * @param email - User email address
   * @returns User if found, null otherwise
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';

    try {
      const result = await this.pool.query(query, [email]);

      if (result.rows.length === 0) {
        logger.debug('User not found by email', { email });
        return null;
      }

      return mapUserRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get user by email', {
        email,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update user profile
   * 
   * @param userId - User UUID
   * @param input - Fields to update
   * @returns Updated user
   */
  async updateUser(userId: string, input: UserUpdateInput): Promise<User> {
    const dbRow = userToDbRow(input);
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    Object.entries(dbRow).forEach(([key, value]) => {
      updates.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(userId); // Add userId as last parameter
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`User not found: ${userId}`);
      }

      logger.info('User updated successfully', {
        userId,
        updatedFields: Object.keys(input),
      });

      return mapUserRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update user', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update last login timestamp
   * 
   * @param userId - User UUID
   * @returns Updated user
   */
  async updateLastLogin(userId: string): Promise<User> {
    const query = `
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) {
        throw new Error(`User not found: ${userId}`);
      }

      logger.debug('Last login updated', { userId });

      return mapUserRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update last login', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}