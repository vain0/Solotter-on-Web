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
const utils_1 = require("../utils");
const USER_AGENT = 'solotter-web';
const REST_API_BASE = 'https://api.twitter.com/1.1';
const REST_API_AUTH = 'https://twitter.com/oauth/authenticate';
const headers = {
    Accept: '*/*',
    Connection: 'close',
    'User-Agent': USER_AGENT,
};
const oauthClientWith = (twitterConfig) => new oauth_1.OAuth('https://twitter.com/oauth/request_token', 'https://twitter.com/oauth/access_token', twitterConfig.adminAuth.consumer_key, twitterConfig.adminAuth.consumer_secret, '1.0', twitterConfig.callbackURI, 'HMAC-SHA1');
const oauthRequestWith = ({ oauthClient, oauthStore }) => () => new Promise((resolve, reject) => {
    oauthClient.getOAuthRequestToken((err, token, token_secret) => {
        if (err) {
            return reject(err);
        }
        const redirectURI = `${REST_API_AUTH}?oauth_token=${token}`;
        oauthStore.set(token, { token_secret });
        resolve({ redirect: redirectURI });
    });
});
const oauthCallbackWith = (props) => (params) => new Promise((resolve, reject) => {
    const { oauthClient, oauthStore, adminAuth } = props;
    const { oauth_token: token, oauth_verifier: verifier } = params;
    const { token_secret } = utils_1.partial(oauthStore.get(token));
    if (!token_secret) {
        return reject('Invalid auth flow.');
    }
    oauthStore.delete(token);
    oauthClient.getOAuthAccessToken(token, token_secret, verifier, (err, token, token_secret) => {
        if (err) {
            return reject(err);
        }
        const userAuth = Object.assign({}, adminAuth, { token, token_secret });
        resolve({ userAuth });
    });
});
exports.oauthServiceWith = (twitterConfig) => {
    const oauthClient = oauthClientWith(twitterConfig);
    const oauthStore = new Map();
    const { adminAuth } = twitterConfig;
    return {
        oauthRequest: oauthRequestWith({ oauthClient, oauthStore }),
        oauthCallback: oauthCallbackWith({ oauthClient, oauthStore, adminAuth }),
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