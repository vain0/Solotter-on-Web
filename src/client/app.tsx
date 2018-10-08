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
    /** Called whenever page switched. */
    didSwitch: (loc: Loc) => void;
  }> = new Map();

  connect(
    firstState: FullState,
    history: H.History,
    didSwitch: (loc: Loc) => void,
  ): Loc {
    // Generate initial location as sentinel.
    const firstLocId = firstState.locId;
    let firstLoc: Loc;
    {
      const firstLocState = { locId: firstLocId, state: firstState };
      firstLoc = { ...history.location, state: firstLocState };

      console.log(`history connect ${firstLoc.pathname} ${firstLocId}`, firstLoc);
      this.locs.set(firstLocId, { loc: firstLoc, history, didSwitch });
    }

    // Switches to actual first location. We might not need to push.
    let secondLoc: Loc;
    {
      const midFullState = resolveRoute(firstLoc.pathname, firstState);
      secondLoc = this.recall(firstLoc, midFullState, history);
      this.switchLoc(firstLocId, secondLoc, { first: true });
    }

    history.listen((location, action) => {
      console.log(`history listen`);
      this.bridge(secondLoc, location as Loc);

      if (action === 'POP' || action === 'PUSH') {
        didSwitch(location);
      } else if (action !== 'REPLACE') {
        return exhaust(action);
      }
    });

    return secondLoc;
  }

  /**
   * Relays dependencies to new location.
   *
   * This is necessary in case where historyController is cleared by visiting external page.
   */
  private bridge(prevLoc: Loc, nextLoc: Loc) {
    const prevLocId = prevLoc.state && prevLoc.state.locId;
    const nextLocId = nextLoc.state && nextLoc.state.locId;
    if (!prevLocId || !nextLocId || this.locs.has(nextLocId)) return;

    const { history, didSwitch } = this.locs.get(prevLocId)!;

    this.locs.set(nextLocId, { loc: nextLoc, history, didSwitch });
  }

  /**
   * Merges current location into previous one.
   */
  private recall(prevLoc: Loc, midFullState: FullState, history: H.History): Loc {
    const curLoc = history.location as Loc;
    const nextLocId = curLoc.state && curLoc.state.locId || uuid();
    const storedState = curLoc.state && curLoc.state.state;
    const nextFullState = { ...midFullState, ...storedState, locId: nextLocId };
    const nextPathname = reverseRoute(nextFullState);

    return merge(prevLoc, {
      pathname: nextPathname,
      state: { locId: nextLocId, state: nextFullState },
    });
  }

  /** Switches to new location. Pushes a new history unless first. */
  private switchLoc(
    prevLocId: LocId,
    nextLoc: Loc,
    { first }: { first: boolean },
  ) {
    if (!nextLoc.state || !nextLoc.state.state || nextLoc.state.locId !== nextLoc.state.state.locId) {
      throw new Error(`Invalid next loc ${JSON.stringify(nextLoc)}`);
    }
    const locObj = this.locs.get(prevLocId)!;
    if (!locObj) throw new Error(`Invalid locId ${prevLocId}`);
    const { loc: prevLoc, history, didSwitch } = locObj;
    const { locId: nextLocId } = nextLoc.state;

    const action = first ? 'REPLACE' : 'PUSH';
    const historyUpdate = (pathname: string, loc: Loc) => {
      if (first) return history.replace(pathname, loc.state);
      history.push(pathname, loc.state);
    };

    console.log(`history ${action} ${prevLoc.pathname} -> ${nextLoc.pathname} (${nextLocId})`, nextLoc.state.state);
    this.locs.set(nextLocId, { loc: nextLoc, history, didSwitch });
    historyUpdate(nextLoc.pathname, nextLoc);
  }

  /** Replaces current location. */
  private replaceLoc(prevLocId: LocId, nextLoc: Loc): void {
    const { history, didSwitch } = this.locs.get(prevLocId)!;

    if (!nextLoc.state || prevLocId !== nextLoc.state.locId) {
      throw new Error(`history replace must not change locId`);
    }

    console.log(`history replace ${nextLoc.pathname}`, nextLoc);
    this.locs.set(prevLocId, { loc: nextLoc, history, didSwitch });
    history.replace(nextLoc.pathname, nextLoc.state as LocState);
  }

  /**
   * Gets current state for the area.
   *
   * If some state is saved in the controller, you will get it.
   * Otherwise, same state is returned.
   *
   * Use this in components' contructor/componentDidUpdate
   * for update after hitory replace.
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
   * Calculates next update caused by new state.
   */
  private nextUpdate<A extends keyof LocalStates, S extends LocalStates[A]>(
    prevLocId: LocId,
    area: A,
    state: S,
  ): { prevLocId: LocId, nextLoc: Loc, action: 'PASS' | 'PUSH' | 'REPLACE' } {
    console.log(`history didUpdate ${prevLocId} ${area}`, state);

    // Get things.
    const locObj = this.locs.get(prevLocId);
    if (!locObj) throw new Error(`Unknown locId ${prevLocId}`);
    const { loc: prevLoc } = locObj;
    if (!prevLoc.state) throw new Error(`loc state is not saved ${prevLocId}`);
    const { state: prevFullState } = prevLoc.state;
    if (!prevFullState) throw new Error(`loc state full state is not saved ${prevLocId}`);

    // Apply local state changes to global.
    if (prevFullState[area] === state) {
      return { prevLocId, nextLoc: prevLoc, action: 'PASS' };
    }
    const midFullState: FullState = { ...prevFullState, [area]: state };
    const midPathname = reverseRoute(midFullState);

    if (prevLoc.pathname === midPathname) {
      // Use replace if pathname is unchanged.
      const nextLoc = merge(prevLoc, { state: { state: midFullState } });
      return { prevLocId: prevLocId, nextLoc, action: 'REPLACE' };
    } else {
      // Use PUSH if changed. LocId is refreshed.
      const nextLocId = uuid();
      const nextFullState = { ...midFullState, locId: nextLocId };
      const nextPathname = reverseRoute(nextFullState);

      const nextLoc = merge(prevLoc, {
        pathname: nextPathname,
        state: { locId: nextLocId, state: nextFullState },
      });

      return { prevLocId, nextLoc, action: 'PUSH' };
    }
  }

  /**
   * Update state, dispatching history update.
   */
  didUpdate<A extends keyof LocalStates, S extends LocalStates[A]>(
    prevLocId: LocId,
    area: A,
    state: S,
  ) {
    const { nextLoc, action } = this.nextUpdate(prevLocId, area, state);
    if (action === 'REPLACE') {
      this.replaceLoc(prevLocId, nextLoc);
    } else if (action === 'PUSH') {
      this.switchLoc(prevLocId, nextLoc, { first: false });
    } else if (action !== 'PASS') {
      return exhaust(action);
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
    console.log('sign didUpdate', { prevProps, props: this.props });
    const { locId } = this.props;

    if (this.props !== prevProps) {
      this.setState(state => historyController.getState(locId, 'sign', state));
    }

    if (this.state !== prevState) {
      historyController.didUpdate(locId, 'sign', this.state);
    }
  }

  update(patch: Patch<SignState>) {
    this.setState(state => merge(state, patch));
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

  componentDidUpdate(prevProps: AppProps, prevState: GlobalState) {
    const { locId } = this.props;

    if (this.props !== prevProps) {
      this.setState(state => historyController.getState(locId, 'edit', state));
    }

    if (this.state !== prevState) {
      historyController.didUpdate(locId, 'edit', this.state);
    }
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
      // <Sign locId={locId} />,
      <AppRootComponent locId={locId} />,
      appElement,
      () => console.log('render completed'),
    );
  };

  // Render initial page.
  {
    const secondLoc = historyController.connect(
      initFullState(uuid()),
      history,
      render,
    );

    render(secondLoc);
  }
};

main();
