/**
 * Database Schema Type Definitions
 * 
 * TypeScript types matching the PostgreSQL schema defined in migrations/001_initial_schema.sql
 */

/**
 * OAuth Provider Types
 */
export type OAuthProvider = 'google' | 'github';

/**
 * User Entity
 * Represents a registered user with OAuth provider information
 */
export interface User {
  id: string; // UUID
  email: string;
  displayName: string;
  avatarUrl: string | null;
  oauthProvider: OAuthProvider;
  oauthProviderId: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Creation Input
 * Required fields for creating a new user
 */
export interface UserCreateInput {
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  oauthProvider: OAuthProvider;
  oauthProviderId: string;
}

/**
 * User Update Input
 * Fields that can be updated on a user
 */
export interface UserUpdateInput {
  email?: string;
  displayName?: string;
  avatarUrl?: string | null;
  lastLoginAt?: Date;
}

/**
 * Session Entity
 * Represents an active user session with refresh token
 */
export interface Session {
  id: string; // UUID
  userId: string; // UUID foreign key to users.id
  refreshTokenHash: string; // SHA-256 hash
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  lastAccessedAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

/**
 * Session Creation Input
 * Required fields for creating a new session
 */
export interface SessionCreateInput {
  userId: string;
  refreshTokenHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
}

/**
 * Session with User Information
 * Extended session data including user details
 */
export interface SessionWithUser extends Session {
  user: User;
}

/**
 * OAuth State Entity
 * Temporary state token for OAuth CSRF protection
 */
export interface OAuthState {
  id: string; // UUID
  stateToken: string;
  provider: OAuthProvider;
  redirectUrl: string | null;
  usedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * OAuth State Creation Input
 * Required fields for creating an OAuth state
 */
export interface OAuthStateCreateInput {
  stateToken: string;
  provider: OAuthProvider;
  redirectUrl?: string | null;
  expiresAt: Date;
}

/**
 * Database Row to Entity Mappers
 * Convert snake_case database columns to camelCase TypeScript properties
 */

export function mapUserRow(row: any): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    oauthProvider: row.oauth_provider,
    oauthProviderId: row.oauth_provider_id,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSessionRow(row: any): Session {
  return {
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    expiresAt: row.expires_at,
    lastAccessedAt: row.last_accessed_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

export function mapOAuthStateRow(row: any): OAuthState {
  return {
    id: row.id,
    stateToken: row.state_token,
    provider: row.provider,
    redirectUrl: row.redirect_url,
    usedAt: row.used_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

/**
 * Entity to Database Row Mappers
 * Convert camelCase TypeScript properties to snake_case database columns
 */

export function userToDbRow(input: UserCreateInput | UserUpdateInput): any {
  const row: any = {};
  
  if ('email' in input) row.email = input.email;
  if ('displayName' in input) row.display_name = input.displayName;
  if ('avatarUrl' in input) row.avatar_url = input.avatarUrl;
  if ('oauthProvider' in input) row.oauth_provider = input.oauthProvider;
  if ('oauthProviderId' in input) row.oauth_provider_id = input.oauthProviderId;
  if ('lastLoginAt' in input) row.last_login_at = input.lastLoginAt;
  
  return row;
}

export function sessionToDbRow(input: SessionCreateInput): any {
  return {
    user_id: input.userId,
    refresh_token_hash: input.refreshTokenHash,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    expires_at: input.expiresAt,
  };
}

export function oAuthStateToDbRow(input: OAuthStateCreateInput): any {
  return {
    state_token: input.stateToken,
    provider: input.provider,
    redirect_url: input.redirectUrl ?? null,
    expires_at: input.expiresAt,
  };
}