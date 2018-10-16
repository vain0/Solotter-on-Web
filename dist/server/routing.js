"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const universal_router_1 = __importDefault(require("universal-router"));
exports.serverRouterWith = (oauthService) => {
    return new universal_router_1.default([
        {
            path: '/api/twitter-auth-request',
            action({ body }) {
                return __awaiter(this, void 0, void 0, function* () {
                    const { authId } = body;
                    return yield oauthService.oauthRequest(authId);
                });
            },
        },
        {
            path: '/api/twitter-auth-callback',
            action(context) {
                return __awaiter(this, void 0, void 0, function* () {
                    const q = context.query;
                    yield oauthService.oauthCallback(q);
                    return { redirect: '/' };
                });
            },
        },
        {
            path: '/api/twitter-auth-end',
            action({ body }) {
                return __awaiter(this, void 0, void 0, function* () {
                    const { authId } = body;
                    const userAuth = yield oauthService.oauthEnd(authId);
                    return { json: { userAuth } };
                });
            }
        },
        {
            // Except for the above two, we require valid authorization header.
            path: '/api/(.*)',
            action(context) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (context.auth === undefined) {
                        return { json: { forbidden: 'bad' } };
                    }
                    return yield context.next(true);
                });
            },
        },
        {
            path: '/api/users/name',
            action() {
                return __awaiter(this, void 0, void 0, function* () {
                    // FIXME: Fetch
                    return { json: { displayName: 'John Doe', screenName: 'tap' } };
                });
            },
        },
        {
            path: '/api/tweet',
            action(context) {
                return __awaiter(this, void 0, void 0, function* () {
                    const { status } = context.body;
                    console.log(status);
                    return { json: { ok: true } };
                });
            },
        },
    ]);
};
exports.pageRouter = new universal_router_1.default([
    {
        path: ['/styles/(.*)', '/scripts/(.*)', '/favicon.ico'],
        action() {
            return { static: true };
        },
    },
    {
        // Fallback to static file server.
        path: '(.*)',
        action() {
            return { index: true };
        },
    },
]);
//# sourceMappingURL=routing.js.map