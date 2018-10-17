export interface TwitterAuth {
  consumer_key: string
  consumer_secret: string
  token: string
  token_secret: string
}

export interface TwitterConfig {
  callbackURI: string
  adminAuth: TwitterAuth
  userAuth?: TwitterAuth
  oauthState?: {
    token: string,
    token_secret: string,
  }
}

export interface AccessUser {
  auth: TwitterAuth
  displayName: string
  screenName: string
}

type MaybePick<T, K extends keyof T> =
  Pick<T, K> | T | null

export type NextState<P, S, K extends keyof S> =
  ((prevState: Readonly<S>, props: Readonly<P>) => MaybePick<S, K>) | MaybePick<S, K>
