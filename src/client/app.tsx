import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as H from 'history';
import uuid from 'uuid/v4';
import UniversalRouter from 'universal-router';
import { merge, Patch } from '../utils';

// design conventions:

// design url so that state is derived from new location (url + state) and,
// vice versa, location (url + state) is derived from new state.

// render phase, we don't modify component state,
// i.e., authorization must be handled before render phase.

// we don't want to use flux because it's too verbose for our tiny app.

// we don't relay callbacks to bottom of component hierarchy,
// because we want to avoid performance issue.

// spec:

// before login, whatever url you visit, we redirect you to /sign/.. (/mail by default).
// after submit mail, transit to password form.
// at this point, you can back to mail phase and input is filled with submitted mail.
// submitted password, you get access token from server and saved locally.

// if logged in or saved access token, you can access points out of /sign .
// (you don't want to see loading...)
// we want to display some data obtained by using access token (say, access user's display name).

// impl:

// on init,
// retrieve access token from local storage,
// if missing, redirect to /sign,
// otherwise fetch access user's data.

// add listener to history changes.
// whenever location changed, restore component state using location state.

// in sign,
// whenever input changes, history replace.
// when mail is submitted, history push and move to password phase.
// when password is submitted, fetch access token (async),
// and save access token to local storage.

// model:
//    area: which we display you to /sign or other.

interface RouteContext {
}

type RouteResult =
  | { redirect: string };

// App models.

type LocId = string;

type SignPhase = 'mail' | 'password';

interface AccessUser {
  accessToken: string;
  displayName: string;
}

interface SignProps {
  locId: LocId;
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

interface GlobalState {
  locId: LocId;
  area: AppArea;
  loading: boolean;
  accessUser?: AccessUser;
}

interface LocalStates {
  sign: SignState;
  edit: {};
}

type AppArea = keyof LocalStates;

type AppState = GlobalState;
type FullState = GlobalState & LocalStates;

const initGlobalState = (locId: string): GlobalState => ({
  locId,
  area: 'sign',
  loading: true,
  accessUser: undefined,
});

const initFullState = (locId: LocId): FullState =>
  ({
    ...initGlobalState(locId),
    sign: initSignState,
    edit: {},
  });

const exhaust = (x: never): never => x;

const resolveRouteSign = (pathname: string, state: SignState): SignState => {
  const toSignMail = (state: SignState): SignState =>
    ({ ...state, phase: 'mail' });

  const toSignPassword = (state: SignState): SignState =>
    ({ ...state, phase: 'password' });

  if (pathname === '/sign/mail') {
    return toSignMail(state);
  } else if (pathname === '/sign/password') {
    return toSignPassword(state);
  } else {
    return toSignMail(state);
  }
};

const reverseRouteSign = (state: SignState): Pathname => {
  const { phase } = state;
  if (phase === 'mail') {
    return '/sign/mail';
  } else if (phase === 'password') {
    return '/sign/password';
  } else {
    return exhaust(phase);
  }
};

const resolveRoute = (pathname: string, state: FullState): FullState => {
  if (pathname.startsWith('/sign')) {
    return { ...state, area: 'sign', sign: resolveRouteSign(pathname, state.sign) };
  }

  // Require auth.
  if (!state.accessUser) {
    return { ...state, area: 'sign', sign: resolveRouteSign(pathname, state.sign) };
  }

  if (pathname === '/') {
    return { ...state, area: 'edit' };
  }

  throw new Error('404');
};

const reverseRoute = (state: FullState) => {
  const area = state.area;
  if (area === 'sign' || !state.accessUser) {
    return reverseRouteSign(state.sign);
  } else {
    return '/';
  }
};

type Pathname = string;

type LocState = {
  locId: LocId,
  state?: FullState,
  history: H.History;
  didUpdate: (state: FullState) => void;
};

type Loc = H.Location<LocState | undefined>;

class HistoryController {
  locs: Map<LocId, Loc> = new Map();

  connect(
    locId: string,
    fullState: FullState,
    history: H.History,
    didUpdate: () => void,
  ): LocId {
    const loc = history.location as Loc;
    const { pathname } = loc;

    const locState = { locId, state: fullState, history, didUpdate };
    const initLoc = { ...loc, state: locState };

    console.log(`history connect: ${pathname} ${locId}`, initLoc);
    this.locs.set(locId, initLoc);

    const nextLocId = this.push(locId, fullState);
    return nextLocId;
  }

