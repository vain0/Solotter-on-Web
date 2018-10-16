"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const mocha_1 = require("mocha");
const universal_router_1 = __importDefault(require("universal-router"));
const serve_1 = require("./server/serve");
const toolkit = {
    describe: mocha_1.describe,
    test: mocha_1.test,
    is: assert.deepStrictEqual,
};
mocha_1.test('hello', () => {
    assert.strictEqual(1 + 2 * 3, 7);
});
mocha_1.describe('serveTests', () => serve_1.serveTests(toolkit));
mocha_1.describe('JavaScript', () => {
    mocha_1.describe('String', () => {
        const r = new RegExp('^Bearer ([a-fA-F0-9]+)$');
        mocha_1.test('it should match', () => {
            const match = 'Bearer deadbeaf'.match(r);
            assert.strictEqual(match && match[1], 'deadbeaf');
        });
        mocha_1.test('it should not match', () => {
            const second = 'Basic YWxhZGRpbjpvcGVuc2VzYW1l'.match(r);
            assert.strictEqual(second && second[1], null);
        });
    });
});
mocha_1.describe('universal-router', () => {
    const { is } = toolkit;
    mocha_1.test('next', () => __awaiter(this, void 0, void 0, function* () {
        const router = new universal_router_1.default([
            {
                path: '/',
                action: () => '/',
            },
            {
                path: '(.*)',
                action({ auth, next }) {
                    if (auth) {
                        return next();
                    }
                    else {
                        return '/forbidden';
                    }
                },
            },
            {
                path: '/secret',
                action: () => '/secret',
            },
        ]);
        is(yield router.resolve({ pathname: '/', auth: false }), '/');
        is(yield router.resolve({ pathname: '/secret', auth: false }), '/forbidden');
        is(yield router.resolve({ pathname: '/secret', auth: true }), '/secret');
    }));
});
//# sourceMappingURL=index.spec.js.map