import * as core from '@actions/core';
import * as github from '@actions/github';
import { ReposGetContentsResponseItem } from '@octokit/rest';
import uuid from 'uuid';
import fetch from 'node-fetch';

async function run() {
    const local = process.env.NODE_ENV == 'local';
    const token = !local ? core.getInput('repo-token', { required: true }) : process.env.TOKEN;
    const client = new github.GitHub(token!);
    const { owner, repo } = !local ? github.context.repo : { owner: 'gordey4doronin', repo: 'apple-version-history' };

    core.debug(`owner: ${owner}`);
    core.debug(`repo: ${repo}`);

    const masterRef = await client.git.getRef({ owner, repo, ref: 'heads/master' });
    core.debug(`masterSha: ${masterRef.data.object.sha}`);

    const fileName = 'ios-version-history.json';
    const data = await fetchData(fileName);
    modifyData(data);

    const stringified = JSON.stringify(data, replacer, 4).replace(/\"\[/g, '[').replace(/\]\"/g, ']').replace(/\\"/g, '"').replace(/\\"/g, '"') + '\n';
    const content = Buffer.from(stringified).toString('base64');
    const file = await client.repos.getContents({ owner, repo, path: fileName });
    const newRefName = `apple-version-history-${uuid.v4()}`;
    core.debug(`newRefName: ${newRefName}`);
    await client.git.createRef({ owner, repo, ref: `refs/heads/${newRefName}`, sha: masterRef.data.object.sha });
    await client.repos.createOrUpdateFile({ owner, repo, content, message: 'Committed via Octokit!', path: fileName, branch: newRefName, sha: (file.data as ReposGetContentsResponseItem).sha });

    await client.pulls.create({ owner, repo, title: 'Test PR created by action', head: newRefName, base: 'master', });
    core.debug(`pr created`);
}

function replacer(_: string, value: any): any {
    if (Array.isArray(value)) {
        return `[ ${value.map((x) => `"${x}"`).join(', ')} ]`;
    } else {
        return value;
    }
}

async function fetchData(fileName: string): Promise<Object> {
    const response = await fetch(`https://raw.githubusercontent.com/gordey4doronin/apple-version-history/master/${fileName}`);
    return response.json();
}

function modifyData(data: Object): void {
    const newVersion = '11.4.777';
    const newBuild = 'OMG';
    const newContent = {};

    newContent[newVersion] = [newBuild];
    Object.assign(data['iOS 11.4.x'], newContent);
}

run();
