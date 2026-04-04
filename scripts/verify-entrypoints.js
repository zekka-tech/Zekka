#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const roots = [
  'src',
  'scripts',
  'tests',
  'package.json',
  'frontend/package.json'
];

const disallowedPatterns = [
  {
    label: 'deprecated runtime entrypoint',
    needle: 'src/index.secure.js'
  },
  {
    label: 'legacy migration runner',
    needle: 'src/utils/database-migrations.js'
  }
];

const skipFiles = new Set([
  path.join('src', 'index.secure.js'),
  path.join('src', 'utils', 'database-migrations.js'),
  path.join('scripts', 'verify-entrypoints.js')
]);

function walk(targetPath, collected) {
  const absolutePath = path.join(repoRoot, targetPath);
  const stats = fs.statSync(absolutePath);

  if (stats.isDirectory()) {
    for (const entry of fs.readdirSync(absolutePath)) {
      walk(path.join(targetPath, entry), collected);
    }
    return;
  }

  if (!skipFiles.has(targetPath)) {
    collected.push(targetPath);
  }
}

const files = [];
for (const root of roots) {
  if (fs.existsSync(path.join(repoRoot, root))) {
    walk(root, files);
  }
}

const violations = [];
for (const relativePath of files) {
  const absolutePath = path.join(repoRoot, relativePath);
  const contents = fs.readFileSync(absolutePath, 'utf8');

  for (const pattern of disallowedPatterns) {
    if (contents.includes(pattern.needle)) {
      violations.push({
        file: relativePath,
        pattern: pattern.label,
        needle: pattern.needle
      });
    }
  }
}

if (violations.length > 0) {
  console.error('Deprecated entrypoint references found:');
  violations.forEach((violation) => {
    console.error(
      `- ${violation.file}: ${violation.pattern} (${violation.needle})`
    );
  });
  process.exit(1);
}

console.log('Entrypoint verification passed.');
