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
const v4_1 = __importDefault(require("uuid/v4"));
const utils_1 = require("../utils");
class AppModel {
    constructor(apiClient, storage) {
        this.apiClient = apiClient;
        this.storage = storage;
        this.fetchAccessUser = () => __awaiter(this, void 0, void 0, function* () {
            const authId = this.getAuthId();
            // In case you are already logged in.
            {
                const accessUser = this.getAccessUser();
                if (accessUser)
                    return accessUser;
            }
            // In case it's at the end of auth flow; or before anything happen.
            const { userAuth } = utils_1.partial(yield this.apiClient.post("/api/twitter-auth-end", { authId }).catch());
            if (!userAuth)
                return undefined;
            const accessUser = yield this.apiClient.post("/api/users/name", { userAuth }).catch();
            if (!accessUser)
                return undefined;
            this.saveAccessUesr(accessUser);
            return accessUser;
        });
    }
    getAuthId() {
        let authId = this.storage.get("authId");
        if (!authId) {
            authId = v4_1.default();
            this.storage.set("authId", authId);
        }
        return authId;
    }
    maybeLoggedIn() {
        return this.storage.has("accessUser");
    }
    getAccessUser() {
        return this.storage.get("accessUser");
    }
    saveAccessUesr(accessUser) {
        this.storage.set("accessUser", accessUser);
    }
    initState() {
        return {
            loading: !this.maybeLoggedIn(),
            authId: this.getAuthId(),
            accessUser: undefined,
        };
    }
    didMount() {
        return __awaiter(this, void 0, void 0, function* () {
            const accessUser = yield this.fetchAccessUser();
            return {
                loading: false,
                accessUser,
            };
        });
    }
}
exports.AppModel = AppModel;
//# sourceMappingURL=model.js.map