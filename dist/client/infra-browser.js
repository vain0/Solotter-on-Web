"use strict";
//! Provides things that depend on web browser's features.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPOST = (pathname, body) => __awaiter(this, void 0, void 0, function* () {
    try {
        const res = yield fetch(pathname, {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "content-type": "application/json",
            },
        });
        if (!res.ok) {
            throw new Error("Fetch request failed.");
        }
        return (yield res.json());
    }
    catch (err) {
        console.error(err);
        throw err;
    }
});
class BrowserAPIClient {
    post(pathname, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield exports.fetchPOST(pathname, body));
        });
    }
}
exports.BrowserAPIClient = BrowserAPIClient;
class BrowserKeyValueStorage {
    constructor(storage) {
        this.storage = storage;
    }
    has(key) {
        return this.storage.getItem(key) !== null;
    }
    get(key) {
        const json = this.storage.getItem(key);
        if (!json)
            return undefined;
        return JSON.parse(json);
    }
    set(key, value) {
        this.storage.setItem(key, JSON.stringify(value));
    }
}
exports.BrowserKeyValueStorage = BrowserKeyValueStorage;
//# sourceMappingURL=infra-browser.js.map