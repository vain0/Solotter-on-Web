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
const React = __importStar(require("react"));
const ReactDOM = __importStar(require("react-dom"));
const infra_browser_1 = require("./infra-browser");
const model_1 = require("./model");
class AppComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = props.model.initState();
    }
    componentDidMount() {
        return __awaiter(this, void 0, void 0, function* () {
            const { props: { model } } = this;
            this.setState(yield model.didMount());
        });
    }
    render() {
        const { props: { model }, state: { loading, authId, accessUser } } = this;
        if (loading) {
            return (React.createElement("article", { id: "loading-component" },
                React.createElement("header", null,
                    React.createElement("h1", null, "Solotter")),
                React.createElement("main", null,
                    React.createElement("div", { className: "loading-message" }, "Loading..."))));
        }
        if (accessUser === undefined) {
            return React.createElement(WelcomeComponent, { authId: authId });
        }
        return React.createElement(TweetComponent, { model: model, accessUser: accessUser });
    }
}
class WelcomeComponent extends React.Component {
    render() {
        return (React.createElement("article", { id: "welcome-component" },
            React.createElement("header", null,
                React.createElement("h1", null, "Solotter | Welcome")),
            React.createElement("main", null,
                React.createElement("p", null,
                    React.createElement("b", null, "Solotter"),
                    " is a twitter client for those who want to stay focused on work."),
                React.createElement("form", { method: "POST", action: "/api/twitter-auth-request" },
                    React.createElement("input", { type: "hidden", name: "authId", value: this.props.authId }),
                    React.createElement("button", null, "Login with Twitter")))));
    }
}
class TweetComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            text: "",
        };
    }
    /** Promisified `setState`. */
    update(nextState) {
        return new Promise(resolve => this.setState(nextState, resolve));
    }
    getFullName() {
        const { displayName, screenName } = this.props.accessUser;
        return `${displayName} @${screenName}`;
    }
    onTextChange(text) {
        this.setState({ text });
    }
    submit() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.update({ loading: true });
            try {
                yield infra_browser_1.fetchPOST("/api/tweet", { text: this.state.text });
                yield this.update({ text: "" });
            }
            finally {
                yield this.update({ loading: false });
            }
        });
    }
    render() {
        const fullName = this.getFullName();
        const { loading, text } = this.state;
        return (React.createElement("article", { id: "tweet-component" },
            React.createElement("header", null,
                React.createElement("h1", null, "Solotter | Tweet")),
            React.createElement("main", null,
                React.createElement("div", { className: "user-name" }, fullName),
                React.createElement("form", { className: "tweet-form", onSubmit: ev => { ev.preventDefault(); this.submit(); } },
                    React.createElement("textarea", { className: "tweet-textarea", rows: 4, placeholder: "What are you doing?", readOnly: loading, value: text || "", onChange: ev => this.onTextChange(ev.target.value) }),
                    React.createElement("button", { className: "tweet-button", disabled: loading }, "Submit")))));
    }
}
exports.main = () => __awaiter(this, void 0, void 0, function* () {
    const apiClient = new infra_browser_1.BrowserAPIClient();
    const storage = new infra_browser_1.BrowserKeyValueStorage(window.localStorage);
    const model = new model_1.AppModel(apiClient, storage);
    ReactDOM.render(React.createElement(AppComponent, { model: model }), document.getElementById("app"));
});
//# sourceMappingURL=AppComponent.js.map