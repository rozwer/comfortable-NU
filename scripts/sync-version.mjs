#!/usr/bin/env node
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

async function updateJson(file, mutate) {
  const abs = path.resolve(process.cwd(), file);
  if (!existsSync(abs)) return false;
  const src = await readFile(abs, 'utf8');
  const json = JSON.parse(src);
  const changed = mutate(json) || false;
  if (changed) {
    await writeFile(abs, JSON.stringify(json, null, 2) + '\n');
  }
  return changed;
}

async function main() {
  const pkg = JSON.parse(await readFile(path.resolve(process.cwd(), 'package.json'), 'utf8'));
  const version = pkg.version;
  if (!version) {
    console.error('package.json has no version');
    process.exit(1);
  }

  const targets = [
    'manifest.json',
    'manifest-v2.json',
    'manifest-firefox.json'
  ];

  const results = [];
  for (const f of targets) {
    const changed = await updateJson(f, (json) => {
      if (json.version !== version) {
        json.version = version;
        return true;
      }
      return false;
    });
    results.push({ file: f, changed });
  }

  const summary = results
    .filter(r => r.changed)
    .map(r => `updated: ${r.file}`)
    .join(', ');
  console.log(summary || 'no manifest files needed updating');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

