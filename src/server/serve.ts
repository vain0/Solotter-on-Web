import { config as dotEnvConfig } from 'dotenv';
import express from 'express';
import * as path from 'path';
import { exhaust } from '../utils';
import { oauthServiceWith, oauthServiceStub } from './infra-twitter';
import {
  ServerRouter,
  serverRouterWith,
} from './routing';
import { TestSuite } from './testing';
import uuid from "uuid/v4"

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

export const serveTests: TestSuite = ({ test, is }) => {
  test('hello', () => {
    is(2 * 3, 6);
  });

  test('parseAuthHeader', () => {
    is(parseAuthHeader('Bearer deadbeef'), 'deadbeef');
    is(parseAuthHeader(undefined), undefined);
    is(parseAuthHeader('Basic hoge'), undefined);
  });

  test('auth flow', async () => {
    const serverRouter = serverRouterWith(oauthServiceStub())

    // Firstly user requests auth by clicking button.
    const authId = uuid();
    const r1 = await serverRouter.resolve({
      pathname: '/api/twitter-auth-request',
      body: { authId },
    })
    is("redirect" in r1, true)

    // After redirect, twitter auth, then redirect to the callback api.
    const r2 = await serverRouter.resolve({
      pathname: '/api/twitter-auth-callback',
      query: { oauth_token: 'my_token', oauth_verifier: 'my_verifier', },
    })
    is("redirect" in r2, true)

    // The client fetches auth tokens.
    const auth = await serverRouter.resolve({
      pathname: '/api/twitter-auth-end',
      body: { authId }
    })
    is(auth !== undefined, true)
  })
};
