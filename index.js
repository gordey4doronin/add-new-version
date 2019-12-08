const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    const token = core.getInput('repo-token', { required: true });
    const octokit = new github.GitHub(token);

    await octokit.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        title: 'Test PR created by action'
    });
}

run();