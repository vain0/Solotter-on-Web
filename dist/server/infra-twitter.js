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
const oauth_1 = require("oauth");
const request = __importStar(require("request-promise-native"));
const v4_1 = __importDefault(require("uuid/v4"));
const utils_1 = require("../utils");
const USER_AGENT = "solotter-web";
const REST_API_BASE = "https://api.twitter.com/1.1";
const REST_API_AUTH = "https://twitter.com/oauth/authenticate";
exports.oauthClientWith = (twitterConfig) => new oauth_1.OAuth("https://twitter.com/oauth/request_token", "https://twitter.com/oauth/access_token", twitterConfig.adminAuth.consumer_key, twitterConfig.adminAuth.consumer_secret, "1.0", twitterConfig.callbackURI, "HMAC-SHA1");
exports.oauthClientMock = () => {
    const map = new Map();
    return {
        getOAuthRequestToken(callback) {
            const token = v4_1.default();
            const token_secret = v4_1.default();
            map.set(token, token_secret);
            callback(undefined, token, token_secret);
        },
        getOAuthAccessToken(oauth_token, oauth_token_secret, _oauth_verifier, callback) {
            const token_secret = map.get(oauth_token);
            if (token_secret !== oauth_token_secret)
                throw new Error("Failed.");
            map.delete(oauth_token);
            callback(undefined, oauth_token, oauth_token_secret, { screen_name: "john_doe" });
        },
    };
};
exports.oauthServiceWith = (oauthClient) => {
    const tokenSecrets = new Map();
    const auths = new Map();
    return {
        /** Called after the user requested to be authenticated. */
        oauthRequest: (authId) => new Promise((resolve, reject) => {
            oauthClient.getOAuthRequestToken((err, token, token_secret) => {
                if (err)
                    return reject(err);
                const redirectURI = `${REST_API_AUTH}?oauth_token=${token}`;
                // Save secret data internally.
                tokenSecrets.set(token, { authId, token_secret });
                resolve({ oauth_token: token, redirect: redirectURI });
            });
        }),
        /** Called after the twitter redirected to the callback api. */
        oauthCallback: (params) => new Promise((resolve, reject) => {
            const { oauth_token: token, oauth_verifier: verifier } = params;
            const secret = tokenSecrets.get(token);
            if (!secret) {
                return reject("Invalid auth flow.");
            }
            tokenSecrets.delete(token);
            const { authId, token_secret } = secret;
            oauthClient.getOAuthAccessToken(token, token_secret, verifier, (err, token, token_secret, results) => {
                if (err)
                    return reject(err);
                const { screen_name } = results;
                if (!screen_name)
                    throw new Error("scree_nname not provided.");
                auths.set(authId, { token, token_secret, screen_name });
                resolve();
            });
        }),
        /** Called by the client app to obtain access token/secret. */
        oauthEnd: (authId) => {
            if (!auths.get(authId)) {
                return undefined;
            }
            const userAuth = auths.get(authId);
            auths.delete(authId);
            return userAuth;
        },
    };
};
const headers = {
    Accept: "*/*",
    Connection: "close",
    "User-Agent": USER_AGENT,
};
exports.apiGET = (req) => __awaiter(this, void 0, void 0, function* () {
    const { pathname, oauth, qs } = req;
    const url = `${REST_API_BASE}${pathname}.json`;
    return yield request.get(url, {
        oauth,
        qs,
        headers,
        json: true,
    });
});
exports.apiPOST = (req) => __awaiter(this, void 0, void 0, function* () {
    const { pathname, oauth, body } = req;
    const url = `${pathname}.json`;
    return yield request.post(url, {
        baseUrl: REST_API_BASE,
        json: true,
        headers,
        oauth,
        qs: body,
    });
});
class TwitterAPIServerClass {
    constructor(config) {
        this.config = config;
    }
    oauth() {
        const { consumer_key, consumer_secret } = this.config.adminAuth;
        const { token, token_secret } = this.config.userAuth;
        return {
            consumer_key, consumer_secret,
            token, token_secret,
        };
    }
    "/statuses/show"(_) {
        return __awaiter(this, void 0, void 0, function* () {
            return utils_1.unimpl();
        });
    }
    "/statuses/update"({ body }) {
        return __awaiter(this, void 0, void 0, function* () {
            return exports.apiPOST({ pathname: "/statuses/update", body, oauth: this.oauth() });
        });
    }
}
exports.TwitterAPIServerClass = TwitterAPIServerClass;
//# sourceMappingURL=infra-twitter.js.map