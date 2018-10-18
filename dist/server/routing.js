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
class ServerAPIServer {
    constructor(oauthService, twitterServiceFn) {
        this.oauthService = oauthService;
        this.twitterServiceFn = twitterServiceFn;
    }
    twitterService({ userAuth }) {
        return this.twitterServiceFn(userAuth);
    }
    "/api/twitter-auth-request"(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { authId } = req;
            const { oauth_token, redirect } = yield this.oauthService.oauthRequest(authId);
            return { json: { oauth_token }, redirect };
        });
    }
    "/api/twitter-auth-callback"(query) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.oauthService.oauthCallback(query);
            return { json: {}, redirect: "/" };
        });
    }
    "/api/twitter-auth-end"(body) {
        return __awaiter(this, void 0, void 0, function* () {
            const { authId } = body;
            const userAuth = yield this.oauthService.oauthEnd(authId);
            return { json: userAuth && { userAuth } };
        });
    }
    "/api/users/name"(body) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                json: {
                    userAuth: body.userAuth,
                    displayName: "John Doe",
                    screenName: "tap",
                },
            };
        });
    }
    "/api/statuses/update"(body) {
        return __awaiter(this, void 0, void 0, function* () {
            const err = yield this.twitterService(body)["/statuses/update"]({
                body: {
                    status: body.status,
                    trim_user: true,
                },
            }).then(() => undefined).catch(err => err);
            return { json: { err } };
        });
    }
}
exports.ServerAPIServer = ServerAPIServer;
exports.serverRouterWith = (apiServer) => {
    const paths = Object.getOwnPropertyNames(ServerAPIServer.prototype);
    const preAuth = paths.filter(p => p.startsWith("/api/twitter-auth-"));
    const postAuth = paths.filter(p => p.startsWith("/api/") && !p.startsWith("/api/twitter-auth-"));
    const route = (path) => {
        return {
            path,
            action: ({ body }) => {
                const res = apiServer[path](body);
                return res;
            },
        };
    };
    const authHandler = {
        path: "/api/(.*)",
        action({ body, next }) {
            return __awaiter(this, void 0, void 0, function* () {
                if ("userAuth" in body && body.userAuth !== undefined) {
                    return yield next(true);
                }
                return { forbidden: true };
            });
        },
    };
    const forwardHandler = {
        path: "(.*)",
        action({ next }) {
            return next();
        },
    };
    return new universal_router_1.default([
        ...preAuth.map(route),
        authHandler,
        ...postAuth.map(route),
        forwardHandler,
    ]);
};
exports.pageRouter = new universal_router_1.default([
    {
        path: ["/styles/(.*)", "/scripts/(.*)", "/favicon.ico"],
        action() {
            return { static: true };
        },
    },
    {
        // Fallback to static file server.
        path: "(.*)",
        action() {
            return { index: true };
        },
    },
]);
//# sourceMappingURL=routing.js.map