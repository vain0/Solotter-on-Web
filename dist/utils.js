"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exhaust = (x) => x;
exports.unimpl = () => {
    throw new Error("unimpl");
};
exports.partial = (obj) => {
    return obj || {};
};
//# sourceMappingURL=utils.js.map