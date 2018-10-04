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
exports.oauthRequest = (oauthClient, twitterConfig) => {
    return new Promise((resolve, reject) => {
        oauthClient.getOAuthRequestToken((err, token, token_secret) => {
            if (err) {
                return reject(err);
            }
            const redirectURI = `https://twitter.com/oauth/authenticate?oauth_token=${token}`;
            // FIXME: use local storage per client
            twitterConfig.oauthState = { token, token_secret };
            resolve({ redirect: redirectURI });
        });
    });
};
exports.oauthCallback = (oauthClient, twitterConfig, verifier) => {
    return new Promise((resolve, reject) => {
        if (!twitterConfig.oauthState) {
            return reject('Invalid auth flow.');
        }
        const { oauthState: { token, token_secret } } = twitterConfig;
        return oauthClient.getOAuthAccessToken(token, token_secret, verifier, (err, token, token_secret, results) => {
            if (err) {
                return reject(err);
            }
            const userAuth = Object.assign({}, twitterConfig.adminAuth, { token, token_secret });
            // FIXME: use local storage per client
            twitterConfig.userAuth = userAuth;
            resolve({ redirect: '/' });
        });
    });
};
exports.serverRouterWith = (oauthClient, twitterConfig) => new universal_router_1.default([
    {
        path: '/api/twitter-auth-request',
        action: () => exports.oauthRequest(oauthClient, twitterConfig),
    },
    {
        path: '/api/twitter-auth-callback',
        action(context) {
            return __awaiter(this, void 0, void 0, function* () {
                const verifier = context.query.oauth_verifier;
                if (!verifier) {
                    return { json: { err: 'Invalid auth flow' } };
                }
                return yield exports.oauthCallback(oauthClient, twitterConfig, verifier);
            });
        },
    },
    {
        // Except for the above two, we require valid authorization header.
        path: '(.*)',
        action(context) {
            return __awaiter(this, void 0, void 0, function* () {
                if (context.auth === undefined) {
                    return { json: { forbidden: 'bad' } };
                }
                return yield context.next();
            });
        },
    },
    {
        path: '/api/tweet',
        action(context) {
            return __awaiter(this, void 0, void 0, function* () {
            });
        },
    },
    {
        path: '/api/hello',
        action() {
            return __awaiter(this, void 0, void 0, function* () {
                return { json: { hello: 'world' } };
            });
        },
    },
    {
        path: '(.*)',
        action() {
            return __awaiter(this, void 0, void 0, function* () {
                return { next: true };
            });
        },
    },
]);
//# sourceMappingURL=routing.js.map