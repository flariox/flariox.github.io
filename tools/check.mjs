import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = relative => readFile(path.join(root, relative), 'utf8');
const exists = async filename => stat(filename).then(value => value.isFile(), () => false);
const failures = [];
function requireCheck(condition, message) {
  if (!condition) failures.push(message);
}

// The site uses plain HTML attributes. Skip comments and inspect only real opening tags.
function tags(html) {
  return [...html.matchAll(/<!--[\s\S]*?-->|<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)]
    .filter(match => match[1])
    .map(match => ({
      tag: match[1].toLowerCase(),
      attributes: Object.fromEntries([...match[2].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
        .map(attribute => [attribute[1].toLowerCase(), attribute[2] ?? attribute[3] ?? attribute[4]]))
    }));
}

const pages = new Map();
for (const filename of (await readdir(root)).filter(name => name.endsWith('.html'))) {
  const html = await read(filename);
  const elements = tags(html);
  const ids = elements.map(element => element.attributes.id).filter(Boolean);
  requireCheck(new Set(ids).size === ids.length, `${filename}: duplicate element IDs`);
  pages.set(filename, { html, elements, ids: new Set(ids) });
}

async function checkReference(from, reference) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) return;
  const url = new URL(reference.replaceAll('&amp;', '&'), `https://local.test/${from}`);
  const target = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
  const filename = path.join(root, target);
  requireCheck(await exists(filename), `${from}: missing local asset ${reference}`);
  if (url.hash && pages.has(target)) {
    requireCheck(pages.get(target).ids.has(decodeURIComponent(url.hash.slice(1))), `${from}: missing anchor ${reference}`);
  }
}
for (const [filename, page] of pages) {
  for (const { attributes } of page.elements) {
    for (const attribute of ['src', 'href', 'action', 'poster']) {
      if (attributes[attribute]) await checkReference(filename, attributes[attribute]);
    }
  }
  for (const script of page.html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(script[1])) continue;
    const result = spawnSync(process.execPath, ['--check', '--input-type=commonjs'], { input: script[2], encoding: 'utf8' });
    requireCheck(result.status === 0, `${filename}: inline JavaScript syntax error: ${result.stderr}`);
  }
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(relative));
    else files.push(relative);
  }
  return files;
}
for (const filename of [...await walk('assets/css'), ...await walk('assets/webfonts/css')]) {
  if (!filename.endsWith('.css')) continue;
  const css = await read(filename);
  for (const match of css.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g)) await checkReference(filename, match[1]);
}
for (const filename of [...await walk('assets/js'), ...await walk('tools'), ...await walk('tests'), 'playwright.config.mjs']) {
  if (!/\.(?:m?js)$/.test(filename)) continue;
  const result = spawnSync(process.execPath, ['--check', path.join(root, filename)], { encoding: 'utf8' });
  requireCheck(result.status === 0, `${filename}: JavaScript syntax error: ${result.stderr}`);
}

const articles = JSON.parse(await read('articles/index.json'));
requireCheck(Array.isArray(articles) && articles.length > 0, 'Article index must be a nonempty array');
requireCheck(new Set(articles).size === articles.length, 'Article index has duplicates');
for (const filename of articles) {
  requireCheck(typeof filename === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.md$/.test(filename), `Invalid article filename: ${filename}`);
  if (typeof filename !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.md$/.test(filename)) continue;
  const content = await read(`articles/${filename}`);
  requireCheck(/^---\r?\n[\s\S]+?\r?\n---/.test(content), `${filename}: missing article metadata`);
}

const packageJson = JSON.parse(await read('package.json'));
const lock = JSON.parse(await read('package-lock.json'));
assert.deepEqual(lock.packages[''].dependencies, packageJson.dependencies, 'Dependency lock is out of date');
assert.deepEqual(lock.packages[''].devDependencies, packageJson.devDependencies, 'Dev dependency lock is out of date');
const manifest = JSON.parse(await read('assets/vendor/manifest.json'));
assert.deepEqual(manifest.dependencies.map(dependency => dependency.name).sort(), Object.keys(packageJson.dependencies).sort(), 'Vendor inventory is incomplete');
for (const dependency of manifest.dependencies) {
  requireCheck(packageJson.dependencies[dependency.name] === dependency.version, `Version mismatch for ${dependency.name}`);
  for (const file of dependency.files) {
    const contents = await readFile(path.join(root, file.path));
    requireCheck(createHash('sha256').update(contents).digest('hex') === file.sha256, `Checksum mismatch: ${file.path}`);
    const installed = await readFile(path.join(root, 'node_modules', dependency.name, file.source));
    requireCheck(contents.equals(installed), `Vendored dependency differs from locked package: ${file.path}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checks passed: ${pages.size} pages, local links/assets, JavaScript, ${articles.length} articles, locked vendor files and checksums.`);
}
