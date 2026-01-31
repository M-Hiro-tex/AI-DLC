import crypto from 'crypto';
import axios from 'axios';
import { OAuthStateRepository } from '../repositories/oauth-state.repository';
import { UserRepository } from '../repositories/user.repository';
import { logger } from '../utils/logger';
import { UnauthorizedError, BadRequestError } from '../utils/errors';
import { GoogleProvider } from './oauth/google.provider';
import { GitHubProvider } from './oauth/github.provider';

export interface OAuthProvider {
  name: string;
  generateAuthUrl(state: string, redirectUri: string): string;
  exchangeCodeForToken(code: string, redirectUri: string): Promise<string>;
  fetchUserInfo(accessToken: string): Promise<OAuthUserInfo>;
}

export interface OAuthUserInfo {
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  provider: 'google' | 'github';
}

export class OAuthService {
  private providers: Map<string, OAuthProvider>;
  private oauthStateRepo: OAuthStateRepository;
  private userRepo: UserRepository;

  constructor(
    oauthStateRepo: OAuthStateRepository,
    userRepo: UserRepository
  ) {
    this.oauthStateRepo = oauthStateRepo;
    this.userRepo = userRepo;
    this.providers = new Map();
    
    // Register providers
    this.providers.set('google', new GoogleProvider());
    this.providers.set('github', new GitHubProvider());
  }

  /**
   * Generate OAuth authorization URL with state token
   */
  async generateAuthUrl(
    provider: 'google' | 'github',
    redirectUri: string
  ): Promise<{ authUrl: string; state: string }> {
    try {
      const oauthProvider = this.providers.get(provider);
      if (!oauthProvider) {
        throw new BadRequestError(`Unsupported OAuth provider: ${provider}`);
      }

      // Generate secure random state token
      const state = crypto.randomBytes(32).toString('base64url');
      
      // Store state token in database (expires in 10 minutes)
      await this.oauthStateRepo.createState(state, provider);

      // Generate authorization URL
      const authUrl = oauthProvider.generateAuthUrl(state, redirectUri);

      logger.info('OAuth authorization URL generated', {
        provider,
        state: state.substring(0, 8) + '...' // Log only prefix for security
      });

      return { authUrl, state };
    } catch (error) {
      logger.error('Failed to generate OAuth authorization URL', {
        provider,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Handle OAuth callback and exchange code for user info
   */
  async handleCallback(
    provider: 'google' | 'github',
    code: string,
    state: string,
    redirectUri: string
  ): Promise<OAuthUserInfo> {
    try {
      // Validate state token
      const stateRecord = await this.oauthStateRepo.getState(state);
      
      if (!stateRecord) {
        logger.warn('Invalid OAuth state token', { state: state.substring(0, 8) + '...' });
        throw new UnauthorizedError('Invalid or expired state token');
      }

      if (stateRecord.used) {
        logger.warn('OAuth state token already used', { state: state.substring(0, 8) + '...' });
        throw new UnauthorizedError('State token already used');
      }

      if (stateRecord.provider !== provider) {
        logger.warn('OAuth provider mismatch', {
          expected: stateRecord.provider,
          received: provider
        });
        throw new UnauthorizedError('Provider mismatch');
      }

      // Mark state as used
      await this.oauthStateRepo.markStateUsed(state);

      // Get provider
      const oauthProvider = this.providers.get(provider);
      if (!oauthProvider) {
        throw new BadRequestError(`Unsupported OAuth provider: ${provider}`);
      }

      // Exchange authorization code for access token
      const accessToken = await this.exchangeCodeForToken(
        oauthProvider,
        code,
        redirectUri
      );

      // Fetch user information from provider
      const userInfo = await this.fetchUserInfo(oauthProvider, accessToken);

      logger.info('OAuth callback handled successfully', {
        provider,
        userId: userInfo.providerId
      });

      return userInfo;
    } catch (error) {
      logger.error('Failed to handle OAuth callback', {
        provider,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(
    provider: OAuthProvider,
    code: string,
    redirectUri: string
  ): Promise<string> {
    try {
      const accessToken = await provider.exchangeCodeForToken(code, redirectUri);
      
      logger.info('Authorization code exchanged for access token', {
        provider: provider.name
      });
      
      return accessToken;
    } catch (error) {
      logger.error('Failed to exchange authorization code', {
        provider: provider.name,
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          throw new UnauthorizedError('Invalid authorization code');
        }
        if (error.response?.status === 401) {
          throw new UnauthorizedError('OAuth provider authentication failed');
        }
      }
      
      throw error;
    }
  }

  /**
   * Fetch user information from OAuth provider
   */
  private async fetchUserInfo(
    provider: OAuthProvider,
    accessToken: string
  ): Promise<OAuthUserInfo> {
    try {
      const userInfo = await provider.fetchUserInfo(accessToken);
      
      logger.info('User info fetched from OAuth provider', {
        provider: provider.name,
        userId: userInfo.providerId
      });
      
      return userInfo;
    } catch (error) {
      logger.error('Failed to fetch user info from OAuth provider', {
        provider: provider.name,
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new UnauthorizedError('Invalid access token');
        }
      }
      
      throw error;
    }
  }

  /**
   * Cleanup expired OAuth state tokens
   */
  async cleanupExpiredStates(): Promise<void> {
    try {
      await this.oauthStateRepo.deleteExpiredStates();
      logger.info('Expired OAuth states cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup expired OAuth states', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}