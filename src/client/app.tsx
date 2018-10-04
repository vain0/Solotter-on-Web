import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Hello } from './HelloComponent';

class WelcomeComponent extends React.Component {
  login() {
  }

  render() {
    return (
      <article>
        <h1>Solotter</h1>

        <form onSubmit={() => this.login()}>
          <button type='button'>Login with Twitter</button>
        </form>
      </article>
    );
  }
}

interface TweetState {
  text: string;
}

class TweetComponent extends React.Component<{}, TweetState> {
  private onTextChange(text: string) {
    return this.setState({ text });
  }

  private submit() {
    console.log(this.state.text);
  }

  render() {
    const { state: { text } } = this;

    return (
      <article>
        <h2>Tweet | Solotter</h2>

        <form onSubmit={ev => { ev.preventDefault(); this.submit(); }}>
          <textarea
            rows={4}
            placeholder='Text'
            value={text || ''}
            onChange={ev => this.onTextChange(ev.target.value)}
          />

          <button>
            Submit
          </button>
        </form>
      </article>
    );
  }
}

ReactDOM.render(
  <WelcomeComponent />,
  document.getElementById('app'),
);
