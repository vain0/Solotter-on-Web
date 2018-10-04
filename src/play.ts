import { config as dotEnvConfig } from 'dotenv';
import express, { Request, Response } from 'express';
import { OAuth } from 'oauth';
import { apiGet } from './server/infra-twitter';
import { oauthCallback, oauthRequest } from './server/routing';
import { TwitterConfig } from './types';

const oauthClientWith = (twitterConfig: TwitterConfig) =>
  new OAuth(
    'https://twitter.com/oauth/request_token',
    'https://twitter.com/oauth/access_token',
    twitterConfig.adminAuth.consumer_key,
    twitterConfig.adminAuth.consumer_secret,
    '1.0',
    twitterConfig.callbackURI,
    'HMAC-SHA1',
  );

export const play = async () => {
  dotEnvConfig();

  const hostname = process.env.HOST!;
  const port = +process.env.PORT!;

  const oauth = {
    consumer_key: process.env.TWITTER_CONSUMER_KEY!,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET!,
    token: process.env.TWITTER_ACCESS_TOKEN!,
    token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
  };

  const twitterConfig = {
    callbackURI: process.env.TWITTER_OAUTH_CALLBACK_URI!,
    adminAuth: oauth,
  };

  if (!Object.keys(oauth).every(k => (oauth as any)[k])) {
    return console.error('Set up .env');
  }

  const oauthClient = oauthClientWith(twitterConfig);

  const app = express();
  const router = express.Router();

  router.post('/api/auth/twitter-callback', (req, res) => {
    console.error({ 'callback request': req });

    const verifier = req.query.oauth_verifier as string;
    console.error({ verifier });
    // if (!verifier) {
    //   throw 'Invalid auth flow';
    // }

    oauthCallback(oauthClient, twitterConfig, verifier).then(result => {
      return res.sendStatus(200);
    }).catch(console.error);
  });

  router.all('(.*)', (req, res) => {
    console.error({ req });
    return res.sendStatus(200);
  });

  app.use(router);

  app.listen(port, hostname, () => {
    console.error(`Start listening http://${hostname}:${port}/`);

    oauthRequest(oauthClient, twitterConfig).then(r => {
      console.error({ 'route result': r });
    }).catch(console.error);
  });
};

play();
