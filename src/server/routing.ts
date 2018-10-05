import Router from 'universal-router';
import { Context } from 'universal-router';

interface AccessUser {
  accessToken: string;
  displayName: string;
}

interface RouteContext {
  method: 'GET' | 'POST';
  query: any;
  body: any;
  accessToken?: string;
}

type RouteResult =
  | { json: unknown }
  | { next: boolean }
  | { login: AccessUser }
  | void;

const login = (body: {
  mail: string;
  password: string;
}) => {
  const { mail, password } = body;

  if (!(mail === 'u@x.jp' && password === 'pass')) {
    return { json: { err: 'Invalid mail or password' } };
  }

  const accessUser = {
    accessToken: '1',
    displayName: 'John Doe',
  };
  return { login: accessUser };
};

export const serverRouter = new Router<RouteContext, RouteResult>([
  {
    path: '/sign/login',
    action(context) {
      return login(context.body);
    },
  },
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
