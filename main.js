#!/usr/bin/env node
const sodium = require('tweetsodium');
const { Octokit } = require('octokit');

let name = process.argv[2];
if (!name) {
    console.info("Usage: %s <owner>/<repo>", process.argv[1]);
    return;
}
name = name.split('/');

const owner = name[0];
const repo = name[1];
const secret = require('./secret.json');

async function main() {
    console.info("owner: %s repo:%s", owner, repo);
    const octokit = new Octokit({ auth: secret.token });
    let resp = await octokit.request(`GET /repos/{owner}/{repo}/actions/secrets/public-key`, { owner, repo, })
    let pubkey = resp.data.key;
    let key_id = resp.data.key_id;

    console.info("key_id: %s", key_id);
    function encryptSecret(value) {
        const messageBytes = Buffer.from(value);
        const keyBytes = Buffer.from(pubkey, 'base64');
        const encryptedBytes = sodium.seal(messageBytes, keyBytes);
        return Buffer.from(encryptedBytes).toString('base64');
    }

    for (let secret_name in secret.secrets) {
        console.info("put secret: %s", secret_name);
        let encrypted_value = encryptSecret(secret.secrets[secret_name]);
        await octokit.request('PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}', { owner, repo, secret_name, encrypted_value, key_id })
    }
}

main().then(() => console.log('OK')).catch(err => console.error(err));