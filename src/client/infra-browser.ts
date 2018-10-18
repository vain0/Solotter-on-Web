//! Provides things that depend on web browser's features.

import { APIClient, APIReq, APIRes, APISchema } from "../api"
import { KeyValueStorage } from "../types"

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
    const len = res.headers.get("Content-Length")
    if (!len || Number(len) <= 0) {
      return {}
    }
    return (await res.json()) as unknown
  } catch (err) {
    console.error(err)
    throw err
  }
}

export class BrowserAPIClient implements APIClient {
  async post<P extends keyof APISchema>(pathname: P, body: APIReq<P>): Promise<APIRes<P>> {
    return (await fetchPOST(pathname, body)) as APIRes<P>
  }
}

export class BrowserKeyValueStorage implements KeyValueStorage {
  constructor(
    private readonly storage: Storage,
  ) {
  }

  has(key: string): boolean {
    return this.storage.getItem(key) !== null
  }

  get(key: string): unknown | undefined {
    const json = this.storage.getItem(key)
    if (!json) return undefined
    return JSON.parse(json)
  }

  set(key: string, value: unknown) {
    this.storage.setItem(key, JSON.stringify(value))
  }
}
