import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as H from 'history';
import uuid from 'uuid/v4';

interface PageKey {
  pathname: string;
  pageId: string;
}

const pageKeyStr = ({ pathname, pageId }: PageKey) =>
  `${pathname}?pageId=${pageId}`;

class HistoryController {
  // page id -> history
  historyMap: Map<string, H.History> = new Map();

  connect(page: PageKey, history: H.History) {
    this.historyMap.set(page.pageId, history);
  }

  push(prev: PageKey, next: PageKey, state: unknown) {
    const history = this.historyMap.get(prev.pageId);
    if (!history) {
      throw new Error('Invalid page id.');
    }

    this.historyMap.set(next.pageId, history);
    window.sessionStorage.setItem(pageKeyStr(next), JSON.stringify(state));
    history.push(next.pathname, next.pageId);
  }

  replace(next: PageKey, state: unknown) {
    const history = this.historyMap.get(next.pageId);
    if (!history) {
      throw new Error('Invalid page id.');
    }

    this.historyMap.set(next.pageId, history);
    window.sessionStorage.setItem(pageKeyStr(next), JSON.stringify(state));
    history.replace(next.pathname, next.pageId);
  }

  pop(page: PageKey): unknown {
    const history = this.historyMap.get(page.pageId);
    console.log({ 0: history });
    if (!history) {
      return undefined;
    }

    const state = window.sessionStorage.getItem(pageKeyStr(page));
    console.log({ 1: state });
    if (!state) {
      return undefined;
    }

    const t = JSON.parse(state);
    console.log({ 2: t });
    return t;
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

class Sign extends React.PureComponent<SignProps, SignState> {
  constructor(props: SignProps) {
    super(props);

    this.state = initSignState;
  }

  componentWillReceiveProps(prev: SignProps, next: SignProps) {
    if (prev.pageId === next.pageId) return;

    const { pageId } = this.props;
    const pathname = '/sign';

    const state = historyController.pop({ pathname, pageId }) as SignState | undefined;
    if (state) {
      this.setState(state);
    }
  }

  private onMailChange(ev: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ mail: ev.target.value });
  }

  private onPasswordChange(ev: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ password: ev.target.value });
  }

  private onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    const { props: { pageId }, state: { phase } } = this;
    const page = { pathname: '/sign', pageId };

    if (phase === 'mail') {
      ev.preventDefault();
      historyController.replace(page, this.state);
      this.setState({ phase: 'password' }, () => {
        historyController.push(page, { pathname: '/', pageId: uuid() }, this.state);
      });
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
        <form
          action='/sign/login'
          method='POST'
          onSubmit={ev => this.onSubmit(ev)}>
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

    const { pageId } = this.props;

    this.state = initAppState(pageId);
  }

  componentDidMount() {
    const { loading } = this.state;

    if (loading) {
    }
  }

  componentWillReceiveProps(prev: AppProps, next: AppProps) {
    if (prev.pageId === next.pageId) return;

    const { pageId } = this.props;
    const pathname = '/';

    const state = historyController.pop({ pathname, pageId }) as AppState | undefined;
    if (state) {
      this.setState(state);
    }
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
  const appElement = document.getElementById('app');
  const history = H.createBrowserHistory();

  let pathname = history.location.pathname;
  let pageId = uuid();

  historyController.connect({ pathname, pageId }, history);

  const render = (location: H.Location) => {
    console.log({ location, pageId });
    ReactDOM.render(
      <AppRootComponent pageId={pageId} />,
      appElement,
    );
  };

  history.listen((location, action) => {
    pageId = location.state;
    render(location);
  });
  render(history.location);
};

main();
