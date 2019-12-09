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
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const github = require("@actions/github");
const uuid_1 = require("uuid");
const node_fetch_1 = require("node-fetch");
const util_1 = require("util");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const local = process.env.NODE_ENV == 'local';
        const token = !local ? core.getInput('repo-token', { required: true }) : process.env.TOKEN;
        const octokit = new github.GitHub(token);
        const { owner, repo } = !local ? github.context.repo : { owner: 'gordey4doronin', repo: 'apple-version-history' };
        core.debug(`owner: ${owner}`);
        core.debug(`repo: ${repo}`);
        const masterRef = yield octokit.git.getRef({ owner, repo, ref: 'heads/master' });
        const masterSha = masterRef.data.object.sha;
        core.debug(`masterSha: ${masterSha}`);
        const masterCommit = yield octokit.git.getCommit({ owner, repo, commit_sha: masterSha });
        const masterTreeSha = masterCommit.data.tree.sha;
        const newRefName = `apple-version-history-${uuid_1.default.v4()}`;
        core.debug(`newRefName: ${newRefName}`);
        yield octokit.git.createRef({ owner, repo, ref: `refs/heads/${newRefName}`, sha: masterRef.data.object.sha });
        const fileName = 'ios-version-history.json';
        const content = yield fetchContent();
        modifyContent(content);
        core.debug(`content: ${content}`);
        const newBlob = yield octokit.git.createBlob({ owner, repo, content: JSON.stringify(content, null, 4) });
        const newBlobSha = newBlob.data.sha;
        core.debug(`newBlobSha: ${newBlobSha}`);
        const newTree = yield octokit.git.createTree({
            owner, repo, base_tree: masterTreeSha, tree: [{
                    path: fileName,
                    mode: '100644',
                    type: 'blob',
                    sha: newBlob.data.sha
                }]
        });
        const newTreeSha = newTree.data.sha;
        core.debug(`newTreeSha: ${newTreeSha}`);
        const newCommit = yield octokit.git.createCommit({ owner, repo, message: 'Committed via Octokit!', tree: newTree.data.sha, parents: [masterSha] });
        const newCommitSha = newCommit.data.sha;
        core.debug(`newCommitSha: ${newCommitSha}`);
        try {
            yield octokit.git.updateRef({ owner, repo, ref: `refs/${newRefName}`, sha: newCommit.data.sha });
        }
        catch (error) {
            core.error(util_1.default.inspect(error));
        }
        core.debug(`ref updated`);
        yield octokit.pulls.create({ owner, repo, title: 'Test PR created by action', head: newRefName, base: 'master', });
        core.debug(`pr created`);
    });
}
function fetchContent() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield node_fetch_1.default('https://raw.githubusercontent.com/gordey4doronin/apple-version-history/master/ios-version-history.json');
        return response.json();
    });
}
function modifyContent(content) {
    const newVersion = '11.4.777';
    const newBuild = 'OMG';
    const newContent = {};
    newContent[newVersion] = [newBuild];
    Object.assign(content['iOS 11.4.x'], newContent);
    return content;
}
run();
