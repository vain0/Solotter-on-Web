import { OAuth } from "oauth"
import * as request from "request-promise-native"
import uuid from "uuid/v4"
import { TwitterConfig, TwitterUserAuth } from "../types"
import { unimpl } from "../utils"

const USER_AGENT = "solotter-web"
const REST_API_BASE = "https://api.twitter.com/1.1"
const REST_API_AUTH = "https://twitter.com/oauth/authenticate"

interface TwitterRestAuth {
  oauth: {
    consumer_key: string,
    consumer_secret: string,
    token: string,
    token_secret: string,
  }
}

interface TwitterAPI {
  "/statuses/show": {
    method: "GET",
    query: {
      id: string,
    },
    response: {},
  }
  "/statuses/update": {
    method: "POST",
    body: {
      status: string,
      in_reply_to_status_id?: string,
      trim_user: true,
    },
    res: {},
  }
}

type TwitterAPIQuery<P extends keyof TwitterAPI> =
  TwitterAPI[P] extends { query: infer Q } ? Q : {}

type TwitterAPIBody<P extends keyof TwitterAPI> =
  TwitterAPI[P] extends { body: infer Q } ? Q : {}

type TwitterAPIRes<P extends keyof TwitterAPI> =
  TwitterAPI[P] extends { res: infer Q } ? Q : {}

type TwitterAPIReq<P extends keyof TwitterAPI> = {
  query?: TwitterAPIQuery<P>,
  body?: TwitterAPIBody<P>,
}

export type TwitterAPIServer = {
  [P in keyof TwitterAPI]: (this: TwitterAPIServer, req: TwitterAPIReq<P>) => Promise<TwitterAPIRes<P>>
}

interface OAuthCallbackParams {
  oauth_token: string
  oauth_verifier: string
}

type OAuthClientCallback = (err: any, token: string, token_secret: string, result?: unknown) => void

interface OAuthClient {
  getOAuthRequestToken(callback: OAuthClientCallback): void

  getOAuthAccessToken(
    oauth_token: string,
    oauth_token_secret: string,
    oauth_verifier: string,
    callback: OAuthClientCallback,
  ): void
}

export interface OAuthService {
  oauthRequest(authId: string): Promise<{ oauth_token: string, redirect: string }>
  oauthCallback(params: OAuthCallbackParams): Promise<void>
  oauthEnd(authId: string): TwitterUserAuth | undefined
}

export const oauthClientWith = (twitterConfig: TwitterConfig): OAuthClient =>
  new OAuth(
    "https://twitter.com/oauth/request_token",
    "https://twitter.com/oauth/access_token",
    twitterConfig.adminAuth.consumer_key,
    twitterConfig.adminAuth.consumer_secret,
    "1.0",
    twitterConfig.callbackURI,
    "HMAC-SHA1",
  )

export const oauthClientMock = (): OAuthClient => {
  const map = new Map<string, string>()

  return {
    getOAuthRequestToken(callback: OAuthClientCallback): void {
      const token = uuid()
      const token_secret = uuid()
      map.set(token, token_secret)
      callback(undefined, token, token_secret)
    },
    getOAuthAccessToken(
      oauth_token: string,
      oauth_token_secret: string,
      _oauth_verifier: string,
      callback: OAuthClientCallback,
    ): void {
      const token_secret = map.get(oauth_token)
      if (token_secret !== oauth_token_secret) throw new Error("Failed.")
      map.delete(oauth_token)
      callback(undefined, oauth_token, oauth_token_secret, { screen_name: "john_doe" })
    },
  }
}

export const oauthServiceWith =
  (oauthClient: OAuthClient): OAuthService => {
    const tokenSecrets = new Map<string, { authId: string; token_secret: string }>()
    const auths = new Map<string, TwitterUserAuth>()

    return {
      /** Called after the user requested to be authenticated. */
      oauthRequest: (authId: string) =>
        new Promise<{ oauth_token: string, redirect: string }>((resolve, reject) => {
          oauthClient.getOAuthRequestToken((err, token, token_secret) => {
            if (err) return reject(err)

            const redirectURI = `${REST_API_AUTH}?oauth_token=${token}`

            // Save secret data internally.
            tokenSecrets.set(token, { authId, token_secret })

            resolve({ oauth_token: token, redirect: redirectURI })
          })
        }),
      /** Called after the twitter redirected to the callback api. */
      oauthCallback: (params: OAuthCallbackParams) =>
        new Promise((resolve, reject) => {
          const { oauth_token: token, oauth_verifier: verifier } = params

          const secret = tokenSecrets.get(token)
          if (!secret) {
            return reject("Invalid auth flow.")
          }
          tokenSecrets.delete(token)
          const { authId, token_secret } = secret

          oauthClient.getOAuthAccessToken(token, token_secret, verifier,
            (err, token, token_secret, results) => {
              if (err) return reject(err)

              const { screen_name } = results as any
              if (!screen_name) throw new Error("scree_nname not provided.")
              auths.set(authId, { token, token_secret, screen_name })
              resolve()
            })
        }),
      /** Called by the client app to obtain access token/secret. */
      oauthEnd: (authId: string) => {
        if (!auths.get(authId)) {
          return undefined
        }
        const userAuth = auths.get(authId)
        auths.delete(authId)
        return userAuth
      },
    }
  }

const headers = {
  Accept: "*/*",
  Connection: "close",
  "User-Agent": USER_AGENT,
}

export const apiGET = async (req: { pathname: string, qs: unknown } & TwitterRestAuth) => {
  const { pathname, oauth, qs } = req

  const url = `${REST_API_BASE}${pathname}.json`

  return await request.get(url, {
    oauth,
    qs,
    headers,
    json: true,
  })
}

export const apiPOST = async (req: { pathname: string, body: unknown } & TwitterRestAuth) => {
  const { pathname, oauth, body } = req

  const url = `${pathname}.json`

  return await request.post(url, {
    baseUrl: REST_API_BASE,
    json: true,
    headers,
    oauth,
    qs: body,
  })
}

export class TwitterAPIServerClass implements TwitterAPIServer {
  constructor(
    private readonly config: TwitterConfig,
  ) {
  }

  oauth() {
    const { consumer_key, consumer_secret } = this.config.adminAuth
    const { token, token_secret } = this.config.userAuth!
    return {
      consumer_key, consumer_secret,
      token, token_secret,
    }
  }

  async "/statuses/show"(_: TwitterAPIReq<"/statuses/show">) {
    return unimpl()
  }
  async "/statuses/update"({ body }: TwitterAPIReq<"/statuses/update">) {
    return apiPOST({ pathname: "/statuses/update", body, oauth: this.oauth() })
  }
}
