import uuid from "uuid/v4"
import { APIClient, APIReq, APIRes, APISchema } from "./api"
import { AppModel } from "./client/model"
import { oauthClientMock, oauthServiceWith, TwitterAPIServerClass } from "./server/infra-twitter"
import { ServerAPIServer, serverRouterWith } from "./server/routing"
import { KeyValueStorage, TestSuite } from "./types"
import { exhaust, unimpl } from "./utils"

export const integTests: TestSuite = ({ describe, is, test }) => {
  test("auth flow", async () => {
    const oauthService = oauthServiceWith(oauthClientMock())
    const apiServer = new ServerAPIServer(oauthService, unimpl)
    const serverRouter = serverRouterWith(apiServer)

    const apiClient: APIClient = {
      async post<P extends keyof APISchema>(pathname: P, req: APIReq<P>) {
        const r = await serverRouter.resolve({ pathname, body: req, query: req })
        if ("json" in r) {
          return r.json as APIRes<P>
        } else if ("static" in r || "index" in r || "forbidden" in r) {
          throw new Error("Unexpected")
        } else if ("redirect" in r) {
          return {} as any
        } else {
          return exhaust(r)
        }
      },
    }

    const oauth_verifier = "ignored-on-testing"
    const clientStorage: KeyValueStorage = new Map()

    // An user visited the welcome page.
    let authId: string
    {
      const model = new AppModel(apiClient, clientStorage)
      const state = model.initState()
      await model.didMount()
      authId = state.authId
    }

    // They clicked LOGIN button.
    const { oauth_token } = await apiClient.post("/api/twitter-auth-request", { authId })

    // Twitter will redirect the user to the callback.
    await apiClient.post("/api/twitter-auth-callback", { oauth_token, oauth_verifier })

    // And the server will redirect the user to the tweet page.
    {
      const model = new AppModel(apiClient, clientStorage)
      const state = model.initState()
      await model.didMount()

      // Login completed.
      is(state.authId, authId)
      is(model.getAccessUser() !== undefined, true)
    }

    // Next time, the user can skip login phase.
    {
      const model = new AppModel(apiClient, clientStorage)
      const state = model.initState()
      is(state.loading, false)
      await model.didMount()
      is(model.getAccessUser() !== undefined, true)
    }
  })
}
