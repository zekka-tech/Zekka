/**
 * Legacy migration compatibility wrapper.
 *
 * The canonical migration implementation now lives in:
 * - `src/cli/migrate.js` for CLI execution
 * - `src/utils/migration-manager.js` for programmatic use
 *
 * This file remains only to preserve backward compatibility for any
 * out-of-tree callers that still import or execute the old path.
 */

const path = require('path');
const { spawn } = require('child_process');
const MigrationManager = require('./migration-manager');

function runCLI() {
  const cliPath = path.join(__dirname, '../cli/migrate.js');

  console.warn(
    '[DEPRECATED] src/utils/database-migrations.js is a compatibility shim. '
      + 'Use src/cli/migrate.js or src/utils/migration-manager.js instead.'
  );

  const child = spawn(process.execPath, [cliPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code || 0);
  });
}

if (require.main === module) {
  runCLI();
}

module.exports = {
  MigrationManager,
  runCLI
};
