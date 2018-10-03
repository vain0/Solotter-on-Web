import { config as dotEnvConfig } from 'dotenv';
import express from 'express';
import { NextFunction, Request, Response } from 'express';
import * as path from 'path';
import serveStatic from 'serve-static';
import { serverRouter } from './routing';
import { TestSuite } from './testing';

const parseAuthHeader = (a: string | undefined): string | undefined => {
  const s = a && a.split(' ') || [];
  return s[0] === 'Bearer' && s[1] || undefined;
};

const serverRoute = (req: Request, res: Response, next: NextFunction) => {
  const auth = parseAuthHeader(req.headers.authorization);

  serverRouter.resolve({
    pathname: req.path,
    body: req.body,
    query: req.query,
    auth,
  }).then(result => {
    if (result === undefined || result === null) {
      return res.sendStatus(200);
    } else if ('next' in result) {
      return next();
    } else {
      return res.json(result.json);
    }
  }).catch(next);
};

export const serve = () => {
  dotEnvConfig();

  const hostname = process.env.HOSTNAME || 'localhost';
  const port = +(process.env.PORT || '8080');
  const distDir = path.normalize(process.env.DIST_DIR || './dist');
  const publicDir = path.normalize(distDir + '/public');

  const twitterConfig = {
    callbackURI: process.env.TWITTER_OAUTH_CALLBACK_URI!,
    adminAuth: {
      consumer_key: process.env.TWITTER_CONSUMER_KEY!,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET!,
      token: process.env.TWITTER_ACCESS_TOKEN!,
      token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
    },
    userAuth: {
      consumer_key: process.env.TWITTER_CONSUMER_KEY!,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET!,
    },
  };

  const app = express();

  app.use(serverRoute);
  app.use(serveStatic(publicDir));

  app.listen(port, hostname, () => {
    console.log(`Serves ${publicDir}`);
    console.log(`Start listening http://${hostname}:${port}/`);
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
};
