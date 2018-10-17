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
const express_1 = __importDefault(require("express"));
exports.play = () => __awaiter(this, void 0, void 0, function* () {
    const host = process.env.HOST || "localhost";
    const port = +(process.env.PORT || "8080");
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
        return console.error("Set up .env");
    }
    const app = express_1.default();
    const router = express_1.default.Router();
    router.all("(.*)", (req, res) => {
        console.error({ pathname: req.path, query: req.query, body: req.body });
        return res.sendStatus(200);
    });
    app.use(router);
    app.listen(port, () => {
        console.error(`Start listening http://${host}:${port}/`);
    });
});
exports.play();
//# sourceMappingURL=play.js.map