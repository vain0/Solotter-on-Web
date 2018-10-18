import { TwitterConfig, TwitterUserAuth } from "src/types"
import Router, { ActionContext } from "universal-router"
import { APIReq, APIServer } from "../api"
import { OAuthService, TwitterAPIServer, TwitterAPIServerClass } from "./infra-twitter"

interface RouteContext {
  body: unknown
  auth: string | undefined
}

type RouteResult =
  | { json: unknown }
  | { redirect: string }
  | { forbidden: boolean }

type Ax = ActionContext<RouteContext, RouteResult>

type GetRouteResult =
  | { static: boolean }
  | { index: boolean }

export class ServerAPIServer implements APIServer {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly twitterServiceFn: (userAuth: TwitterUserAuth) => TwitterAPIServer,
  ) {
  }

  twitterService({ userAuth }: { userAuth: TwitterUserAuth }) {
    return this.twitterServiceFn(userAuth)
  }

  async "/api/twitter-auth-request"(req: APIReq<"/api/twitter-auth-request">) {
    const { authId } = req
    const { oauth_token, redirect } = await this.oauthService.oauthRequest(authId)
    return { json: { oauth_token }, redirect }
  }

  async "/api/twitter-auth-callback"(query: APIReq<"/api/twitter-auth-callback">) {
    await this.oauthService.oauthCallback(query)
    return { json: {}, redirect: "/" }
  }

  async "/api/twitter-auth-end"(body: APIReq<"/api/twitter-auth-end">) {
    const { authId } = body
    const userAuth = await this.oauthService.oauthEnd(authId)
    return { json: userAuth && { userAuth } }
  }

  async "/api/users/name"(body: APIReq<"/api/users/name">) {
    return {
      json: {
        userAuth: body.userAuth,
        displayName: "John Doe",
        screenName: "tap",
      },
    }
  }

  async "/api/statuses/update"(body: APIReq<"/api/statuses/update">) {
    const err = await this.twitterService(body)["/statuses/update"]({
      body: {
        status: body.status,
        trim_user: true,
      },
    }).then(() => undefined).catch(err => err)
    return { json: { err } }
  }
}

export type ServerRouter = Router<RouteContext, RouteResult>

export const serverRouterWith = (apiServer: APIServer) => {
  const paths = Object.getOwnPropertyNames(ServerAPIServer.prototype)
  const preAuth = paths.filter(p => p.startsWith("/api/twitter-auth-"))
  const postAuth = paths.filter(p => p.startsWith("/api/") && !p.startsWith("/api/twitter-auth-"))

  const route = (path: string) => {
    return {
      path,
      action: ({ body }: Ax) => {
        const res = (apiServer as any)[path](body) as Promise<RouteResult>
        return res
      },
    }
  }

  const authHandler = {
    path: "/api/(.*)",
    async action({ body, next }: Ax) {
      if ("userAuth" in body && body.userAuth !== undefined) {
        return await next(true)
      }
      return { forbidden: true }
    },
  }

  const forwardHandler = {
    path: "(.*)",
    action({ next }: Ax) {
      return next()
    },
  }

  return new Router<RouteContext, RouteResult>([
    ...preAuth.map(route),
    authHandler,
    ...postAuth.map(route),
    forwardHandler,
  ])
}

export const pageRouter = new Router<RouteContext, GetRouteResult>([
  {
    path: ["/styles/(.*)", "/scripts/(.*)", "/favicon.ico"],
    action() {
      return { static: true }
    },
  },
  {
    // Fallback to static file server.
    path: "(.*)",
    action() {
      return { index: true }
    },
  },
])
