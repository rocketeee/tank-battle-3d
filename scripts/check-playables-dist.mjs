import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../dist-playables/', import.meta.url);
const rootPath = root.pathname;
const banned = [
  'github.io',
  'privacy.html',
  '隐私政策',
  '分享战绩',
  '去除广告',
  '草莓涂装',
  '模拟广告',
  '模拟插屏',
  '激励复活',
  'LANDSCAPE ONLY',
  'requestFullscreen',
  'admob',
  'AdMob',
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const files = walk(rootPath);
let failed = 0;
const html = readFileSync(join(rootPath, 'index.html'), 'utf8');
const sdkAt = html.indexOf('https://www.youtube.com/game_api/v1');
const moduleAt = html.indexOf('<script type="module"');
if (sdkAt < 0 || moduleAt < 0 || sdkAt > moduleAt) {
  console.error('FAIL sdk script must sit before the game module');
  failed += 1;
}
if (!html.includes('src="./assets/') && !html.includes("src='./assets/")) {
  console.error('FAIL game script is not a relative path');
  failed += 1;
}

let raw = 0;
const rows = [];
for (const file of files) {
  const text = readFileSync(file);
  raw += text.length;
  rows.push([text.length, file.slice(rootPath.length)]);
  const body = text.toString('utf8');
  for (const word of banned) {
    if (body.includes(word)) {
      console.error(`FAIL ${word} in ${file.slice(rootPath.length)}`);
      failed += 1;
    }
  }
}
rows.sort((a, b) => b[0] - a[0]);
const limit = 30 * 1024 * 1024;
if (raw >= limit) {
  console.error(`FAIL bundle ${raw} bytes is not under 30 MiB`);
  failed += 1;
}
if (failed) {
  console.error(`${failed} playables checks failed`);
  process.exit(1);
}

rmSync(new URL('../dist-playables.zip', import.meta.url), { force: true });
execFileSync('zip', ['-r', '-q', '../dist-playables.zip', '.'], { cwd: rootPath });
console.log(`playables dist ok, ${files.length} files, ${raw} bytes`);
for (const [size, name] of rows) console.log(`  ${size}\t${name}`);
