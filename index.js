const core = require('@actions/core');
const github = require('@actions/github');
const uuid = require('uuid');

async function run() {
    const token = core.getInput('repo-token', { required: true });
    const octokit = new github.GitHub(token);

    const { owner, repo } = github.context.repo;

    const masterRef = await octokit.git.getRef({ owner, repo, ref: 'refs/heads/master' });

    const newRefName = `refs/heads/apple-version-history-${uuid.v4()}`;
    await octokit.git.createRef({ owner, repo, ref: newRefName, sha: masterRef.data.object.sha })

    await octokit.pulls.create({ owner, repo, title: 'Test PR created by action', head: newRefName, base: 'master', });
}

run();