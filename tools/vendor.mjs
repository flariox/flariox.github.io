import { createHash } from 'node:crypto';
import { chmod, copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const specifications = [
  {
    name: 'marked',
    files: [
      ['lib/marked.umd.js', 'assets/vendor/marked/marked.umd.js'],
      ['lib/marked.umd.js.map', 'assets/vendor/marked/marked.umd.js.map'],
      ['LICENSE.md', 'assets/vendor/marked/LICENSE.md']
    ]
  },
  {
    name: 'dompurify',
    files: [
      ['dist/purify.min.js', 'assets/vendor/dompurify/purify.min.js'],
      ['dist/purify.min.js.map', 'assets/vendor/dompurify/purify.min.js.map'],
      ['LICENSE', 'assets/vendor/dompurify/LICENSE']
    ]
  },
  {
    name: '@fortawesome/fontawesome-free',
    files: [
      ['css/all.css', 'assets/webfonts/css/all.css'],
      ['LICENSE.txt', 'assets/webfonts/LICENSE.txt'],
      ...['fa-brands-400', 'fa-regular-400', 'fa-solid-900', 'fa-v4compatibility'].flatMap(name =>
        ['woff2', 'ttf'].map(extension => [`webfonts/${name}.${extension}`, `assets/webfonts/webfonts/${name}.${extension}`]))
    ]
  }
];

const dependencies = [];
for (const specification of specifications) {
  const installedRoot = path.join(root, 'node_modules', specification.name);
  const installed = JSON.parse(await readFile(path.join(installedRoot, 'package.json'), 'utf8'));
  if (installed.version !== packageJson.dependencies[specification.name]) {
    throw new Error(`Version mismatch for ${specification.name}; run npm ci first.`);
  }
  const files = [];
  for (const [sourcePath, destinationPath] of specification.files) {
    const destination = path.join(root, destinationPath);
    await mkdir(path.dirname(destination), { recursive: true });
    const previousMode = await stat(destination).then(file => file.mode & 0o777, () => undefined);
    await copyFile(path.join(installedRoot, sourcePath), destination);
    if (previousMode !== undefined) await chmod(destination, previousMode);
    const contents = await readFile(destination);
    files.push({ path: destinationPath, source: sourcePath, sha256: createHash('sha256').update(contents).digest('hex') });
  }
  dependencies.push({
    name: specification.name,
    version: installed.version,
    source: `https://registry.npmjs.org/${specification.name}/-/${specification.name.split('/').at(-1)}-${installed.version}.tgz`,
    license: installed.license,
    files
  });
}
await mkdir(path.join(root, 'assets/vendor'), { recursive: true });
await writeFile(path.join(root, 'assets/vendor/manifest.json'), `${JSON.stringify({ dependencies }, null, 2)}\n`);
console.log('Vendored exact dependency versions, licenses, and SHA-256 checksums.');
