import { spawnSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const helper = join(dir, 'scripts/git-credential-github-env.sh');
chmodSync(helper, 0o755);

function run(token, input) {
  const env = { ...process.env };
  if (token === null) delete env.GH_SIBLING_PUSH_TOKEN;
  else env.GH_SIBLING_PUSH_TOKEN = token;
  const r = spawnSync(helper, ['get'], {
    encoding: 'utf8',
    input,
    env,
  });
  if (r.status !== 0) {
    throw new Error(`helper exit ${r.status}: ${r.stderr}`);
  }
  return r.stdout;
}

const github = 'protocol=https\nhost=github.com\n\n';
if (run(null, github) !== '') {
  throw new Error('helper must stay silent without GH_SIBLING_PUSH_TOKEN');
}
if (run('', github) !== '') {
  throw new Error('helper must stay silent when GH_SIBLING_PUSH_TOKEN is empty');
}

const fake = 'env-store-test-token';
const filled = run(fake, github);
if (!filled.includes('username=x-access-token')) {
  throw new Error('helper must emit x-access-token username');
}
if (!filled.includes(`password=${fake}`)) {
  throw new Error('helper must emit password from GH_SIBLING_PUSH_TOKEN');
}

const other = run(fake, 'protocol=https\nhost=example.com\n\n');
if (other !== '') {
  throw new Error('helper must ignore non-github hosts');
}

console.log('git-credential-github-env.smoke: ok');
