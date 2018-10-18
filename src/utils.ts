
export const exhaust = (x: never) => x

export const unimpl = () => {
  throw new Error("unimpl")
}

export const partial = <T>(obj: T | void | null | undefined): Partial<T> => {
  return obj || {}
}
