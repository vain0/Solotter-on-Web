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
const path = __importStar(require("path"));
const utils_1 = require("../utils");
const infra_twitter_1 = require("./infra-twitter");
const routing_1 = require("./routing");
const v4_1 = __importDefault(require("uuid/v4"));
const parseAuthHeader = (a) => {
    const s = a && a.split(' ') || [];
    return s[0] === 'Bearer' && s[1] || undefined;
};
const serverRouteWith = (serverRouter, serveStatic) => {
    const router = express_1.default.Router();
    router.post('*', (req, res) => {
        const auth = parseAuthHeader(req.headers.authorization);
        console.warn({ path: req.path, query: Object.keys(req.query), body: Object.keys(req.body) });
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
            else if ('json' in result) {
                return res.json(result.json);
            }
            else {
                return utils_1.exhaust(result);
            }
        }).catch(err => {
            console.error(err);
            return res.sendStatus(500);
        });
    });
    router.use(serveStatic);
    router.get('*', (req, res, next) => {
        req.url = 'http://localhost:8080/index.html';
        return serveStatic(req, res, next);
    });
    return router;
};
exports.serve = (props) => {
    const { port, publicDir, serverRoute } = props;
    const app = express_1.default();
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use(serverRoute);
    app.listen(port, () => {
        console.log(`Serves ${publicDir}`);
        console.log(`Start listening http://localhost:${port}/`);
    });
};
exports.bootstrap = () => {
    dotenv_1.config();
    const host = process.env.HOST || 'localhost';
    const port = +(process.env.PORT || '8080');
    const distDir = path.resolve(__dirname, '../../dist');
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
    const serveStatic = express_1.default.static(publicDir, { fallthrough: true, redirect: false });
    const oauthService = infra_twitter_1.oauthServiceWith(twitterConfig);
    const serverRouter = routing_1.serverRouterWith(oauthService);
    const serverRoute = serverRouteWith(serverRouter, serveStatic);
    exports.serve({
        port,
        publicDir,
        serverRoute,
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
    test('auth flow', () => __awaiter(this, void 0, void 0, function* () {
        const serverRouter = routing_1.serverRouterWith(infra_twitter_1.oauthServiceStub());
        // Firstly user requests auth by clicking button.
        const authId = v4_1.default();
        const r1 = yield serverRouter.resolve({
            pathname: '/api/twitter-auth-request',
            body: { authId },
        });
        is("redirect" in r1, true);
        // After redirect, twitter auth, then redirect to the callback api.
        const r2 = yield serverRouter.resolve({
            pathname: '/api/twitter-auth-callback',
            query: { oauth_token: 'my_token', oauth_verifier: 'my_verifier', },
        });
        is("redirect" in r2, true);
        // The client fetches auth tokens.
        const auth = yield serverRouter.resolve({
            pathname: '/api/twitter-auth-end',
            body: { authId }
        });
        is(auth !== undefined, true);
    }));
};
//# sourceMappingURL=serve.js.map