import { config as dotEnvConfig } from 'dotenv';
import { apiGet } from './server/infra-twitter';

export const play = async () => {
  dotEnvConfig();

  const oauth = {
    consumer_key: process.env.TWITTER_CONSUMER_KEY!,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET!,
    token: process.env.TWITTER_ACCESS_TOKEN!,
    token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
  };

  if (!Object.keys(oauth).every(k => (oauth as any)[k])) {
    throw 'Set up .env';
  }

  const response = await apiGet({
    pathname: '/statuses/show',
    qs: {
      id: '',
    },
    oauth,
  });

  console.log(response);
};

// play();
