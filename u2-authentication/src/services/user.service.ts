import { UserRepository } from '../repositories/user.repository';
import { OAuthUserInfo } from './oauth.service';
import { logger } from '../utils/logger';
import { ConflictError, NotFoundError, BadRequestError } from '../utils/errors';
import { User } from '../db/schema';

export interface UpdateUserProfileData {
  displayName?: string;
  avatarUrl?: string;
}

export class UserService {
  private userRepo: UserRepository;

  constructor(userRepo: UserRepository) {
    this.userRepo = userRepo;
  }

  /**
   * Create new user or update existing on OAuth login
   */
  async createOrUpdateUser(oauthInfo: OAuthUserInfo): Promise<User> {
    try {
      // Check if user exists by OAuth provider + provider ID
      let user = await this.userRepo.getUserByOAuth(
        oauthInfo.provider,
        oauthInfo.providerId
      );

      if (user) {
        // User exists - update profile and last login
        logger.info('Existing user found, updating profile', {
          userId: user.id,
          provider: oauthInfo.provider
        });

        // Update user profile if data has changed
        const updates: Partial<User> = {};
        
        if (user.email !== oauthInfo.email) {
          // Check if new email is already taken by another user
          const existingUserWithEmail = await this.userRepo.getUserByEmail(
            oauthInfo.email
          );
          if (existingUserWithEmail && existingUserWithEmail.id !== user.id) {
            throw new ConflictError('Email already in use by another user');
          }
          updates.email = oauthInfo.email;
        }

        if (user.displayName !== oauthInfo.displayName) {
          updates.displayName = oauthInfo.displayName;
        }

        if (user.avatarUrl !== oauthInfo.avatarUrl) {
          updates.avatarUrl = oauthInfo.avatarUrl || null;
        }

        // Update user if there are changes
        if (Object.keys(updates).length > 0) {
          user = await this.userRepo.updateUser(user.id, updates);
        }

        // Update last login timestamp
        await this.userRepo.updateLastLogin(user.id);

        return user;
      } else {
        // User doesn't exist - create new user
        logger.info('Creating new user from OAuth', {
          provider: oauthInfo.provider,
          providerId: oauthInfo.providerId
        });

        // Check if email is already taken
        const existingUserWithEmail = await this.userRepo.getUserByEmail(
          oauthInfo.email
        );
        if (existingUserWithEmail) {
          throw new ConflictError(
            'Email already registered with different OAuth provider'
          );
        }

        // Create new user
        user = await this.userRepo.createUser({
          email: oauthInfo.email,
          displayName: oauthInfo.displayName,
          avatarUrl: oauthInfo.avatarUrl || null,
          oauthProvider: oauthInfo.provider,
          oauthProviderId: oauthInfo.providerId
        });

        logger.info('New user created successfully', {
          userId: user.id,
          provider: oauthInfo.provider
        });

        return user;
      }
    } catch (error) {
      logger.error('Failed to create or update user', {
        provider: oauthInfo.provider,
        providerId: oauthInfo.providerId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<User> {
    try {
      const user = await this.userRepo.getUserById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      logger.info('User profile retrieved', {
        userId
      });

      return user;
    } catch (error) {
      logger.error('Failed to get user profile', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(
    userId: string,
    updates: UpdateUserProfileData
  ): Promise<User> {
    try {
      // Verify user exists
      const existingUser = await this.userRepo.getUserById(userId);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Validate updates
      if (updates.displayName !== undefined) {
        if (updates.displayName.trim().length === 0) {
          throw new BadRequestError('Display name cannot be empty');
        }
        if (updates.displayName.length > 100) {
          throw new BadRequestError('Display name is too long (max 100 characters)');
        }
      }

      if (updates.avatarUrl !== undefined) {
        if (updates.avatarUrl && updates.avatarUrl.length > 500) {
          throw new BadRequestError('Avatar URL is too long (max 500 characters)');
        }
      }

      // Update user
      const updatedUser = await this.userRepo.updateUser(userId, {
        displayName: updates.displayName,
        avatarUrl: updates.avatarUrl
      });

      logger.info('User profile updated', {
        userId,
        updatedFields: Object.keys(updates)
      });

      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user profile', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check email uniqueness
   */
  async validateEmailUniqueness(email: string): Promise<boolean> {
    try {
      const user = await this.userRepo.getUserByEmail(email);
      const isUnique = user === null;

      logger.debug('Email uniqueness validated', {
        email: email.substring(0, 3) + '***', // Log partial email for privacy
        isUnique
      });

      return isUnique;
    } catch (error) {
      logger.error('Failed to validate email uniqueness', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get user by email (for administrative purposes)
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userRepo.getUserByEmail(email);

      if (user) {
        logger.info('User found by email', {
          userId: user.id
        });
      } else {
        logger.debug('No user found with email');
      }

      return user;
    } catch (error) {
      logger.error('Failed to get user by email', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}