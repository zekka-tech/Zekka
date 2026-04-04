const logger = require('./utils/logger');

logger.warn(
  'src/index.secure.js is deprecated and now delegates to src/index.js. '
  + 'Update any remaining scripts to use the main server entrypoint.'
);

require('./index.js');
