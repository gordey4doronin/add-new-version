const core = require('@actions/core');
const github = require('@actions/github');
const uuid = require('uuid');
const fetch = require('node-fetch');
const util = require('util');

async function run() {
    const local = process.env.NODE_ENV == 'local';
    const token = !local ? core.getInput('repo-token', { required: true }) : process.env.TOKEN;
    const octokit = new github.GitHub(token);
    const { owner, repo } = !local ? github.context.repo : { owner: 'gordey4doronin', repo: 'apple-version-history' };

    core.debug(`owner: ${owner}`);
    core.debug(`repo: ${repo}`);

    const masterRef = await octokit.git.getRef({ owner, repo, ref: 'heads/master' });
    const masterSha = masterRef.data.object.sha;
    core.debug(`masterSha: ${masterSha}`);

    const masterCommit = await octokit.git.getCommit({ owner, repo, commit_sha: masterSha });
    const masterTreeSha = masterCommit.data.tree.sha;

    const newRefName = `apple-version-history-${uuid.v4()}`;
    core.debug(`newRefName: ${newRefName}`);

    await octokit.git.createRef({ owner, repo, ref: `refs/heads/${newRefName}`, sha: masterRef.data.object.sha })

    const fileName = 'ios-version-history.json';

    const content = await fetchContent();
    modifyContent(content);
    core.debug(`content: ${content}`);

    const newBlob = await octokit.git.createBlob({ owner, repo, content: JSON.stringify(content, null, 4) });
    const newBlobSha = newBlob.data.sha;
    core.debug(`newBlobSha: ${newBlobSha}`);

    const newTree = await octokit.git.createTree({
        owner, repo, base_tree: masterTreeSha, tree: [{
            path: fileName,
            mode: '100644',
            type: 'blob',
            sha: newBlob.data.sha
        }]
    });
    const newTreeSha = newTree.data.sha;
    core.debug(`newTreeSha: ${newTreeSha}`);

    const newCommit = await octokit.git.createCommit({ owner, repo, message: 'Committed via Octokit!', tree: newTree.data.sha, parents: [masterSha] });
    const newCommitSha = newCommit.data.sha;
    core.debug(`newCommitSha: ${newCommitSha}`);

    try {
        await octokit.git.updateRef({ owner, repo, ref: `refs/${newRefName}`, sha: newCommit.data.sha });
    } catch (error) {
        core.error(util.inspect(error));
    }
    core.debug(`ref updated`);

    await octokit.pulls.create({ owner, repo, title: 'Test PR created by action', head: newRefName, base: 'master', });
    core.debug(`pr created`);
}

async function fetchContent() {
    const response = await fetch('https://raw.githubusercontent.com/gordey4doronin/apple-version-history/master/ios-version-history.json');
    return response.json();
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
