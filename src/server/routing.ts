import Router from "universal-router"
import {
  OAuthCallbackQuery,
  OAuthService,
} from "./infra-twitter"

interface RouteContext {
  query: unknown
  body: unknown
  auth: string | undefined
}

type RouteResult =
  | { json: unknown }
  | { redirect: string }

type GetRouteResult =
  | { static: boolean }
  | { index: boolean }

export type ServerRouter = Router<RouteContext, RouteResult>

export const serverRouterWith = (oauthService: OAuthService) => {
  return new Router<RouteContext, RouteResult>([
    {
      path: "/api/twitter-auth-request",
      async action({ body }) {
        const { authId } = body as { authId: string }
        return await oauthService.oauthRequest(authId)
      },
    },
    {
      path: "/api/twitter-auth-callback",
      async action(context) {
        const q = context.query as OAuthCallbackQuery
        await oauthService.oauthCallback(q)
        return { redirect: "/" }
      },
    },
    {
      path: "/api/twitter-auth-end",
      async action({ body }) {
        const { authId } = body as { authId: string }
        const userAuth = await oauthService.oauthEnd(authId)
        return { json: { userAuth } }
      },
    },
    {
      // Except for the above three, we require valid authorization header.
      path: "/api/(.*)",
      async action(context) {
        if (context.auth === undefined) {
          return { json: { forbidden: "bad" } }
        }
        return await context.next(true)
      },
    },
    {
      path: "/api/users/name",
      async action() {
        // FIXME: Fetch
        return { json: { displayName: "John Doe", screenName: "tap" } }
      },
    },
    {
      path: "/api/tweet",
      async action(context) {
        const { status } = context.body as { status: string }
        console.log(status)
        return { json: { ok: true } }
      },
    },
    {
      path: "(.*)",
      action({ next }) {
        return next()
      },
    },
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
