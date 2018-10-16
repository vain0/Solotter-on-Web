import Router from 'universal-router';
import {
  OAuthCallbackQuery,
  OAuthService,
} from './infra-twitter';

interface RouteContext {
  query: unknown;
  body: unknown;
  auth: string | undefined;
}

type RouteResult =
  | { json: unknown }
  | { redirect: string }
  | void;

type GetRouteResult =
  | { static: boolean }
  | { index: boolean };

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
        return await context.next(true);
      },
    },
    {
      path: '/api/users/name',
      async action() {
        // FIXME: Fetch
        return { json: { displayName: 'John Doe', screenName: 'tap' } };
      },
    },
    {
      path: '/api/tweet',
      async action(context) {
        const { status } = context.body as { status: string };
        console.log(status);
        return { json: { ok: true } };
      },
    },
  ]);
};

export const pageRouter = new Router<RouteContext, GetRouteResult>([
  {
    path: ['/styles/(.*)', '/scripts/(.*)', '/favicon.ico'],
    action() {
      return { static: true };
    },
  },
  {
    // Fallback to static file server.
    path: '(.*)',
    action() {
      return { index: true };
    },
  },
]);
