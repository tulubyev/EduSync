
// Conditionally export recording modules or stubs
if (process.env.SKIP_RECORDING === 'true') {
  // Export stubs for production
  module.exports = require('./stub');
} else {
  // Export real modules for development
  export * from './types';
  export { recorderService } from './recorderService';
  export { streamingRecorderService } from './streamingRecorder';
  export { recordingTaskManager } from './taskManager';
  export { playlistGenerator } from './playlistGenerator';
  export { recordingScheduler } from './scheduler';
  export { audioSetup } from './audioSetup';
  export { recordingLogger } from './logger';
}
