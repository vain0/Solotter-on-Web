import * as assert from "assert"
import { describe, test } from "mocha"
import UniversalRouter from "universal-router"
import { integTests } from "./integ.spec"
import { serveTests } from "./server/serve"

const toolkit = {
  describe,
  test,
  is: assert.deepStrictEqual,
}

describe("serveTests", () => serveTests(toolkit))
describe("integTests", () => integTests(toolkit))

test("hello", () => {
  assert.strictEqual(1 + 2 * 3, 7)
})

describe("JavaScript", () => {
  describe("String", () => {
    const r = new RegExp("^Bearer ([a-fA-F0-9]+)$")
    test("it should match", () => {
      const match = "Bearer deadbeaf".match(r)
      assert.strictEqual(match && match[1], "deadbeaf")
    })

    test("it should not match", () => {
      const second = "Basic YWxhZGRpbjpvcGVuc2VzYW1l".match(r)
      assert.strictEqual(second && second[1], null)
    })
  })
})

describe("universal-router", () => {
  const { is } = toolkit

  test("next", async () => {
    const router = new UniversalRouter<{ auth: boolean }, {}>([
      {
        path: "/",
        action: () => "/",
      },
      {
        path: "(.*)",
        action({ auth, next }) {
          if (auth) {
            return next()
          } else {
            return "/forbidden"
          }
        },
      },
      {
        path: "/secret",
        action: () => "/secret",
      },
    ])

    is(await router.resolve({ pathname: "/", auth: false }), "/")
    is(await router.resolve({ pathname: "/secret", auth: false }), "/forbidden")
    is(await router.resolve({ pathname: "/secret", auth: true }), "/secret")
  })
})
