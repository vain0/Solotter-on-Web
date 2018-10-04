export interface TwitterAuth {
  consumer_key: string;
  consumer_secret: string;
  token: string;
  token_secret: string;
}

export interface TwitterConfig {
  callbackURI: string;
  adminAuth: TwitterAuth;
  userAuth?: TwitterAuth;
  oauthState?: {
    token: string,
    token_secret: string,
  };
}
