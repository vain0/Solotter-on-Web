import * as React from "react"
import * as ReactDOM from "react-dom"
import { AccessUser, AppState, NextState, TweetState } from "../types"
import { BrowserAPIClient, BrowserKeyValueStorage, fetchPOST } from "./infra-browser"
import { AppModel } from "./model"

interface TweetProps {
  model: AppModel
  accessUser: AccessUser
}

class AppComponent extends React.Component<{ model: AppModel }, AppState> {
  constructor(props: { model: AppModel }) {
    super(props)
    this.state = props.model.initState()
  }

  async componentDidMount() {
    const { props: { model } } = this
    this.setState(await model.didMount())
  }

  render() {
    const { props: { model }, state: { loading, authId, accessUser } } = this

    if (loading) {
      return (
        <article id="loading-component">
          <header>
            <h1>Solotter</h1>
          </header>

          <main>
            <div className="loading-message">
              Loading...
            </div>
          </main>
        </article>
      )
    }

    if (accessUser === undefined) {
      return <WelcomeComponent authId={authId} />
    }

    return <TweetComponent model={model} accessUser={accessUser} />
  }
}

class WelcomeComponent extends React.Component<{ authId: string }, {}> {
  render() {
    return (
      <article id="welcome-component">
        <header>
          <h1>Solotter | Welcome</h1>
        </header>

        <main>
          <p>
            <b>Solotter</b> is a twitter client for those who want to stay focused on work.
          </p>

          <form method="POST" action="/api/twitter-auth-request">
            <input type="hidden" name="authId" value={this.props.authId} />
            <button>Login with Twitter</button>
          </form>
        </main>
      </article>
    )
  }
}

class TweetComponent extends React.Component<TweetProps, TweetState> {
  constructor(props: TweetProps) {
    super(props)

    this.state = {
      loading: false,
      message: "",
      status: "",
    }
  }

  /** Promisified `setState`. */
  private update<K extends keyof TweetState>(nextState: NextState<TweetProps, TweetState, K>) {
    return new Promise<void>(resolve => this.setState(nextState, resolve))
  }

  private getFullName() {
    const { userAuth: { screen_name } } = this.props.accessUser
    return `@${screen_name}`
  }

  private onTextChange(status: string) {
    this.setState({ status })
  }

  private async submit() {
    const { accessUser: { userAuth } } = this.props
    const { status } = this.state

    await this.update({ loading: true })
    try {
      const { err } = await fetchPOST("/api/statuses/update", { status, userAuth }) as any
      if (err === undefined) {
        await this.update({ status: "", message: "Success!" })
      } else {
        await this.update({ message: "Sorry, it could not be submitted." })
      }
      setTimeout(() => this.update({ message: "" }), 8000)
    } finally {
      await this.update({ loading: false })
    }
  }

  render() {
    const fullName = this.getFullName()
    const { loading, message, status } = this.state

    return (
      <article id="tweet-component">
        <header>
          <h1>Solotter | Tweet</h1>
        </header>

        <main>
          <div className="user-name">
            {fullName}
          </div>

          <form
            className="tweet-form"
            onSubmit={ev => { ev.preventDefault(); this.submit() }}>
            <textarea
              className="tweet-textarea"
              rows={4}
              placeholder="What are you doing?"
              required maxLength={280}
              readOnly={loading}
              value={status || ""}
              onChange={ev => this.onTextChange(ev.target.value)}
            />

            <button
              className="tweet-button"
              disabled={loading}>
              Submit
            </button>

            <div className="tweet-message" hidden={!message}>
              {message}
            </div>
          </form>
        </main>
      </article>
    )
  }
}

export const main = async () => {
  const apiClient = new BrowserAPIClient()
  const storage = new BrowserKeyValueStorage(window.localStorage)
  const model = new AppModel(apiClient, storage)

  ReactDOM.render(
    <AppComponent model={model} />,
    document.getElementById("app"),
  )
}
