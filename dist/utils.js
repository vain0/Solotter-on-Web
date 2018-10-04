"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const isMergable = (obj) => {
    return typeof obj === 'object'
        && obj !== null
        && (obj.constructor === undefined || obj.constructor === Object);
};
const mergeCore = (obj, patch) => {
    // Assert: patch !== undefined
    if (!isMergable(obj)) {
        return patch;
    }
    if (obj === patch) {
        return obj;
    }
    let m = Object.assign({}, obj);
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
exports.merge = (obj, patch) => {
    return mergeCore(obj, patch);
};
exports.utilsTests = ({ describe, test, is }) => {
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
            is(exports.merge({ name: 'john', age: 17 }, { age: 18 }), { name: 'john', age: 18 });
        });
        test('deep object', () => {
            is(exports.merge({ p: { a: [1], b: false, n: 1, s: 's', z: 'z' } }, { p: { a: [2], b: true, n: 2, s: 't' } }), { p: { a: [2], b: true, n: 2, s: 't', z: 'z' } });
        });
    });
};
//# sourceMappingURL=utils.js.map