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
const dotenv_1 = require("dotenv");
const express_1 = __importDefault(require("express"));
const oauth_1 = require("oauth");
const routing_1 = require("./server/routing");
const oauthClientWith = (twitterConfig) => new oauth_1.OAuth('https://twitter.com/oauth/request_token', 'https://twitter.com/oauth/access_token', twitterConfig.adminAuth.consumer_key, twitterConfig.adminAuth.consumer_secret, '1.0', twitterConfig.callbackURI, 'HMAC-SHA1');
exports.play = () => __awaiter(this, void 0, void 0, function* () {
    dotenv_1.config();
    const hostname = process.env.HOST;
    const port = +process.env.PORT;
    const oauth = {
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        token: process.env.TWITTER_ACCESS_TOKEN,
        token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    };
    const twitterConfig = {
        callbackURI: process.env.TWITTER_OAUTH_CALLBACK_URI,
        adminAuth: oauth,
    };
    if (!Object.keys(oauth).every(k => oauth[k])) {
        return console.error('Set up .env');
    }
    const oauthClient = oauthClientWith(twitterConfig);
    const app = express_1.default();
    const router = express_1.default.Router();
    router.post('/api/auth/twitter-callback', (req, res) => {
        console.error({ 'callback request': req });
        const verifier = req.query.oauth_verifier;
        console.error({ verifier });
        // if (!verifier) {
        //   throw 'Invalid auth flow';
        // }
        routing_1.oauthCallback(oauthClient, twitterConfig, verifier).then(result => {
            return res.sendStatus(200);
        }).catch(console.error);
    });
    router.all('(.*)', (req, res) => {
        console.error({ req });
        return res.sendStatus(200);
    });
    app.use(router);
    app.listen(port, hostname, () => {
        console.error(`Start listening http://${hostname}:${port}/`);
        routing_1.oauthRequest(oauthClient, twitterConfig).then(r => {
            console.error({ 'route result': r });
        }).catch(console.error);
    });
});
exports.play();
//# sourceMappingURL=play.js.map