  private push(locId: LocId, midFullState: FullState): LocId {
    const loc = this.locs.get(locId)!;
    const { history, didUpdate } = loc.state!;

    const nextLoc = history.location as Loc;
    const nextLocId = nextLoc.state && nextLoc.state.locId || uuid();
    const storedState = nextLoc.state && nextLoc.state.state;
    const nextFullState = { ...midFullState, ...storedState, locId: nextLocId };

    console.log(`history push ${loc.pathname} -> ${nextLoc.pathname} (${nextLocId})`, nextFullState);
    this.locs.set(locId, merge(loc, { state: { state: nextFullState } }));
    history.push(nextLoc.pathname, nextFullState);
    didUpdate(nextFullState);

    return nextLocId;
  }

  private replace(locId: LocId, nextFullState: FullState): void {
    const loc = this.locs.get(locId)!;
    const { history } = loc.state!;

    console.log(`history replace ${loc.pathname}`, nextFullState);
    this.locs.set(locId, merge(loc, { state: { state: nextFullState } }));
    history.replace(loc.pathname, nextFullState);
  }

  /**
   * Gets next state for the area.
   *
   * If some state is saved in the controller, return it.
   * Otherwise, just return given state.
   */
  getState<A extends keyof LocalStates, S extends LocalStates[A]>(locId: LocId, area: A, state: S): S {
    console.log(`history getState ${locId} ${area}`, state);

    const loc = this.locs.get(locId);
    const storedState = loc && loc.state && loc.state.state && loc.state.state[area] as S;
    if (!storedState) return state;

    return merge(state, storedState as any);
  }

  /**
   * Components should call this after state changed.
   * See `Sign.componentDidUpdate` for usage.
   */
  didUpdate<A extends keyof LocalStates, S extends LocalStates[A]>(
    locId: LocId,
    area: A,
    state: S,
  ): S {
    console.log(`history didUpdate ${locId} ${area}`, state);

    const loc = this.locs.get(locId);
    if (!loc) throw new Error(`Unknown locId ${locId}`);
    if (!loc.state) throw new Error(`loc state is not saved ${locId}`);
    const prevFullState = loc.state.state;
    if (!prevFullState) throw new Error(`loc state full state is not saved ${locId}`);

    const midFullState: FullState = { ...prevFullState, [area]: state };
    const prevPathname = loc.pathname;
    const nextPathname = reverseRoute(midFullState);

    if (prevPathname === nextPathname) {
      this.replace(locId, midFullState);
      return state;
    } else {
      const nextLocId = this.push(locId, midFullState);
      return this.getState(nextLocId, area, state);
    }
  }
}

// Holy global var!
const historyController = new HistoryController();

class Sign extends React.PureComponent<SignProps, SignState> {
  constructor(props: SignProps) {
    super(props);

    this.state = historyController.getState(props.locId, 'sign', initSignState);
  }

  componentDidUpdate(prevProps: SignProps, prevState: SignState) {
    if (this.props === prevProps && this.state === prevState) return;

    console.log('sign didUpdate', { prevProps, props: this.props });
    this.setState(state => historyController.didUpdate(this.props.locId, 'sign', state), () => {
      console.log(`sign setState end`, this.state);
    });
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
  locId: string;
}

export class AppRootComponent extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

    const { locId } = this.props;

    this.state = initGlobalState(locId);
  }

  render() {
    const { locId } = this.props;
    const { accessUser, area, loading } = this.state;

    if (area === 'sign') {
      return (
        <Sign locId={locId} />
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

  const render = (loc: Loc) => {
    const { pathname, state } = loc;
    if (!state) throw new Error();
    const { locId } = state;

    console.log(`render ${pathname} (${locId})`);
    ReactDOM.render(
      <AppRootComponent locId={locId} />,
      appElement,
      () => console.log('render completed'),
    );
  };

  history.listen(location => {
    console.log(`history listen`);
    render(location as Loc);
  });

  {
    const locId = uuid();
    historyController.connect(locId, initFullState(locId), history, () => {
      console.log(`did update`);
    });

    render(history.location);
  }
};

main();
