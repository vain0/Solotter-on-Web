import * as request from 'request-promise-native';

const USER_AGENT = 'solotter-web';
const REST_API_BASE = 'https://api.twitter.com/1.1';

interface TwitterRestAuth {
  oauth: {
    consumer_key: string,
    consumer_secret: string,
    token: string,
    token_secret: string,
  };
}

type TwitterRestGetRequest =
  | {
    pathname: '/statuses/show',
    qs: {
      id: string,
    },
  };

type TwitterRestPostRequest =
  | {
    pathname: '/statuses/update',
    body: {
      status: string,
      in_reply_to_status_id?: string,
      trim_user: true,
    },
  };

const headers = {
  Accept: '*/*',
  Connection: 'close',
  'User-Agent': USER_AGENT,
};

export const apiGet = async (req: TwitterRestGetRequest & TwitterRestAuth) => {
  const { pathname, oauth, qs } = req;

  const url = `${REST_API_BASE}${pathname}.json`;

  return await request.get(url, {
    oauth,
    qs,
    headers,
    json: true,
  });
};

export const apiPost = async (req: TwitterRestPostRequest & TwitterRestAuth) => {
  const { pathname, oauth, body } = req;

  const url = `${REST_API_BASE}${pathname}.json`;

  return await request.get(url, {
    oauth,
    body,
    headers,
    json: true,
  });
};
