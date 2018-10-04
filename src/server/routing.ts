import Router from 'universal-router';
import {
  OAuthCallbackQuery,
  OAuthService,
} from './infra-twitter';

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

export const serverRouterWith = (oauthService: OAuthService) => {
  return new Router<RouteContext, RouteResult>([
    {
      path: '/api/twitter-auth-request',
      action: () => oauthService.oauthRequest(),
    },
    {
      path: '/api/twitter-auth-callback',
      async action(context) {
        const q = context.query as OAuthCallbackQuery;
        const { userAuth } = await oauthService.oauthCallback(q);
        return { json: userAuth };
      },
    },
    {
      // Except for the above two, we require valid authorization header.
      path: '/api/(.*)',
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
      // Fallback to static file server.
      path: '(.*)',
      action() {
        return { next: true };
      },
    },
  ]);
};
