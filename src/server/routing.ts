import { OAuth } from 'oauth';
import Router from 'universal-router';
import { TwitterConfig } from '../types';

interface RouteResultJson {
  json: {};
}

interface RouteContext {
  method: 'GET' | 'POST';
  query: {};
  body: {};
  auth: string | undefined;
  oauth?: {
    verifier: string,
  };
}

type RouteResult =
  | RouteResultJson
  | { next: boolean }
  | { redirect: string }
  | void;

export type ServerRouter = Router<RouteContext, RouteResult>;

export const oauthRequest = (oauthClient: OAuth, twitterConfig: TwitterConfig) => {
  return new Promise<RouteResult>((resolve, reject) => {
    oauthClient.getOAuthRequestToken((err, token, token_secret) => {
      if (err) {
        return reject(err);
      }

      const redirectURI = `https://api.twitter.com/oauth/authenticate?oauth_token=${token}`;

      // FIXME: use local storage per client
      twitterConfig.oauthState = { token, token_secret };

      resolve({ redirect: redirectURI });
    });
  });
};

export const oauthCallback = (oauthClient: OAuth, twitterConfig: TwitterConfig, verifier: string) => {
  return new Promise<RouteResult>((resolve, reject) => {
    if (!twitterConfig.oauthState) {
      return reject('Invalid auth flow.');
    }

    const { oauthState: { token, token_secret } } = twitterConfig;
    return oauthClient.getOAuthAccessToken(token, token_secret, verifier,
      (err, token, token_secret, results) => {
        if (err) {
          return reject(err);
        }

        const userAuth = { ...twitterConfig.adminAuth, token, token_secret };

        // FIXME: use local storage per client
        twitterConfig.userAuth = userAuth;

        resolve({ redirect: '/' });
      });
  });
};

export const serverRouterWith = (oauthClient: OAuth, twitterConfig: TwitterConfig) => new Router<RouteContext, RouteResult>([
  {
    path: '/api/twitter-auth-request',
    action: () => oauthRequest(oauthClient, twitterConfig),
  },
  {
    path: '/api/twitter-auth-callback',
    async action(context) {
      const verifier = (context.query as any).oauth_verifier as string | undefined;
      if (!verifier) {
        throw 'Invalid auth flow';
      }
      return await oauthCallback(oauthClient, twitterConfig, verifier);
    },
  },
  {
    // Except for the above two, we require valid authorization header.
    path: '(.*)',
    async action(context) {
      if (context.auth === undefined) {
        return { json: { forbidden: 'bad' } };
      }
      return await context.next();
    },
  },
  {
    path: '/api/tweet',
    async action(context) {
    },
  },
  {
    path: '/api/hello',
    async action() {
      return { json: { hello: 'world' } };
    },
  },
  {
    path: '(.*)',
    async action() {
      return { next: true };
    },
  },
]);
