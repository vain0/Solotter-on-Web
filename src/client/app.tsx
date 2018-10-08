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
};

type Loc = H.Location<LocState | undefined>;

class HistoryController {
  locs: Map<LocId, {
    loc: Loc,
    history: H.History;
    didUpdate: (state: FullState) => void;
  }> = new Map();

  connect(
    prevLocId: string,
    prevState: FullState,
    history: H.History,
    didUpdate: () => void,
  ): Loc {
    // Generate initial location.
    let prevLoc: Loc;
    {
      const loc = history.location as Loc;
      const locState = { locId: prevLocId, state: prevState };
      prevLoc = { ...loc, state: locState };

      console.log(`history connect ${prevLoc.pathname} ${prevLocId}`, prevLoc);
      this.locs.set(prevLocId, { loc: prevLoc, history, didUpdate });
    }

    // Calculate actual first location.
    {
      const midFullState = prevState;

      // Merge history.location.
      const curLoc = history.location as Loc;
      const nextLocId = curLoc.state && curLoc.state.locId || uuid();
      const storedState = curLoc.state && curLoc.state.state;
      const nextFullState = { ...midFullState, ...storedState, locId: nextLocId };
      const nextPathname = reverseRoute(nextFullState);

      const nextLoc = merge(prevLoc, {
        pathname: nextPathname,
        state: { locId: nextLocId, state: nextFullState },
      });

      this.push(prevLocId, nextLoc, { first: true });
      return nextLoc;
    }
  }

  private push(
    prevLocId: LocId,
    nextLoc: Loc,
    { first }: { first: boolean },
  ) {
    if (!nextLoc.state || !nextLoc.state.state || nextLoc.state.locId !== nextLoc.state.state.locId) {
      throw new Error(`Invalid next loc ${JSON.stringify(nextLoc)}`);
    }

    const locObj = this.locs.get(prevLocId)!;
    if (!locObj) throw new Error(`Invalid locId ${prevLocId}`);
    const { loc: prevLoc, history, didUpdate } = locObj;

    const action = first ? 'REPLACE' : 'PUSH';
    const historyUpdate = (p: string, s: LocState) =>
      first ? history.replace(p, s) : history.push(p, s);

    const { locId: nextLocId, state: nextFullState } = nextLoc.state;

    console.log(`history ${action} ${prevLoc.pathname} -> ${nextLoc.pathname} (${nextLocId})`, nextLoc.state.state);
    this.locs.set(nextLocId, { loc: nextLoc, history, didUpdate });
    historyUpdate(nextLoc.pathname, nextLoc.state!);
    didUpdate(nextFullState!);
  }

  private replace(locId: LocId, nextFullState: FullState): void {
    const { loc, history, didUpdate } = this.locs.get(locId)!;

    const nextLoc = merge(loc, { state: { state: nextFullState } });

    console.log(`history replace ${loc.pathname}`, nextFullState);
    this.locs.set(locId, { loc: nextLoc, history, didUpdate });
    history.replace(loc.pathname, nextLoc.state as LocState);
  }

  /**
   * Gets next state for the area.
   *
   * If some state is saved in the controller, return it.
   * Otherwise, just return given state.
   */
  getState<A extends keyof LocalStates, S extends LocalStates[A]>(locId: LocId, area: A, state: S): S {
    console.log(`history getState ${locId} ${area}`, state);

    const locObj = this.locs.get(locId);
    const locState = locObj && locObj.loc.state;
    const storedState = locState && locState.state && locState.state[area] as S;
    if (!storedState) return state;

    return merge(state, storedState as any);
  }

