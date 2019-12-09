"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const uuid_1 = __importDefault(require("uuid"));
const node_fetch_1 = __importDefault(require("node-fetch"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const local = process.env.NODE_ENV == 'local';
        const token = !local ? core.getInput('repo-token', { required: true }) : process.env.TOKEN;
        const client = new github.GitHub(token);
        const { owner, repo } = !local ? github.context.repo : { owner: 'gordey4doronin', repo: 'apple-version-history' };
        core.debug(`owner: ${owner}`);
        core.debug(`repo: ${repo}`);
        const masterRef = yield client.git.getRef({ owner, repo, ref: 'heads/master' });
        core.debug(`masterSha: ${masterRef.data.object.sha}`);
        const fileName = 'ios-version-history.json';
        const data = yield fetchData(fileName);
        modifyData(data);
        const stringified = JSON.stringify(data, replacer, 4).replace(/\"\[/g, '[').replace(/\]\"/g, ']').replace(/\\"/g, '"').replace(/\\"/g, '"') + '\n';
        const content = Buffer.from(stringified).toString('base64');
        const file = yield client.repos.getContents({ owner, repo, path: fileName });
        const newRefName = `apple-version-history-${uuid_1.default.v4()}`;
        core.debug(`newRefName: ${newRefName}`);
        yield client.git.createRef({ owner, repo, ref: `refs/heads/${newRefName}`, sha: masterRef.data.object.sha });
        yield client.repos.createOrUpdateFile({ owner, repo, content, message: 'Committed via Octokit!', path: fileName, branch: newRefName, sha: file.data.sha });
        yield client.pulls.create({ owner, repo, title: 'Test PR created by action', head: newRefName, base: 'master', });
        core.debug(`pr created`);
    });
}
function replacer(_, value) {
    if (Array.isArray(value)) {
        return `[ ${value.map((x) => `"${x}"`).join(', ')} ]`;
    }
    else {
        return value;
    }
}
function fetchData(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield node_fetch_1.default(`https://raw.githubusercontent.com/gordey4doronin/apple-version-history/master/${fileName}`);
        return response.json();
    });
}
function modifyData(data) {
    const newVersion = '11.4.777';
    const newBuild = 'OMG';
    const newContent = {};
    newContent[newVersion] = [newBuild];
    Object.assign(data['iOS 11.4.x'], newContent);
}
run();
