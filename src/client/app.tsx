import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as H from 'history';
import { Patch, merge } from '../utils';
import uuid from 'uuid/v4';

const freshPageId = () => uuid();

class HistoryController {
  historyMap: Map<string, H.History> = new Map();
  historyIdFromPageId: Map<string, string> = new Map();

  connect(historyId: string, pageId: string, history: H.History) {
    this.historyMap.set(historyId, history);
    this.historyIdFromPageId.set(pageId, historyId);
  }

  push(prevPageId: string, pageId: string, state: unknown) {
    const historyId = this.historyIdFromPageId.get(prevPageId);
    const history = historyId && this.historyMap.get(historyId);

    if (!historyId || !history) {
      throw new Error('Invalid page id.');
    }

    // history.push()

    this.historyIdFromPageId.set(pageId, historyId);
    window.sessionStorage.setItem(pageId, JSON.stringify(state));
  }

  replace(pageId: string, state: unknown) {
    const historyId = this.historyIdFromPageId.get(pageId);
    const history = historyId && this.historyMap.get(historyId);

    if (!historyId || !history) {
      throw new Error('Invalid page id.');
    }

    history.replace(history.location.pathname, state);

    this.historyIdFromPageId.set(pageId, historyId);
    window.sessionStorage.setItem(pageId, JSON.stringify(state));
  }

  pop(pageId: string): unknown {
    const history = this.historyIdFromPageId.get(pageId);
    if (!history) {
      throw new Error('Invalid page id.');
    }

    const state = window.sessionStorage.getItem(pageId);
    if (!state) {
      throw new Error('Invalid page id.');
    }
    return state;
  }
}

// Holy global var!
const historyController = new HistoryController();

// App models.

type AppArea = 'sign' | 'edit';

type SignPhase = 'mail' | 'password';

interface AccessUser {
  accessToken: string;
  displayName: string;
}

interface SignProps {
  pageId: string;
}

interface SignState {
  phase: SignPhase;
  mail: string;
  password: string;
}

const initSignState: SignState = {
  phase: 'mail',
  mail: '',
  password: '',
};

interface AppState {
  pageId: string;
  pathname: string;
  area: AppArea;
  loading: boolean;
  accessUser?: AccessUser;
}

const initAppState = (pageId: string): AppState => ({
  pageId,
  pathname: '/',
  area: 'sign',
  loading: true,
  accessUser: undefined,
});

const exhaust = (x: never): never => x;

const resolveRoute = async (state: AppState): Promise<AppState> => {
  throw '404';
};

class Sign extends React.PureComponent<SignProps, SignState> {
  constructor(props: SignProps) {
    super(props);

    this.state = initSignState;
  }

  private onMailChange(ev: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ mail: ev.target.value });
  }

  private onPasswordChange(ev: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ password: ev.target.value });
  }

  private onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    const { phase } = this.state;
    if (phase === 'mail') {
      ev.preventDefault();
      this.setState({ phase: 'password' });
    } else if (phase === 'password') {
      // jump with form
    } else {
      return exhaust(phase);
    }
  }

  private renderContent() {
    const { phase, mail, password } = this.state;
    if (phase === 'mail') {
      return (
        <section>
          <label htmlFor='mail-input'>Mail Address</label>
          <input
            id='mail-input' key='mail-input'
            type='email'
            autoFocus
            required
            value={mail}
            onChange={ev => this.onMailChange(ev)} />
        </section>
      );
    } else if (phase === 'password') {
      return (
        <section>
          <label htmlFor='password-input'>Password</label>
          <input
            hidden
            id='mail-input' name='mail' key='mail-input'
            type='email'
            value={mail}
            onChange={ev => this.onMailChange(ev)} />
          <input
            id='password-input' name='password' key='password-input'
            type='password'
            autoComplete='current-password'
            required
            value={password}
            onChange={ev => this.onPasswordChange(ev)} />
        </section>
      );
    } else {
      return exhaust(phase);
    }
  }

  render() {
    return (
      <article key='sign-component'>
        <h2>Sign</h2>
        <form action='' method='POST' onSubmit={ev => this.onSubmit(ev)}>
          {this.renderContent()}
          <button>Submit</button>
        </form>
      </article>
    );
  }
}

interface AppProps {
  pageId: string;
}

export class AppRootComponent extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

    const { pageId } = props;

    this.state = initAppState(pageId);
  }

  render() {
    const { pageId } = this.props;
    const { accessUser, area, loading } = this.state;

    if (area === 'sign') {
      return (
        <Sign pageId={pageId} />
      );
    }

    if (loading) {
      return (
        <article
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <div>Loading...</div>
        </article>
      );
    }

    return (
      <article>
        <pre>{JSON.stringify(accessUser)}</pre>
      </article>
    );
  }
}

const main = () => {
  const history = H.createBrowserHistory();
  const historyId = uuid();
  const pageId = uuid();

  historyController.connect(historyId, pageId, history);

  ReactDOM.render(
    <AppRootComponent pageId={pageId} />,
    document.getElementById('app'),
  );
};

main();
