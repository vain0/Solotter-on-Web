import { OAuth } from 'oauth';
import * as request from 'request-promise-native';
import { TwitterAuth, TwitterConfig } from '../types';
import { partial } from '../utils';

const USER_AGENT = 'solotter-web';
const REST_API_BASE = 'https://api.twitter.com/1.1';
const REST_API_AUTH = 'https://twitter.com/oauth/authenticate';

export interface OAuthCallbackQuery {
  oauth_token: string;
  oauth_verifier: string;
}

interface TwitterRestAuth {
  oauth: {
    consumer_key: string,
    consumer_secret: string,
    token: string,
    token_secret: string,
  };
}

type TwitterRestGetRequest =
  | {
    pathname: '/statuses/show',
    qs: {
      id: string,
    },
  };

type TwitterRestPostRequest =
  | {
    pathname: '/statuses/update',
    body: {
      status: string,
      in_reply_to_status_id?: string,
      trim_user: true,
    },
  };

const headers = {
  Accept: '*/*',
  Connection: 'close',
  'User-Agent': USER_AGENT,
};

type OAuthStore = Map<string, { token_secret: string }>;

const oauthClientWith = (twitterConfig: TwitterConfig) =>
  new OAuth(
    'https://twitter.com/oauth/request_token',
    'https://twitter.com/oauth/access_token',
    twitterConfig.adminAuth.consumer_key,
    twitterConfig.adminAuth.consumer_secret,
    '1.0',
    twitterConfig.callbackURI,
    'HMAC-SHA1',
  );

interface OAuthRequestProps {
  oauthClient: OAuth;
  oauthStore: OAuthStore;
}

const oauthRequestWith =
  ({ oauthClient, oauthStore }: OAuthRequestProps) => () =>
    new Promise<{ redirect: string }>((resolve, reject) => {
      oauthClient.getOAuthRequestToken((err, token, token_secret) => {
        if (err) {
          return reject(err);
        }

        const redirectURI = `${REST_API_AUTH}?oauth_token=${token}`;

        oauthStore.set(token, { token_secret });

        resolve({ redirect: redirectURI });
      });
    });

interface OAuthCallbackProps {
  oauthClient: OAuth;
  oauthStore: OAuthStore;
  adminAuth: TwitterAuth;
}

interface OAuthCallbackParams {
  oauth_token: string;
  oauth_verifier: string;
}

const oauthCallbackWith =
  (props: OAuthCallbackProps) => (params: OAuthCallbackParams) =>
    new Promise<{ userAuth: TwitterAuth }>((resolve, reject) => {
      const { oauthClient, oauthStore, adminAuth } = props;
      const { oauth_token: token, oauth_verifier: verifier } = params;

      const { token_secret } = partial(oauthStore.get(token));
      if (!token_secret) {
        return reject('Invalid auth flow.');
      }
      oauthStore.delete(token);

      oauthClient.getOAuthAccessToken(token, token_secret, verifier, (err, token, token_secret) => {
        if (err) {
          return reject(err);
        }

        const userAuth = { ...adminAuth, token, token_secret };
        resolve({ userAuth });
      });
    });

export interface OAuthService {
  oauthRequest(): Promise<{ redirect: string }>;
  oauthCallback(params: OAuthCallbackParams): Promise<{ userAuth: TwitterAuth }>;
}

export const oauthServiceWith
  : (_: TwitterConfig) => OAuthService
  = (twitterConfig: TwitterConfig) => {
    const oauthClient = oauthClientWith(twitterConfig);
    const oauthStore = new Map() as OAuthStore;
    const { adminAuth } = twitterConfig;
    return {
      oauthRequest:
        oauthRequestWith({ oauthClient, oauthStore }),
      oauthCallback:
        oauthCallbackWith({ oauthClient, oauthStore, adminAuth }),
    };
  };

export const apiGet = async (req: TwitterRestGetRequest & TwitterRestAuth) => {
  const { pathname, oauth, qs } = req;

  const url = `${REST_API_BASE}${pathname}.json`;

  return await request.get(url, {
    oauth,
    qs,
    headers,
    json: true,
  });
};

export const apiPost = async (req: TwitterRestPostRequest & TwitterRestAuth) => {
  const { pathname, oauth, body } = req;

  const url = `${REST_API_BASE}${pathname}.json`;

  return await request.get(url, {
    oauth,
    body,
    headers,
    json: true,
  });
};
