import Router from 'universal-router';
import { Context } from 'universal-router';

interface RouteResultJson {
  json: {};
}

interface RouteContext {
  method: 'GET' | 'POST';
  query: {};
  body: {};
  auth: string | undefined;
}

type RouteResult =
  | RouteResultJson
  | { next: boolean }
  | void;

export const serverRouter = new Router<RouteContext, RouteResult>([
  {
    path: '/api/twitter-auth-callback',
    async action() {
      return { json: { accessToken: '1' } };
    },
  },
  {
    // Require valid authorization header.
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
