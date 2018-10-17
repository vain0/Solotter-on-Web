//! Provides things that depend on web browser's features.

import uuid from "uuid/v4"
import { TwitterAuth } from "../types"

export const fetchPOST = async (pathname: string, body: unknown) => {
  try {
    const res = await fetch(pathname, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
      },
    })
    if (!res.ok) {
      throw new Error("Fetch request failed.")
    }
    return (await res.json()) as unknown
  } catch (err) {
    console.error(err)
    throw err
  }
}

export const retrieveAuthId = () => {
  let authId = window.localStorage.getItem("solotterAuthId")
  if (!authId) {
    authId = uuid()
    window.localStorage.setItem("solotterAuthId", authId)
  }
  return authId
}

export const retrieveTwitterAuth = () => {
  const twitterAuthJson = window.localStorage.getItem("twitterAuth")
  return twitterAuthJson && JSON.parse(twitterAuthJson) as TwitterAuth
}

export const maybeLoggedIn = () => !!retrieveTwitterAuth()

export const saveTwitterAuth = (auth: TwitterAuth) => {
  window.localStorage.setItem("twitterAuth", JSON.stringify(auth))
}

export const apiAuthEnd = async (authId: string) => {
  const data = await fetchPOST("/api/twitter-auth-end", { authId })
  const { userAuth } = data as { userAuth: TwitterAuth | undefined }
  return userAuth
}

export const apiAccessUser = async (auth: TwitterAuth) => {
  const data = await fetchPOST("/api/users/name", { auth })
  const user = data as { displayName: string; screenName: string }
  return { ...user, auth }
}

export const retrieveAccessUser = async (authId: string) => {
  // In case you are already logged in.
  {
    const auth = retrieveTwitterAuth()
    if (auth) {
      return await apiAccessUser(auth)
    }
  }

  // In case it's at the end of auth flow.
  {
    const auth = await apiAuthEnd(authId)
    if (auth) {
      saveTwitterAuth(auth)
      return await apiAccessUser(auth)
    }
  }
  return undefined
}
