import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as H from 'history';
import uuid from 'uuid/v4';

interface PageKey {
  pathname: string;
  pageId: string;
}

interface HistoryState {
  prevPageId?: string;
  pageId: string;
}

interface PageState<T> {
  pageId: string;
  state: T;
}

const pageKeyStr = ({ pathname, pageId }: PageKey) =>
  `${pathname}?pageId=${(pageId || '').substr(0, 7)}`;

class HistoryController {
  historyMap: Map<string, H.History> = new Map();
  fresh: Set<string> = new Set();

  connect(next: PageKey, history: H.History) {
    console.log(`history controller connected: ${pageKeyStr(next)}`);

    this.historyMap.set(next.pageId, history);
    history.replace(next.pathname, { pageId: next.pageId } as HistoryState);
  }

  push(prev: PageKey, next: PageKey, state: unknown) {
    console.log(`history controller push: ${pageKeyStr(prev)} -> ${pageKeyStr(next)}`);

    const history = this.historyMap.get(prev.pageId);
    if (!history) throw new Error('Invalid page id.');

    this.historyMap.set(next.pageId, history);

    window.sessionStorage.setItem(pageKeyStr(next), JSON.stringify(state));
    history.push(next.pathname, { prevPageId: prev.pageId, pageId: next.pageId } as HistoryState);
  }

  private replace(next: PageKey, state: unknown) {
    console.log(`history controller replace: ${pageKeyStr(next)}`);

    const history = this.historyMap.get(next.pageId);
    if (!history) throw new Error('Invalid page id.');

    this.historyMap.set(next.pageId, history);
    window.sessionStorage.setItem(pageKeyStr(next), JSON.stringify(state));
    console.log(`state saved ${pageKeyStr(next)}`, state);
  }

  private pop(next: PageKey): unknown {
    console.log(`history con pop: ${pageKeyStr(next)}`);

    const stateJson = window.sessionStorage.getItem(pageKeyStr(next));
    const state = stateJson && JSON.parse(stateJson);
    console.log(`state loaded ${pageKeyStr(next)}`, state);
    return state;
  }

  calc<T>(pathname: string, prev: PageState<T>, next: PageState<T>): T {
    if (this.fresh.has(next.pageId)) {
      return next.state;
    }

    if (prev.pageId === next.pageId) {
      this.replace({ pathname, pageId: next.pageId }, next.state);
      return next.state;
    }

    const saved = this.pop({ pathname, pageId: next.pageId }) as T | undefined;
    if (!saved) {
      console.error(`state not saved ${pageKeyStr({ pathname, pageId: next.pageId })}`);
      return next.state;
    }
    return saved;
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

    this.state = historyController.calc(
      '/sign', {
        pageId: 'nothing',
        state: initSignState,
      }, {
        pageId: props.pageId,
        state: initSignState,
      });
  }

  componentDidUpdate(prevProps: SignProps, prevState: SignState) {
    const nextState = historyController.calc(
      '/sign', {
        pageId: prevProps.pageId,
        state: prevState,
      }, {
        pageId: this.props.pageId,
        state: this.state,
      });

    if (this.state !== nextState) {
      this.setState(nextState, () => {
        console.log(`state restored`, nextState);
      });
    }
  }

  private get page() {
    return { pathname: '/sign', pageId: this.props.pageId };
  }

  private onMailChange(ev: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ mail: ev.target.value });
  }

  private onPasswordChange(ev: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ password: ev.target.value });
  }

  private onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    const { phase } = this.state;
    const prevPage = this.page;

    if (phase === 'mail') {
      ev.preventDefault();
      const nextPage = { pathname: '/sign', pageId: uuid() };
      historyController.push(prevPage, nextPage, { ...this.state, phase: 'password' });
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

  // static getDerivedStateFromProps(props: SignProps, prevState: SignState) {
  // }

  componentDidMount() {
    const { loading } = this.state;

    if (loading) {
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

  let initPageId = (history.location.state as HistoryState || {}).pageId || uuid();

  const initPage = { pathname: history.location.pathname, pageId: initPageId };
  historyController.connect(initPage, history);

  const render = (location: H.Location) => {
    console.log(`render ${location.pathname} (${(location.state as HistoryState).pageId})`);
    ReactDOM.render(
      <AppRootComponent pageId={(location.state as HistoryState).pageId} />,
      appElement,
    );
  };

  history.listen(location => {
    render(location);
  });
  render(history.location);
};

main();
