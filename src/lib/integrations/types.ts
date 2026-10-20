export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  providerAccountId?: string;
}

export interface ConnectedAccount {
  providerAccountId: string;
  email?: string;
}

export interface CalendarEventDraft {
  externalId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location: string | null;
  externalUrl: string | null;
  calendarSourceExternalId: string;
  calendarSourceName: string;
}

export interface EmailMetaDraft {
  externalId: string;
  senderName: string | null;
  senderEmail: string;
  subject: string;
  receivedAt: string;
  isUnread: boolean;
  isImportant: boolean;
  externalUrl: string | null;
}

export interface ProviderAdapter {
  name: string;
  buildAuthUrl(
    redirectUri: string,
    state: string,
    scopes: string[],
    codeChallenge: string,
  ): string;
  exchangeCode(
    code: string,
    redirectUri: string,
    codeVerifier: string,
  ): Promise<OAuthTokens>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
  fetchProfile(accessToken: string): Promise<ConnectedAccount>;
  /** Revoca el token en el proveedor cuando es posible. */
  revoke(token: string): Promise<void>;
}
