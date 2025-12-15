// Recording modules - EPA Main only exports task manager and logger
// Recording Worker handles actual recording in separate project
export * from './types';
export { recordingTaskManager } from './taskManager';
export { recordingLogger } from './logger';