  /**
   * Components should call this after state changed.
   * See `Sign.componentDidUpdate` for usage.
   */
  didUpdate<A extends keyof LocalStates, S extends LocalStates[A]>(
    prevLocId: LocId,
    area: A,
    state: S,
  ): S {
    console.log(`history didUpdate ${prevLocId} ${area}`, state);

    const locObj = this.locs.get(prevLocId);
    if (!locObj) throw new Error(`Unknown locId ${prevLocId}`);
    const { loc: prevLoc } = locObj;
    if (!prevLoc.state) throw new Error(`loc state is not saved ${prevLocId}`);

    const { state: prevFullState } = prevLoc.state;
    if (!prevFullState) throw new Error(`loc state full state is not saved ${prevLocId}`);

    const midFullState: FullState = { ...prevFullState, [area]: state };
    const midPathname = reverseRoute(midFullState);

    if (prevLoc.pathname === midPathname) {
      this.replace(prevLocId, midFullState);
      return state;
    }

    {
      // // Merge history.location.
      // const curLoc = history.location as Loc;
      // const nextLocId = curLoc.state && curLoc.state.state && curLoc.state.state.locId || uuid();
      // const storedState = curLoc.state && curLoc.state.state;
      const storedState = {};
      const nextLocId = uuid();

      const nextFullState = { ...midFullState, ...storedState, locId: nextLocId };
      const nextPathname = reverseRoute(nextFullState);

      const nextLoc = merge(prevLoc, {
        pathname: nextPathname,
        state: { locId: nextLocId, state: nextFullState },
      });

      this.push(prevLocId, nextLoc, { first: false });

      return nextFullState[area] as S;
    }
  }

  bridge(prevLoc: Loc, nextLoc: Loc) {
    const prevLocId = prevLoc.state && prevLoc.state.locId;
    const nextLocId = nextLoc.state && nextLoc.state.locId;
    if (!prevLocId || !nextLocId || this.locs.has(nextLocId)) return;

    const { history, didUpdate } = this.locs.get(prevLocId)!;

    this.locs.set(nextLocId, { loc: nextLoc, history, didUpdate });
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

    const { locId } = this.props;
    this.setState(state => historyController.getState(locId, 'sign', state));
    // this.setState(state => {
    //   return historyController.didUpdate(this.props.locId, 'sign', state);
    // }, () => {
    //   console.log(`sign setState end`, this.state);
    // });
  }

  update(patch: Patch<SignState>) {
    this.setState(state => historyController.didUpdate(this.props.locId, 'sign', merge(state, patch)));
  }

  private onMailChange(ev: React.ChangeEvent<HTMLInputElement>) {
    this.update({ mail: ev.target.value });
  }

  private onPasswordChange(ev: React.ChangeEvent<HTMLInputElement>) {
    this.update({ password: ev.target.value });
  }

  private onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    console.log('submit', this.state);

    const { phase } = this.state;
    if (phase === 'mail') {
      ev.preventDefault();
      this.update({ phase: 'password' });
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

export class AppRootComponent extends React.Component<AppProps, GlobalState> {
  constructor(props: AppProps) {
    super(props);

    const { locId } = this.props;

    this.state = historyController.getState(locId, 'edit', initGlobalState(locId));
  }

  componentDidUpdate(prevProps: AppProps) {
    if (this.props === prevProps) return;

    const { locId } = this.props;
    this.setState(state => historyController.getState(locId, 'edit', state));
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
    if (!state) throw new Error(`history.location must have state ${pathname}`);
    const { locId } = state;

    console.log(`render ${pathname} (${locId})`);
    ReactDOM.render(
      <Sign locId={locId} />,
      // <AppRootComponent locId={locId} />,
      appElement,
      () => console.log('render completed'),
    );
  };

  // Render initial page.
  {
    const initLocId = uuid();
    const initState = initFullState(initLocId);
    const nextLoc = historyController.connect(initLocId, initState, history, () => {
      console.log(`did update`);
    });

    render(nextLoc);

    history.listen(location => {
      console.log(`history listen`);
      historyController.bridge(nextLoc, location as Loc);
      render(location as Loc);
    });
  }
};

main();
