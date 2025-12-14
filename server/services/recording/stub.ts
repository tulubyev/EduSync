
export const recordingScheduler = {
  start: () => {},
  stop: () => {},
  isActive: () => false,
};

export const recordingTaskManager = {
  createTask: async () => { throw new Error('Recording disabled in production'); },
  getTask: async () => null,
  getUserTasks: async () => [],
  getScheduledTasks: async () => [],
  updateTaskStatus: async () => {},
  cancelTask: async () => {},
  executeTask: async () => {},
  recoverTask: async () => {},
  getActiveTask: () => null,
  isTaskProcessing: () => false,
};

export const streamingRecorderService = {
  initialize: async () => ({ audioAvailable: false }),
  startBrowser: async () => {},
  stopBrowser: async () => {},
  navigateToStream: async () => {},
  startStreamingRecording: async () => ({ outputPath: '' }),
  waitForRecordingComplete: async () => ({ 
    filePath: '', 
    actualDuration: 0, 
    frameCount: 0, 
    success: false 
  }),
  stopRecording: async () => ({ 
    filePath: '', 
    actualDuration: 0, 
    frameCount: 0, 
    success: false 
  }),
  isRecording: () => false,
  cleanup: async () => {},
};

export const recordingLogger = {
  logEvent: async () => {},
  getTaskLogs: async () => [],
  getTaskEventTimeline: async () => [],
};

export const playlistGenerator = {
  generateM3U8: () => '',
};

export const audioSetup = {
  initialize: async () => false,
  cleanup: async () => {},
  isAudioAvailable: () => false,
  getChromiumAudioFlags: () => [],
  getFFmpegAudioArgs: () => [],
};
