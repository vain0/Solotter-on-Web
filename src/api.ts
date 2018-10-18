import { AccessUser, TwitterUserAuth } from "./types"

export interface APISchema {
  "/api/twitter-auth-request": {
    request: { authId: string }
    response: { oauth_token: string },
  }
  "/api/twitter-auth-callback": {
    request: {
      oauth_token: string
      oauth_verifier: string,
    }
    response: {},
  }
  "/api/twitter-auth-end": {
    request: { authId: string }
    response: { userAuth: TwitterUserAuth } | undefined,
  }
  "/api/users/name": {
    request: { userAuth: TwitterUserAuth },
    response: AccessUser | undefined,
  }
  "/api/statuses/update": {
    request: {
      userAuth: TwitterUserAuth
      status: string,
    },
    response: { err: any },
  }
}

type APIPath = keyof APISchema

export type APIReq<P extends APIPath> =
  APISchema[P] extends { request: infer Q } ? Q : never

export type APIRes<P extends APIPath> =
  APISchema[P] extends { response: infer R } ? R : never

export interface APIClient {
  post<P extends APIPath>(path: P, req: APIReq<P>): Promise<APIRes<P>>
}

export type APIServer = {
  [P in APIPath]: (req: APIReq<P>) => Promise<
    | { json: APIRes<P> }
    | { redirect: string }
    | { json: APIRes<P>, redirect: string }
    >
}
