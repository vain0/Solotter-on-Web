import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Hello } from './HelloComponent';
import * as H from 'history';
import UniversalRouter from 'universal-router';
import { Patch, merge } from '../utils';

// Extension.
declare module 'universal-router' {
  interface Route<C extends Context = any, R = any> {
    result?: R;
  }
}

type AppArea = 'sign' | 'edit';

interface State {
  pathname: string;
}

interface AppState extends State {
  area: AppArea;
  auth: boolean;
}

interface AppProps {
  history: H.History;
  router: UniversalRouter<RouteContext<AppState>, RouteResult<AppState>>;
}

type SignPhase = 'mail' | 'password';

interface SignState extends State {
  area: AppArea;
  auth: boolean;
  sign: {
    phase: SignPhase;
    mail: string;
    password: string;
  };
}

type Awaitable<T> =
  | Promise<T>
  | T
  | undefined;

type NextState<S> = (state: S) => Promise<Patch<S>>;

type Sink<S> = (nextState: NextState<S>) => void;

interface RouteContext<S extends State> {
  pathname: string;
  state: S;
  patch: Patch<S>;
}

type RouteResult<S extends State> =
  | { patch: Patch<S> }
  | { redirect: Patch<S> };

// update state:
// resolve + set state

// history listen:
// push なら set state
// pop なら set state + update state

const exhaust = (x: never): never => x;

const advance = async (state: SignState): Promise<Patch<SignState>> => {
  const phase = state.sign.phase;

  if (phase === 'mail') {
    console.log({ 'mail to password': state });
    return { pathname: '/sign/password', sign: { phase: 'password' } };
  } else if (phase === 'password') {
    console.log({ 'password to edit': state });
    return { pathname: '/', auth: true };
  } else {
    return exhaust(phase);
  }
};

const setMail = (mail: string) => async (_state: SignState) => {
  return { sign: { mail } };
};
const setPassword = (password: string) => async (_state: SignState) => {
  return { sign: { password } };
};

const renderSign = (state: SignState, sink: Sink<SignState>) => {
  const renderContent = () => {
    const { sign: { mail, password, phase } } = state;
    if (phase === 'mail') {
      return (
        <section>
          <label>Mail Address</label>
          <input
            key='mail-input'
            type='email'
            value={mail}
            onChange={ev => sink(setMail(ev.target.value))} />
        </section>
      );
    } else if (phase === 'password') {
      return <section>
        <label>Password</label>
        <input
          key='password-input'
          type='password'
          value={password}
          onChange={ev => sink(setPassword(ev.target.value))} />
      </section>;
    } else {
      return exhaust(phase);
    }
  };

  return (
    <article key='sign-component'>
      <h2>Sign</h2>
      <form onSubmit={ev => { ev.preventDefault(); sink(advance); }}>
        {renderContent()}
        <button>Submit</button>
      </form>
    </article>
  );
};

export class AppComponent extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

    const initState: AppState & SignState = {
      pathname: '/sign',
      area: 'sign',
      auth: false,
      sign: {
        phase: 'mail',
        mail: '',
        password: '',
      },
    };
    this.state = initState;
  }

  private redirectLimit = 0;

  private async updateState(nextState: NextState<State>) {
    const { history, router } = this.props;

    console.log({ 0: 'before update', state: this.state, nextState });

    const patch = await nextState(this.state);
    let state = merge(this.state, patch);

    let result: RouteResult<State>;
    while (true) {
      console.log({ 1: 'before resolve', state, patch });

      result = await router.resolve({
        pathname: state.pathname,
        state,
      });

      console.log({ 3: 'resolved', result });

      if ('redirect' in result) {
        if (++this.redirectLimit > 10) {
          throw 'Infinite redirect loop';
        }
        state = merge(state, result.redirect);
        continue;
      } else {
        state = merge(state, result.patch);
        break;
      }
    }

    console.log({ 0: 'before history update', state, location: history.location });

    const p = history.location.pathname;
    if (state.pathname !== p) {
      history.push(state.pathname, state);
    } else {
      history.replace(state.pathname, state);
    }
  }

  componentDidMount() {
    const { props: { history, router } } = this;

    const handle: H.LocationListener = (location, action) => {
      console.log({ location, action });
      if (action === 'POP' || action === 'PUSH' || action === 'REPLACE') {
        this.setState(location.state);
      } else {
        exhaust(action);
      }
    };

    // Initial redirect.
    // Here we prior URL over React state.
    {
      const state = {
        ...(history.location.state || {}),
        ...this.state,
        pathname: history.location.pathname,
      };

      history.replace(state.pathname, state);
    }

    history.listen(handle);
  }

  render() {
    const { area } = this.state;
    const sink = (nextState: NextState<any>) => this.updateState(nextState);

    if (area === 'sign') {
      return renderSign(this.state as any, sink as Sink<SignState>);
    } else if (area === 'edit') {
      return (<span> Edit page. </span>);
    } else {
      return exhaust(area);
    }
  }
}

const signRouter = new UniversalRouter<RouteContext<SignState>, RouteResult<SignState>>([
  {
    path: '/sign/mail',
    result: {
      patch: {
        area: 'sign',
        sign: { phase: 'mail' },
      },
    },
  },
  {
    path: '/sign/password',
    result: {
      patch: {
        area: 'sign',
        sign: { phase: 'password' },
      },
    },
  },
  {
    path: '(.*)',
    result: {
      redirect: { pathname: '/sign/mail' },
    },
  },
], {
    resolveRoute(context): Promise<RouteResult<SignState>> | undefined {
      return context.route.result;
    },
  });

const main = () => {
  const history = H.createBrowserHistory();
  const router = new UniversalRouter<RouteContext<AppState>, RouteResult<State>>([
    {
      path: ['/sign', '/sign/(.*)'],
      async action(context) {
        return await signRouter.resolve(context);
      },
    },
    {
      path: '(.*)',
      async action({ state, next }) {
        if (!state.auth) {
          return { redirect: { pathname: '/sign' } };
        } else {
          return next();
        }
      },
    },
    {
      path: '',
      async action({ state }) {
        return { patch: { ...state, area: 'edit' } };
      },
    },
    {
      path: '(.*)',
      async action() {
        throw '404';
      },
    },
  ]);

  ReactDOM.render(
    <AppComponent history={history} router={router} />,
    document.getElementById('app'),
  );
};

main();
