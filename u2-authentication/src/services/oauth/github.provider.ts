import axios from 'axios';
import { OAuthProvider, OAuthUserInfo } from '../oauth.service';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserInfo {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
}

interface GitHubEmailInfo {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

export class GitHubProvider implements OAuthProvider {
  readonly name = 'github';
  
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly authorizationUrl = 'https://github.com/login/oauth/authorize';
  private readonly tokenUrl = 'https://github.com/login/oauth/access_token';
  private readonly userInfoUrl = 'https://api.github.com/user';
  private readonly userEmailsUrl = 'https://api.github.com/user/emails';
  private readonly scopes = ['read:user', 'user:email'];

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      throw new Error('GitHub OAuth credentials not configured');
    }
  }

  /**
   * Generate GitHub OAuth authorization URL
   */
  generateAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(' '),
      state: state,
      allow_signup: 'true'
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
    try {
      const response = await axios.post<GitHubTokenResponse>(
        this.tokenUrl,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: redirectUri
        },
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (!response.data.access_token) {
        throw new Error('No access token received from GitHub');
      }

      return response.data.access_token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        throw new Error(
          `GitHub token exchange failed: ${errorData?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Fetch user information from GitHub
   */
  async fetchUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      // Fetch basic user info
      const userResponse = await axios.get<GitHubUserInfo>(
        this.userInfoUrl,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json'
          }
        }
      );

      const userData = userResponse.data;

      // Fetch user emails (GitHub doesn't always include email in user info)
      const emailsResponse = await axios.get<GitHubEmailInfo[]>(
        this.userEmailsUrl,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json'
          }
        }
      );

      // Find primary verified email
      const primaryEmail = emailsResponse.data.find(
        (email) => email.primary && email.verified
      );

      if (!primaryEmail) {
        throw new Error('No verified email found for GitHub user');
      }

      // Use name from profile, fallback to login if not set
      const displayName = userData.name || userData.login;

      return {
        providerId: userData.id.toString(),
        email: primaryEmail.email,
        displayName: displayName,
        avatarUrl: userData.avatar_url,
        provider: 'github'
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        throw new Error(
          `GitHub user info fetch failed: ${errorData?.message || error.message}`
        );
      }
      throw error;
    }
  }
}