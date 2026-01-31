import axios from 'axios';
import { OAuthProvider, OAuthUserInfo } from '../oauth.service';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  sub: string; // Google User ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
}

export class GoogleProvider implements OAuthProvider {
  readonly name = 'google';
  
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly authorizationUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';
  private readonly userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
  private readonly scopes = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }
  }

  /**
   * Generate Google OAuth authorization URL
   */
  generateAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state: state,
      access_type: 'offline', // Request refresh token
      prompt: 'consent' // Force consent screen to get refresh token
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
    try {
      const response = await axios.post<GoogleTokenResponse>(
        this.tokenUrl,
        {
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data.access_token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        throw new Error(
          `Google token exchange failed: ${errorData?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Fetch user information from Google
   */
  async fetchUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      const response = await axios.get<GoogleUserInfo>(
        this.userInfoUrl,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const userData = response.data;

      // Validate email verification
      if (!userData.email_verified) {
        throw new Error('Google email not verified');
      }

      return {
        providerId: userData.sub,
        email: userData.email,
        displayName: userData.name,
        avatarUrl: userData.picture,
        provider: 'google'
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        throw new Error(
          `Google user info fetch failed: ${errorData?.error?.message || error.message}`
        );
      }
      throw error;
    }
  }
}