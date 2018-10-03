import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as H from 'history';
import { Patch, merge } from '../utils';
import UniversalRouter, { Context, ActionContext } from 'universal-router';

declare module 'universal-router' {
  interface Route<C extends Context, R = any> {
    result?: R;
  }
}

// App models.

type AppArea = 'sign' | 'edit';

type SignPhase = 'mail' | 'password';

interface SignState {
  pathname: string;
  area: AppArea;
  auth: boolean;
  sign: {
    phase: SignPhase;
    mail: string;
    password: string;
  };
}

interface State {
  pathname: string;
  area: AppArea;
  auth: boolean;
}

type FullState =
  State
  & SignState;

type NextState<S> = (state: S) => Promise<S>;

type Sink<S> = (nextState: NextState<S>) => void;

interface AppProps {
  history: H.History;
}

const exhaust = (x: never): never => x;

const initState: FullState = {
  pathname: '/sign',
  area: 'sign',
  auth: false,
  sign: {
    phase: 'mail',
    mail: '',
    password: '',
  },
};

const toSignMail = (state: SignState) =>
  merge(state, { area: 'sign', sign: { phase: 'mail' } });

const toSignPassword = (state: SignState) =>
  merge(state, { area: 'sign', sign: { phase: 'password' } });

// [Example of breadcrumbs? · Issue #36 · kriasoft/universal-router](https://github.com/kriasoft/universal-router/issues/36#issuecomment-289240177)
const router = new UniversalRouter<{ state: FullState }, Patch<FullState>>([
  {
    path: '/sign/mail',
    result: {
      area: 'sign',
      sign: { phase: 'mail' },
    },
  },
], {
    resolveRoute(context) {
      const r = context.route.result;
      return r && merge(context.state, r);
    },
  });

const resolveRoute = async (state: FullState): Promise<FullState> => {
  const path = state.pathname;

  if (path.startsWith('/sign')) {
    if (path === '/sign/mail') {
      return;
    } else if (path === '/sign/password') {
      return toSignPassword(state);
    } else {
      return toSignMail(state);
    }
  }

  // Require auth.
  if (!state.auth) {
    return toSignMail(state);
  }

  if (path === '/') {
    return merge(state, { area: 'edit' });
  }

  throw '404';
};

const reverseRoute = (state: FullState) => {
  const area = state.area;
  if (area === 'sign') {
    const phase = state.sign.phase;
    if (phase === 'mail') {
      return '/sign/mail';
    } else if (phase === 'password') {
      return '/sign/password';
    } else {
      return exhaust(phase);
    }
  } else if (area === 'edit') {
    return '/';
  } else {
    return state.auth ? '/' : '/sign/mail';
  }
};

const setMail = (mail: string) => async (state: SignState) => {
  return merge(state, { sign: { mail } });
};

const setPassword = (password: string) => async (state: SignState) => {
  return merge(state, { sign: { password } });
};

const advance = async (state: SignState): Promise<SignState> => {
  const phase = state.sign.phase;

  if (phase === 'mail') {
    console.log({ 'mail to password': state });
    return merge(state, { sign: { phase: 'password' } });
  } else if (phase === 'password') {
    console.log({ 'password to edit': state });
    return merge(state, { auth: true, area: 'edit' });
  } else {
    return exhaust(phase);
  }
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

export class AppRootComponent extends React.Component<AppProps, FullState> {
  constructor(props: AppProps) {
    super(props);

    this.state = initState;
  }

  private async updateState(nextState: NextState<FullState>) {
    const { history } = this.props;

    const prevState = this.state;
    const updated = await nextState(prevState);
    const reversed = { ...updated, pathname: reverseRoute(updated) };
    const state = await resolveRoute(reversed);

    console.log({ prevState, updated, state, location: history.location });

    const p = history.location.pathname;
    if (state.pathname !== p) {
      history.push(state.pathname, state);
    } else {
      history.replace(state.pathname, state);
    }
  }

  componentDidMount() {
    const { props: { history } } = this;

    const handle: H.LocationListener = (location, action) => {
      console.log({ location, action });
      if (action === 'POP' || action === 'PUSH' || action === 'REPLACE') {
        this.setState(location.state);
      } else {
        return exhaust(action);
      }
    };

    // 最初のリダイレクトを実行する。
    // Here we prior URL over React state.
    (async () => {
      const givenState: FullState = {
        ...(history.location.state || {}),
        ...this.state,
        pathname: history.location.pathname,
      };

      const resolved = await resolveRoute(givenState);
      const state = { ...resolved, pathname: reverseRoute(resolved) };

      console.log({ 'initial redirect': state, givenState });

      history.replace(state.pathname, state);

      history.listen(handle);
    })();
  }

  render() {
    const { area } = this.state;
    const sink = (nextState: NextState<FullState>) => this.updateState(nextState);

    if (area === 'sign') {
      return renderSign(this.state, sink);
    } else if (area === 'edit') {
      return (<span> Edit page. </span>);
    } else {
      return exhaust(area);
    }
  }
}

const main = () => {
  const history = H.createBrowserHistory();

  ReactDOM.render(
    <AppRootComponent history={history} />,
    document.getElementById('app'),
  );
};

main();
