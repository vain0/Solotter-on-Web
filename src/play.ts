import { config as dotEnvConfig } from "dotenv"
import express, { Request, Response } from "express"
import { OAuth } from "oauth"
import { apiGET } from "./server/infra-twitter"

export const play = async () => {
  const host = process.env.HOST || "localhost"
  const port = +(process.env.PORT || "8080")

  const oauth = {
    consumer_key: process.env.TWITTER_CONSUMER_KEY!,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET!,
    token: process.env.TWITTER_ACCESS_TOKEN!,
    token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
  }

  const twitterConfig = {
    callbackURI: process.env.TWITTER_OAUTH_CALLBACK_URI!,
    adminAuth: oauth,
  }

  if (!Object.keys(oauth).every(k => (oauth as any)[k])) {
    return console.error("Set up .env")
  }

  const app = express()
  const router = express.Router()

  router.all("(.*)", (req, res) => {
    console.error({ pathname: req.path, query: req.query, body: req.body })
    return res.sendStatus(200)
  })

  app.use(router)

  app.listen(port, () => {
    console.error(`Start listening http://${host}:${port}/`)
  })
}

play()
