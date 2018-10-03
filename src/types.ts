interface OAuthInfo {
  consumer_key: string;
  consumer_secret: string;
  token: string;
  token_secret: string;
}

export interface TwitterConfig {
  callbackURI: string;
  adminAuth: OAuthInfo;
  userAuth?: OAuthInfo;
  oauthState?: {
    token: string,
    token_secret: string,
  };
}
