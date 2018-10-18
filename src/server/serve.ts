import { config as dotEnvConfig } from "dotenv"
import express from "express"
import * as path from "path"
import uuid from "uuid/v4"
import { TestSuite, TwitterUserAuth } from "../types"
import { exhaust } from "../utils"
import { oauthClientWith, oauthServiceWith, TwitterAPIServerClass } from "./infra-twitter"
import {
  ServerAPIServer,
  ServerRouter,
  serverRouterWith,
} from "./routing"

const parseAuthHeader = (a: string | undefined): string | undefined => {
  const s = a && a.split(" ") || []
  return s[0] === "Bearer" && s[1] || undefined
}

const serverRouteWith =
  (serverRouter: ServerRouter, serveStatic: express.Handler) => {
    const router = express.Router()

    const handlePOST: express.RequestHandler = (req, res) => {
      const auth = parseAuthHeader(req.headers.authorization)

      console.warn({ path: req.path, query: Object.keys(req.query), body: Object.keys(req.body) })

      serverRouter.resolve({
        pathname: req.path,
        body: req.method === "POST" ? req.body : req.query,
        auth,
      }).then(result => {
        if (result === undefined || result === null) {
          throw new Error("Unexpectedly result is null or undefined.")
        } else if ("redirect" in result) {
          return res.redirect(301, result.redirect)
        } else if ("json" in result) {
          return res.json(result.json)
        } else if ("forbidden" in result) {
          return res.sendStatus(403)
        } else {
          return exhaust(result)
        }
      }).catch(err => {
        console.error(err)
        return res.sendStatus(500)
      })
    }

    router.post("*", handlePOST)
    router.get("/api/twitter-auth-callback", handlePOST)

    router.use(serveStatic)
    router.get("*", (req, res, next) => {
      req.url = "http://localhost:8080/index.html"
      return serveStatic(req, res, next)
    })

    return router
  }

interface ServeProps {
  port: number
  publicDir: string
  serverRoute: express.RequestHandler
}

export const serve = (props: ServeProps) => {
  const { port, publicDir, serverRoute } = props
  const app = express()

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(serverRoute)

  app.listen(port, () => {
    console.log(`Serves ${publicDir}`)
    console.log(`Start listening http://localhost:${port}/`)
  })
}

export const bootstrap = () => {
  dotEnvConfig()

  const host = process.env.HOST || "localhost"
  const port = +(process.env.PORT || "8080")
  const distDir = path.resolve(__dirname, "../../dist")
  const publicDir = path.resolve(distDir, "public")

  const twitterConfig = {
    callbackURI: process.env.TWITTER_OAUTH_CALLBACK_URI!,
    adminAuth: {
      consumer_key: process.env.TWITTER_CONSUMER_KEY!,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET!,
      token: process.env.TWITTER_ACCESS_TOKEN!,
      token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
      screen_name: process.env.TWITTER_ADMIN_SCREEN_NAME!,
    },
  }

  const serveStatic = express.static(publicDir, { fallthrough: true, redirect: false })
  const oauthClient = oauthClientWith(twitterConfig)
  const oauthService = oauthServiceWith(oauthClient)
  const twitterServiceFn = (userAuth: TwitterUserAuth) =>
    (new TwitterAPIServerClass({ ...twitterConfig, userAuth }))
  const apiServer = new ServerAPIServer(oauthService, twitterServiceFn)
  const serverRouter = serverRouterWith(apiServer)
  const serverRoute = serverRouteWith(serverRouter, serveStatic)

  serve({
    port,
    publicDir,
    serverRoute,
  })
}

export const serveTests: TestSuite = ({ test, is }) => {
  test("hello", () => {
    is(2 * 3, 6)
  })

  test("parseAuthHeader", () => {
    is(parseAuthHeader("Bearer deadbeef"), "deadbeef")
    is(parseAuthHeader(undefined), undefined)
    is(parseAuthHeader("Basic hoge"), undefined)
  })
}
