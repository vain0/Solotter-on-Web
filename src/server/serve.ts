import express from 'express';
import serveStatic from 'serve-static';
import * as path from 'path';
import * as fs from 'fs';
import { TestSuite } from './testing';
import { serverRouter } from './routing';
import cookieSession from 'cookie-session';

const parseAuthHeader = (a: string | undefined): string | undefined => {
  const s = a && a.split(' ') || [];
  return s[0] === 'Bearer' && s[1] || undefined;
};

const exhaust = (x: never) => x;

interface Session {
  accessUser?: {
    accessToken: string;
    displayName: string;
  };
}

const serverRoute: express.RequestHandler = (req, res, next) => {
  const accessUser = (req.session as Session || {}).accessUser;

  serverRouter.resolve({
    pathname: req.path,
    body: req.body,
    query: req.query,
    accessUser,
  }).then(result => {
    if (result === undefined || result === null) {
      return res.sendStatus(200);
    }
    if ('json' in result) {
      return res.json(result.json);
    }
    if ('login' in result) {
      req.session = {
        ...req.session,
        accessUser: result.login,
      };
      return res.redirect('/');
    }
    if ('next' in result) {
      return next();
    }
    return exhaust(result);
  }).catch(next);
};

export const serve = () => {
  const hostname = 'localhost';
  const port = +(process.env.PORT || '8080');
  const distDir = path.resolve(__dirname, '../../dist');
  const publicDir = path.resolve(distDir, 'public');
  const cookieSecret = process.env.COOKIE_SECRET!;

  const indexHtml = path.resolve(publicDir, 'index.html');

  const app = express();
  const serveFile = serveStatic(publicDir, { fallthrough: true });

  app.use(cookieSession({
    keys: [cookieSecret],
    domain: hostname,
    maxAge: 24 * 60 * 60 * 1000,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(serveFile);
  app.all('*', serverRoute);
  app.use((_req, res) => res.sendFile(indexHtml));

  app.listen(port, () => {
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
