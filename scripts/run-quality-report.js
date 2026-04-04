#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const steps = [
  {
    name: 'type-check',
    command: 'npm',
    args: ['run', 'type-check']
  },
  {
    name: 'entrypoints',
    command: 'npm',
    args: ['run', 'verify:entrypoints']
  },
  {
    name: 'lint',
    command: 'npm',
    args: ['run', 'lint:repo']
  }
];

const failures = [];

for (const step of steps) {
  const result = spawnSync(step.command, step.args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    failures.push(step.name);
  }
}

if (failures.length === 0) {
  console.log('Quality report passed.');
  process.exit(0);
}

console.warn(
  `Quality report found outstanding issues in: ${failures.join(', ')}`
);
console.warn(
  'This report is advisory. Use `npm run verify:quality:strict` to enforce it as a blocking gate.'
);
process.exit(0);
