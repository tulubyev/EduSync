import { spawn, execSync, ChildProcess } from 'child_process';
import { logger } from '../logger';

const PULSE_SINK_NAME = 'recording_sink';
const PULSE_SINK_DESCRIPTION = 'Virtual sink for browser audio capture';

class AudioSetup {
  private pulseProcess: ChildProcess | null = null;
  private isInitialized = false;
  private sinkModuleId: string | null = null;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      logger.info('PulseAudio already initialized');
      return true;
    }

    try {
      await this.startPulseAudio();
      await this.createVirtualSink();
      this.isInitialized = true;
      logger.info('✅ Audio capture system initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize audio system:', error);
      this.isInitialized = false;
      return false;
    }
  }

  private async startPulseAudio(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        execSync('pulseaudio --check 2>/dev/null', { stdio: 'ignore' });
        logger.info('PulseAudio already running');
        resolve();
      } catch {
        logger.info('Starting PulseAudio daemon...');
        
        this.pulseProcess = spawn('pulseaudio', [
          '--start',
          '--exit-idle-time=-1',
          '--log-level=error',
          '--daemonize=false',
        ], {
          stdio: 'ignore',
          detached: true,
        });

        this.pulseProcess.unref();

        setTimeout(() => {
          try {
            execSync('pulseaudio --check 2>/dev/null', { stdio: 'ignore' });
            logger.info('PulseAudio daemon started');
            resolve();
          } catch {
            reject(new Error('PulseAudio failed to start'));
          }
        }, 1000);
      }
    });
  }

  private async createVirtualSink(): Promise<void> {
    return new Promise((resolve, reject) => {
      let existingModule = '';
      try {
        existingModule = execSync(
          `pactl list short modules 2>/dev/null | grep ${PULSE_SINK_NAME} | awk '{print $1}'`,
          { encoding: 'utf-8' }
        ).trim();
      } catch {
        existingModule = '';
      }

      if (existingModule) {
        this.sinkModuleId = existingModule;
        logger.info(`Virtual sink already exists (module ${existingModule})`);
        resolve();
        return;
      }

      try {
        const output = execSync(
          `pactl load-module module-null-sink sink_name=${PULSE_SINK_NAME} sink_properties=device.description="${PULSE_SINK_DESCRIPTION}"`,
          { encoding: 'utf-8' }
        ).trim();

        this.sinkModuleId = output;
        logger.info(`Created virtual sink: ${PULSE_SINK_NAME} (module ${output})`);

        execSync(`pactl set-default-sink ${PULSE_SINK_NAME}`, { stdio: 'ignore' });
        logger.info('Set virtual sink as default');

        resolve();
      } catch (error) {
        logger.warn('Could not create virtual sink (PulseAudio may not be available):', error);
        this.isInitialized = false;
        reject(new Error('Failed to create PulseAudio virtual sink'));
      }
    });
  }

  getSinkName(): string {
    return `${PULSE_SINK_NAME}.monitor`;
  }

  getChromiumAudioFlags(): string[] {
    return [
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--disable-features=AudioServiceOutOfProcess',
      `--alsa-output-device=pulse`,
    ];
  }

  getFFmpegAudioArgs(): string[] {
    if (!this.isInitialized) {
      return [];
    }
    
    return [
      '-f', 'pulse',
      '-i', this.getSinkName(),
    ];
  }

  isAudioAvailable(): boolean {
    return this.isInitialized;
  }

  async cleanup(): Promise<void> {
    if (this.sinkModuleId) {
      try {
        execSync(`pactl unload-module ${this.sinkModuleId}`, { stdio: 'ignore' });
        logger.info('Virtual sink removed');
      } catch {
      }
    }

    if (this.pulseProcess) {
      this.pulseProcess.kill();
      this.pulseProcess = null;
    }

    this.isInitialized = false;
  }
}

export const audioSetup = new AudioSetup();
