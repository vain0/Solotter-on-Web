import Router from 'universal-router';
import { Context } from 'universal-router';

interface AccessUser {
  accessToken: string;
  displayName: string;
}

interface RouteContext {
  method: 'GET' | 'POST';
  query: {};
  body: {};
  accessToken?: string;
}

type RouteResult =
  | { json: unknown }
  | { next: boolean }
  | void;

export const serverRouter = new Router<RouteContext, RouteResult>([
  {
    path: '/api/twitter-auth-callback',
    action() {
      return { next: true };
    },
  },
  {
    path: '/api/(.*)',
    action(context) {
      // Require valid authorization header.
      if (context.accessToken === undefined) {
        return { json: { forbidden: 'bad' } };
      }
      return context.next();
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
