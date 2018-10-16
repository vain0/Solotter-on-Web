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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = __importStar(require("react"));
const ReactDOM = __importStar(require("react-dom"));
const v4_1 = __importDefault(require("uuid/v4"));
const fetchPOST = (pathname, body) => {
    return fetch(pathname, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'content-type': 'application/json',
        },
    }).then(res => {
        if (!res.ok)
            throw new Error('fetch request failed');
        return res.json();
    }, err => {
        console.error(err);
        throw err;
    });
};
const retrieveAuthId = () => {
    let authId = window.localStorage.getItem("solotterAuthId");
    if (!authId) {
        authId = v4_1.default();
        window.localStorage.setItem("solotterAuthId", authId);
    }
    return authId;
};
const retrieveTwitterAuth = () => {
    const twitterAuthJson = window.localStorage.getItem('twitterAuth');
    return twitterAuthJson && JSON.parse(twitterAuthJson);
};
const maybeLoggedIn = () => !!retrieveTwitterAuth();
const saveTwitterAuth = (auth) => {
    window.localStorage.setItem('twitterAuth', JSON.stringify(auth));
};
const apiAuthEnd = (authId) => __awaiter(this, void 0, void 0, function* () {
    const data = yield fetchPOST('/api/twitter-auth/end', { authId });
    const { userAuth } = data;
    return userAuth;
});
const apiAccessUser = (auth) => __awaiter(this, void 0, void 0, function* () {
    const data = yield fetchPOST('/api/users/name', { auth });
    const user = data;
    return Object.assign({}, user, { auth });
});
const retrieveAccessUser = (authId) => __awaiter(this, void 0, void 0, function* () {
    // In case you are already logged in.
    {
        const auth = retrieveTwitterAuth();
        if (auth) {
            return yield apiAccessUser(auth);
        }
    }
    // In case it's at the end of auth flow.
    {
        const auth = yield apiAuthEnd(authId);
        if (auth) {
            saveTwitterAuth(auth);
            return yield apiAccessUser(auth);
        }
    }
    return undefined;
});
class AppComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: maybeLoggedIn(),
            authId: retrieveAuthId(),
            accessUser: undefined,
        };
    }
    componentDidMount() {
        return __awaiter(this, void 0, void 0, function* () {
            const { authId } = this.state;
            const accessUser = yield retrieveAccessUser(authId);
            this.setState({ loading: false, accessUser });
        });
    }
    render() {
        const { loading, authId, accessUser } = this.state;
        if (loading) {
            return (React.createElement("article", { id: 'loading-component' },
                React.createElement("header", null,
                    React.createElement("h1", null, "Solotter")),
                React.createElement("main", null,
                    React.createElement("div", { className: 'loading-message' }, "Loading..."))));
        }
        if (accessUser === undefined) {
            return React.createElement(WelcomeComponent, { authId: authId });
        }
        return React.createElement(TweetComponent, { accessUser: accessUser });
    }
}
class WelcomeComponent extends React.Component {
    render() {
        return (React.createElement("article", { id: 'welcome-component' },
            React.createElement("header", null,
                React.createElement("h1", null, "Solotter | Welcome")),
            React.createElement("main", null,
                React.createElement("p", null,
                    React.createElement("b", null, "Solotter"),
                    " is a twitter client for those who want to stay focused on work."),
                React.createElement("form", { method: 'POST', action: '/api/twitter-auth-request' },
                    React.createElement("input", { type: "hidden", name: "authId", value: this.props.authId }),
                    React.createElement("button", null, "Login with Twitter")))));
    }
}
class TweetComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            text: '',
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
                yield fetchPOST('/api/tweet', { text: this.state.text });
                yield this.update({ text: '' });
            }
            finally {
                yield this.update({ loading: false });
            }
        });
    }
    render() {
        const fullName = this.getFullName();
        const { loading, text } = this.state;
        return (React.createElement("article", { id: 'tweet-component' },
            React.createElement("header", null,
                React.createElement("h1", null, "Solotter | Tweet")),
            React.createElement("main", null,
                React.createElement("div", { className: 'user-name' }, fullName),
                React.createElement("form", { className: 'tweet-form', onSubmit: ev => { ev.preventDefault(); this.submit(); } },
                    React.createElement("textarea", { className: 'tweet-textarea', rows: 4, placeholder: 'What are you doing?', readOnly: loading, value: text || '', onChange: ev => this.onTextChange(ev.target.value) }),
                    React.createElement("button", { className: 'tweet-button', disabled: loading }, "Submit")))));
    }
}
exports.main = () => __awaiter(this, void 0, void 0, function* () {
    ReactDOM.render(React.createElement(AppComponent, null), document.getElementById('app'));
});
//# sourceMappingURL=AppComponent.js.map