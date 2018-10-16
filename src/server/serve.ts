import { config as dotEnvConfig } from 'dotenv';
import express from 'express';
import * as path from 'path';
import { exhaust } from '../utils';
import { oauthServiceWith } from './infra-twitter';
import {
  ServerRouter,
  serverRouterWith,
} from './routing';
import { TestSuite } from './testing';

const parseAuthHeader = (a: string | undefined): string | undefined => {
  const s = a && a.split(' ') || [];
  return s[0] === 'Bearer' && s[1] || undefined;
};

const serverRouteWith =
  (serverRouter: ServerRouter, serveStatic: express.Handler) => {
    const router = express.Router();

    router.post('*', (req, res) => {
      const auth = parseAuthHeader(req.headers.authorization);

      console.error({ path: req.path, query: req.query, body: req.query });

      serverRouter.resolve({
        pathname: req.path,
        body: req.body,
        query: req.query,
        auth,
      }).then(result => {
        if (result === undefined || result === null) {
          return res.sendStatus(200);
        } else if ('redirect' in result) {
          return res.redirect(301, result.redirect);
        } else if ('json' in result) {
          return res.json(result.json);
        } else {
          return exhaust(result);
        }
      }).catch(err => {
        console.error({ err });
        return res.sendStatus(500);
      });
    });

    router.use(serveStatic);
    router.get('*', (req, res, next) => {
      req.url = 'http://localhost:8080/index.html';
      return serveStatic(req, res, next);
    });

    return router;
  };

interface ServeProps {
  port: number;
  publicDir: string;
  serverRoute: express.RequestHandler;
}

export const serve = (props: ServeProps) => {
  const { port, publicDir, serverRoute } = props;
  const app = express();

  app.use(serverRoute);

  app.listen(port, () => {
    console.log(`Serves ${publicDir}`);
    console.log(`Start listening http://localhost:${port}/`);
  });
};

export const bootstrap = () => {
  dotEnvConfig();

  const host = process.env.HOST || 'localhost';
  const port = +(process.env.PORT || '8080');
  const distDir = path.resolve(__dirname, '../../dist');
  const publicDir = path.resolve(distDir, 'public');

  const twitterConfig = {
    callbackURI: process.env.TWITTER_OAUTH_CALLBACK_URI!,
    adminAuth: {
      consumer_key: process.env.TWITTER_CONSUMER_KEY!,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET!,
      token: process.env.TWITTER_ACCESS_TOKEN!,
      token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    },
  };

  const serveStatic = express.static(publicDir, { fallthrough: true, redirect: false });
  const oauthService = oauthServiceWith(twitterConfig);
  const serverRouter = serverRouterWith(oauthService);
  const serverRoute = serverRouteWith(serverRouter, serveStatic);

  serve({
    port,
    publicDir,
    serverRoute,
  });
};

type Injector<D> = <Dx, T>(g: (d: D & Dx) => T) => (d: Dx) => T

/// Creates an injector.
export const injector = <Da>(a: Da): Injector<Da> =>
  g => d => g(Object.assign({}, a, d))

/// Composes two injectors.
export const coinjector = <Da, Db>(
  withA: Injector<Da>,
  withB: Injector<Db>
): Injector<Da & Db> =>
  g => withB(withA(g))

export const serveTests: TestSuite = ({ test, is }) => {
  test('hello', () => {
    is(2 * 3, 6);
  });

  test('parseAuthHeader', () => {
    is(parseAuthHeader('Bearer deadbeef'), 'deadbeef');
    is(parseAuthHeader(undefined), undefined);
    is(parseAuthHeader('Basic hoge'), undefined);
  });

  test("injectors", () => {
    const withHello = injector({ hello: "hello" })
    const withAnswer = injector({ answer: 42 })
    const withHelloAnswer = coinjector(withHello, withAnswer)
    const withHelloWorldAnswer = coinjector(withHelloAnswer, injector({ world: "world" }))

    withHelloAnswer(({ hello, answer }) => {
      is(hello, "hello")
      is(answer, 42)
    })({})

    withHelloWorldAnswer(({ hello, world, answer }) => {
      is(hello + world, "helloworld")
    })({})
  })
};
