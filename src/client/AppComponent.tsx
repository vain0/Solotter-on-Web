import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { AccessUser, NextState, TwitterAuth } from '../types';
import uuid from 'uuid/v4';

const fetchPOST = (pathname: string, body: unknown) => {
  return fetch(pathname, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
    },
  }).then(res => {
    if (!res.ok) throw new Error('fetch request failed');
    return res.json() as Promise<unknown>;
  }, err => {
    console.error(err);
    throw err;
  });
};

const retrieveAuthId = () => {
  let authId = window.localStorage.getItem("solotterAuthId");
  if (!authId) {
    authId = uuid();
    window.localStorage.setItem("solotterAuthId", authId);
  }
  return authId;
}

const retrieveTwitterAuth = () => {
  const twitterAuthJson = window.localStorage.getItem('twitterAuth');
  return twitterAuthJson && JSON.parse(twitterAuthJson) as TwitterAuth;
};

const maybeLoggedIn = () => !!retrieveTwitterAuth();

const saveTwitterAuth = (auth: TwitterAuth) => {
  window.localStorage.setItem('twitterAuth', JSON.stringify(auth));
};

const apiAuthEnd = async (authId: string) => {
  const data = await fetchPOST('/api/twitter-auth/end', { authId });
  const { userAuth } = data as { userAuth: TwitterAuth | undefined };
  return userAuth
}

const apiAccessUser = async (auth: TwitterAuth) => {
  const data = await fetchPOST('/api/users/name', { auth });
  const user = data as { displayName: string; screenName: string };
  return { ...user, auth };
};

const retrieveAccessUser = async (authId: string) => {
  // In case you are already logged in.
  {
    const auth = retrieveTwitterAuth();
    if (auth) {
      return await apiAccessUser(auth);
    }
  }

  // In case it's at the end of auth flow.
  {
    const auth = await apiAuthEnd(authId);
    if (auth) {
      saveTwitterAuth(auth);
      return await apiAccessUser(auth);
    }
  }
  return undefined;
}

interface AppState {
  loading: boolean;
  authId: string;
  accessUser: AccessUser | undefined;
}

class AppComponent extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      loading: maybeLoggedIn(),
      authId: retrieveAuthId(),
      accessUser: undefined,
    };
  }

  async componentDidMount() {
    const { authId } = this.state;

    const accessUser = await retrieveAccessUser(authId);
    this.setState({ loading: false, accessUser });
  }

  render() {
    const { loading, authId, accessUser } = this.state;

    if (loading) {
      return (
        <article id='loading-component'>
          <header>
            <h1>Solotter</h1>
          </header>

          <main>
            <div className='loading-message'>
              Loading...
            </div>
          </main>
        </article>
      );
    }

    if (accessUser === undefined) {
      return <WelcomeComponent authId={authId} />;
    }

    return <TweetComponent accessUser={accessUser} />;
  }
}

class WelcomeComponent extends React.Component<{ authId: string }, {}> {
  render() {
    return (
      <article id='welcome-component'>
        <header>
          <h1>Solotter | Welcome</h1>
        </header>

        <main>
          <p>
            <b>Solotter</b> is a twitter client for those who want to stay focused on work.
          </p>

          <form method='POST' action='/api/twitter-auth-request'>
            <input type="hidden" name="authId" value={this.props.authId} />
            <button>Login with Twitter</button>
          </form>
        </main>
      </article>
    );
  }
}

interface TweetProps {
  accessUser: AccessUser;
}

interface TweetState {
  loading: boolean;
  text: string;
}

class TweetComponent extends React.Component<TweetProps, TweetState> {
  constructor(props: TweetProps) {
    super(props);

    this.state = {
      loading: false,
      text: '',
    };
  }

  /** Promisified `setState`. */
  private update<K extends keyof TweetState>(nextState: NextState<TweetProps, TweetState, K>) {
    return new Promise<void>(resolve => this.setState(nextState, resolve));
  }

  private getFullName() {
    const { displayName, screenName } = this.props.accessUser;
    return `${displayName} @${screenName}`;
  }

  private onTextChange(text: string) {
    this.setState({ text });
  }

  private async submit() {
    await this.update({ loading: true });
    try {
      await fetchPOST('/api/tweet', { text: this.state.text });
      await this.update({ text: '' });
    } finally {
      await this.update({ loading: false });
    }
  }

  render() {
    const fullName = this.getFullName();
    const { loading, text } = this.state;

    return (
      <article id='tweet-component'>
        <header>
          <h1>Solotter | Tweet</h1>
        </header>

        <main>
          <div className='user-name'>
            {fullName}
          </div>

          <form
            className='tweet-form'
            onSubmit={ev => { ev.preventDefault(); this.submit(); }}>
            <textarea
              className='tweet-textarea'
              rows={4}
              placeholder='What are you doing?'
              readOnly={loading}
              value={text || ''}
              onChange={ev => this.onTextChange(ev.target.value)}
            />

            <button
              className='tweet-button'
              disabled={loading}>
              Submit
            </button>
          </form>
        </main>
      </article>
    );
  }
}

export const main = async () => {
  ReactDOM.render(
    <AppComponent />,
    document.getElementById('app'),
  );
};
