interface TestToolkit {
  describe(name: string, callback: () => void | Promise<void>): void
  test(name: string, callback: () => void | Promise<void>): void
  is<T>(left: T, right: T): void
}

export type TestSuite = (toolkit: TestToolkit) => void
