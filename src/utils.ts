import { TestSuite } from './server/testing';

// プロパティを再帰的に optional にする。
export type Patch<T> = {
  [K in keyof T]?: Patch<T[K]>
};

const isMergable = (obj: any): boolean => {
  return typeof obj === 'object'
    && obj !== null
    && (obj.constructor === undefined || obj.constructor === Object);
};

const mergeCore = (obj: any, patch: any): any => {
  // Assert: patch !== undefined

  if (!isMergable(obj)) {
    return patch;
  }

  if (obj === patch) {
    return obj;
  }

  let m = { ...obj };
  for (const key of Object.keys(patch)) {
    const p = patch[key];
    if (p !== undefined) {
      m[key] = mergeCore(m[key], p);
    }
  }
  return m;
};

/**
 * Applies a patch to an object recursively, e.g.
 *
 * merge(
 *  { file: { name: 'foo', ext: 'txt' } },
 *  { file: { ext: 'md' } }
 * ) => { file: { name: 'foo', ext: 'md' } }).
 *
 * Note that objects that inherit directly from undefined/Object are merged. Arrays, functions are replaced if patch has.
 */
export const merge = <T>(obj: T, patch: Patch<T>): T => {
  return mergeCore(obj as any, patch as any) as T;
};

export const utilsTests: TestSuite = ({ describe, test, is }) => {
  describe('merge', () => {
    test('objects are mergable', () => {
      is(isMergable({}), true);
      is(isMergable(Object.create(null)), true);
    });

    test('arrays and functions are not mergable', () => {
      is(isMergable([]), false);
      is(isMergable(() => { }), false);
    });

    test('primitives are not mergable', () => {
      is(isMergable(0), false);
      is(isMergable(''), false);
      is(isMergable(false), false);
      is(isMergable(null), false);
      is(isMergable(undefined), false);
    });

    test('flat object', () => {
      is(
        merge({ name: 'john', age: 17 }, { age: 18 }),
        { name: 'john', age: 18 },
      );
    });

    test('deep object', () => {
      is(
        merge(
          { p: { a: [1], b: false, n: 1, s: 's', z: 'z' } },
          { p: { a: [2], b: true, n: 2, s: 't' } },
        ),
        { p: { a: [2], b: true, n: 2, s: 't', z: 'z' } },
      );
    });
  });
};
