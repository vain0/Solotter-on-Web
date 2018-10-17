import uuid from "uuid/v4"
import { APIClient } from "../api"
import { AccessUser, AppState, KeyValueStorage, TwitterUserAuth } from "../types"
import { partial } from "../utils"

export class AppModel {
  constructor(
    private readonly apiClient: APIClient,
    private readonly storage: KeyValueStorage,
  ) {
  }

  getAuthId() {
    let authId = this.storage.get("authId") as string
    if (!authId) {
      authId = uuid()
      this.storage.set("authId", authId)
    }
    return authId
  }

  maybeLoggedIn() {
    return this.storage.has("accessUser")
  }

  getAccessUser() {
    return this.storage.get("accessUser") as AccessUser | undefined
  }

  private saveAccessUesr(accessUser: AccessUser) {
    this.storage.set("accessUser", accessUser)
  }

  private fetchAccessUser = async () => {
    const authId = this.getAuthId()

    // In case you are already logged in.
    {
      const accessUser = this.getAccessUser()
      if (accessUser) return accessUser
    }

    // In case it's at the end of auth flow; or before anything happen.
    const { userAuth } = partial(
      await this.apiClient.post("/api/twitter-auth-end", { authId }).catch(),
    )
    if (!userAuth) return undefined

    const accessUser = await this.apiClient.post("/api/users/name", { userAuth }).catch()
    if (!accessUser) return undefined

    this.saveAccessUesr(accessUser)
    return accessUser
  }

  initState(): AppState {
    return {
      loading: !this.maybeLoggedIn(),
      authId: this.getAuthId(),
      accessUser: undefined,
    }
  }

  async didMount(): Promise<Pick<AppState, "loading" | "accessUser">> {
    const accessUser = await this.fetchAccessUser()
    return {
      loading: false,
      accessUser,
    }
  }
}
