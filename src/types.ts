interface TestToolkit {
  describe(name: string, callback: () => void | Promise<void>): void
  test(name: string, callback: () => void | Promise<void>): void
  is<T>(left: T, right: T): void
}

export type TestSuite = (toolkit: TestToolkit) => void

export interface TwitterUserAuth {
  token: string
  token_secret: string
  screen_name: string
}

export interface TwitterAuth extends TwitterUserAuth {
  consumer_key: string
  consumer_secret: string
}

export interface TwitterConfig {
  callbackURI: string
  adminAuth: TwitterAuth
  userAuth?: TwitterUserAuth
  oauthState?: {
    token: string,
    token_secret: string,
  }
}

export interface AccessUser {
  userAuth: TwitterUserAuth
}

type MaybePick<T, K extends keyof T> =
  Pick<T, K> | T | null

export type NextState<P, S, K extends keyof S> =
  ((prevState: Readonly<S>, props: Readonly<P>) => MaybePick<S, K>) | MaybePick<S, K>

export interface KeyValueStorage {
  has(key: string): boolean
  get(key: string): unknown | undefined
  set(key: string, value: unknown): void
}

export interface AppState {
  loading: boolean
  authId: string
  accessUser: AccessUser | undefined
}

export interface TweetState {
  loading: boolean
  message: string
  status: string
}
