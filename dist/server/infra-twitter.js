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
Object.defineProperty(exports, "__esModule", { value: true });
const oauth_1 = require("oauth");
const request = __importStar(require("request-promise-native"));
const USER_AGENT = 'solotter-web';
const REST_API_BASE = 'https://api.twitter.com/1.1';
const REST_API_AUTH = 'https://twitter.com/oauth/authenticate';
const headers = {
    Accept: '*/*',
    Connection: 'close',
    'User-Agent': USER_AGENT,
};
exports.oauthServiceWith = (twitterConfig) => {
    const { adminAuth } = twitterConfig;
    const tokenSecrets = new Map();
    const auths = new Map();
    const oauthClient = new oauth_1.OAuth('https://twitter.com/oauth/request_token', 'https://twitter.com/oauth/access_token', twitterConfig.adminAuth.consumer_key, twitterConfig.adminAuth.consumer_secret, '1.0', twitterConfig.callbackURI, 'HMAC-SHA1');
    return {
        /** Called after the user requested to be authenticated. */
        oauthRequest: (authId) => new Promise((resolve, reject) => {
            oauthClient.getOAuthRequestToken((err, token, token_secret) => {
                if (err) {
                    return reject(err);
                }
                const redirectURI = `${REST_API_AUTH}?oauth_token=${token}`;
                // Save secret data internally.
                tokenSecrets.set(token, { authId, token_secret });
                resolve({ redirect: redirectURI });
            });
        }),
        /** Called after the twitter redirected to the callback api. */
        oauthCallback: (params) => new Promise((resolve, reject) => {
            const { oauth_token: token, oauth_verifier: verifier } = params;
            const secret = tokenSecrets.get(token);
            if (!secret) {
                return reject('Invalid auth flow.');
            }
            tokenSecrets.delete(token);
            const { authId, token_secret } = secret;
            oauthClient.getOAuthAccessToken(token, token_secret, verifier, (err, token, token_secret) => {
                if (err) {
                    return reject(err);
                }
                const userAuth = Object.assign({}, adminAuth, { token, token_secret });
                auths.set(authId, userAuth);
                resolve();
            });
        }),
        oauthEnd: (authId) => {
            if (!auths.get(authId)) {
                return undefined;
            }
            const userAuth = auths.get(authId);
            auths.delete(authId);
            return userAuth;
        }
    };
};
exports.oauthServiceStub = () => {
    let requests = new Map();
    let auths = new Map();
    return {
        oauthRequest(authId) {
            return __awaiter(this, void 0, void 0, function* () {
                requests.set("my_token", authId);
                return { redirect: '/api/twitter-auth-callback?oauth_token=my_token' };
            });
        },
        oauthCallback(params) {
            return __awaiter(this, void 0, void 0, function* () {
                auths.set(requests.get(params.oauth_token), {});
            });
        },
        oauthEnd(authId) {
            return auths.get(authId);
        }
    };
};
exports.apiGet = (req) => __awaiter(this, void 0, void 0, function* () {
    const { pathname, oauth, qs } = req;
    const url = `${REST_API_BASE}${pathname}.json`;
    return yield request.get(url, {
        oauth,
        qs,
        headers,
        json: true,
    });
});
exports.apiPost = (req) => __awaiter(this, void 0, void 0, function* () {
    const { pathname, oauth, body } = req;
    const url = `${REST_API_BASE}${pathname}.json`;
    return yield request.get(url, {
        oauth,
        body,
        headers,
        json: true,
    });
});
//# sourceMappingURL=infra-twitter.js.map