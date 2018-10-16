
export const exhaust = (x: never) => x;

export const partial = <T>(obj: T | null | undefined): Partial<T> => {
  return obj || {};
};
