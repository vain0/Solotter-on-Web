"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = __importStar(require("react"));
const ReactDOM = __importStar(require("react-dom"));
const HelloComponent_1 = require("./HelloComponent");
ReactDOM.render(React.createElement(HelloComponent_1.Hello, { compiler: 'TypeScript', framework: 'React' }), document.getElementById('app'));
//# sourceMappingURL=app.js.map