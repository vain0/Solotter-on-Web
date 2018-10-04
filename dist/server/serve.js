"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const express_1 = __importDefault(require("express"));
const oauth_1 = require("oauth");
const path = __importStar(require("path"));
const serve_static_1 = __importDefault(require("serve-static"));
const routing_1 = require("./routing");
const parseAuthHeader = (a) => {
    const s = a && a.split(' ') || [];
    return s[0] === 'Bearer' && s[1] || undefined;
};
const exhaust = (x) => x;
const oauthClientWith = (twitterConfig) => new oauth_1.OAuth('https://twitter.com/oauth/request_token', 'https://twitter.com/oauth/access_token', twitterConfig.adminAuth.consumer_key, twitterConfig.adminAuth.consumer_secret, '1.0', twitterConfig.callbackURI, 'HMAC-SHA1');
const serverRouteWith = (serverRouter) => (req, res, next) => {
    const auth = parseAuthHeader(req.headers.authorization);
    console.error({ path: req.path, query: req.query, body: req.query });
    serverRouter.resolve({
        pathname: req.path,
        body: req.body,
        query: req.query,
        auth,
    }).then(result => {
        if (result === undefined || result === null) {
            return res.sendStatus(200);
        }
        else if ('redirect' in result) {
            return res.redirect(301, result.redirect);
        }
        else if ('next' in result) {
            return next();
        }
        else if ('json' in result) {
            return res.json(result.json);
        }
        else {
            return exhaust(result);
        }
    }).catch(err => {
        console.error({ err });
        return res.sendStatus(500);
    });
};
exports.serve = () => {
    dotenv_1.config();
    const host = process.env.HOST || 'localhost';
    const port = +(process.env.PORT || '8080');
    const distDir = path.resolve(process.env.DIST_DIR || '.', 'dist');
    const publicDir = path.resolve(distDir, 'public');
    const twitterConfig = {
        callbackURI: process.env.TWITTER_OAUTH_CALLBACK_URI,
        adminAuth: {
            consumer_key: process.env.TWITTER_CONSUMER_KEY,
            consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
            token: process.env.TWITTER_ACCESS_TOKEN,
            token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        },
    };
    console.error({
        host,
        port,
        distDir,
        publicDir,
        callback: twitterConfig.callbackURI,
        consumer_key: twitterConfig.adminAuth.consumer_key,
    });
    const oauthClient = oauthClientWith(twitterConfig);
    const serverRouter = routing_1.serverRouterWith(oauthClient, twitterConfig);
    const serverRoute = serverRouteWith(serverRouter);
    const app = express_1.default();
    app.use(serverRoute);
    app.use(serve_static_1.default(publicDir));
    app.listen(port, () => {
        console.log(`Serves ${publicDir}`);
        console.log(`Start listening http://${host}:${port}/`);
    });
};
exports.serveTests = ({ test, is }) => {
    test('hello', () => {
        is(2 * 3, 6);
    });
    test('parseAuthHeader', () => {
        is(parseAuthHeader('Bearer deadbeef'), 'deadbeef');
        is(parseAuthHeader(undefined), undefined);
        is(parseAuthHeader('Basic hoge'), undefined);
    });
};
//# sourceMappingURL=serve.js.map