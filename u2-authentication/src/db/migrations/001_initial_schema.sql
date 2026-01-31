-- Authentication Domain Initial Schema
-- Created: 2026-02-01
-- Description: User accounts, sessions, and OAuth state management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    oauth_provider VARCHAR(50) NOT NULL,
    oauth_provider_id VARCHAR(255) NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_oauth_user UNIQUE (oauth_provider, oauth_provider_id)
);

-- Index on email for fast lookups
CREATE INDEX idx_users_email ON users(email);

-- Index on OAuth provider and provider ID
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_provider_id);

-- Index on last_login_at for activity queries
CREATE INDEX idx_users_last_login ON users(last_login_at DESC);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(64) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index on user_id for querying user's sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Index on refresh_token_hash for fast token lookups
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token_hash);

-- Index on expires_at for cleanup queries
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Index on active sessions (not revoked and not expired)
CREATE INDEX idx_sessions_active ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;

-- OAuth states table (for CSRF protection)
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_token VARCHAR(64) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    redirect_url VARCHAR(500),
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index on state_token for fast lookups during OAuth callback
CREATE INDEX idx_oauth_states_token ON oauth_states(state_token);

-- Index on expires_at for cleanup queries
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with OAuth provider information';
COMMENT ON TABLE sessions IS 'Active user sessions with refresh tokens';
COMMENT ON TABLE oauth_states IS 'Temporary OAuth state tokens for CSRF protection';

COMMENT ON COLUMN users.oauth_provider IS 'OAuth provider name (google, github)';
COMMENT ON COLUMN users.oauth_provider_id IS 'Unique user ID from OAuth provider';
COMMENT ON COLUMN sessions.refresh_token_hash IS 'SHA-256 hash of refresh token';
COMMENT ON COLUMN sessions.revoked_at IS 'Timestamp when session was revoked (logout)';
COMMENT ON COLUMN oauth_states.state_token IS 'Random state token for OAuth flow';
COMMENT ON COLUMN oauth_states.used_at IS 'Timestamp when state was used (one-time use)';