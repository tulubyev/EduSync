import { spawn } from 'child_process';
import { logger } from '../../logger';

export class AudioSetup {
  private audioAvailable: boolean = false;
  private sinkName: string;

  constructor(workerId: string = 'default') {
    const safeName = workerId.replace(/[^a-zA-Z0-9]/g, '_');
    this.sinkName = `epa_sink_${safeName}`;
  }

  async initialize(): Promise<boolean> {
    try {
      const paRunning = await this.ensurePulseAudio();
      if (!paRunning) {
        logger.warn('PulseAudio not available - video-only recording');
        this.audioAvailable = false;
        return false;
      }

      await this.ensureVirtualSink();

      const sinkExists = await this.checkSinkExists();
      this.audioAvailable = sinkExists;

      if (sinkExists) {
        logger.info(`Audio ready: PulseAudio virtual sink '${this.sinkName}' active`);
      } else {
        logger.warn('Virtual sink not created - video-only recording');
      }
      return sinkExists;
    } catch (error) {
      logger.warn('Audio initialization failed:', error);
      this.audioAvailable = false;
      return false;
    }
  }

  private async ensurePulseAudio(): Promise<boolean> {
    return new Promise((resolve) => {
      const check = spawn('pulseaudio', ['--check'], { stdio: 'ignore' });
      check.on('close', (code) => {
        if (code === 0) return resolve(true);
        const start = spawn('pulseaudio', ['--start', '--exit-idle-time=-1'], {
          stdio: 'ignore', detached: true,
        });
        start.on('error', () => resolve(false));
        setTimeout(() => {
          const recheck = spawn('pulseaudio', ['--check'], { stdio: 'ignore' });
          recheck.on('close', (c) => resolve(c === 0));
          recheck.on('error', () => resolve(false));
        }, 1500);
      });
      check.on('error', () => resolve(false));
    });
  }

  private async ensureVirtualSink(): Promise<void> {
    return new Promise((resolve) => {
      const list = spawn('pactl', ['list', 'sinks', 'short'], { stdio: ['ignore', 'pipe', 'ignore'] });
      let output = '';
      list.stdout?.on('data', (d) => output += d.toString());
      list.on('close', () => {
        if (output.includes(this.sinkName)) {
          return resolve();
        }
        const create = spawn('pactl', [
          'load-module', 'module-null-sink',
          `sink_name=${this.sinkName}`,
          `sink_properties=device.description=EPA_${this.sinkName}`,
        ], { stdio: 'ignore' });
        create.on('close', () => {
          setTimeout(resolve, 500);
        });
        create.on('error', () => resolve());
      });
      list.on('error', () => resolve());
    });
  }

  async unloadSink(): Promise<void> {
    return new Promise((resolve) => {
      const list = spawn('pactl', ['list', 'modules', 'short'], { stdio: ['ignore', 'pipe', 'ignore'] });
      let output = '';
      list.stdout?.on('data', (d) => output += d.toString());
      list.on('close', () => {
        const lines = output.split('\n');
        const sinkLine = lines.find(l => l.includes(this.sinkName));
        if (!sinkLine) return resolve();
        const moduleId = sinkLine.trim().split(/\s+/)[0];
        if (!moduleId) return resolve();
        const unload = spawn('pactl', ['unload-module', moduleId], { stdio: 'ignore' });
        unload.on('close', () => resolve());
        unload.on('error', () => resolve());
      });
      list.on('error', () => resolve());
    });
  }

  private async checkSinkExists(): Promise<boolean> {
    return new Promise((resolve) => {
      const list = spawn('pactl', ['list', 'sinks', 'short'], { stdio: ['ignore', 'pipe', 'ignore'] });
      let output = '';
      list.stdout?.on('data', (d) => output += d.toString());
      list.on('close', () => resolve(output.includes(this.sinkName)));
      list.on('error', () => resolve(false));
    });
  }

  isAudioAvailable(): boolean {
    return this.audioAvailable;
  }

  getChromiumAudioFlags(): string[] {
    if (!this.audioAvailable) return [];
    return [
      '--autoplay-policy=no-user-gesture-required',
      '--disable-features=AudioServiceOutOfProcess',
    ];
  }

  getChromiumEnv(): Record<string, string> {
    if (!this.audioAvailable) return {};
    return {
      PULSE_SINK: this.sinkName,
      PULSE_SOURCE: `${this.sinkName}.monitor`,
    };
  }

  getFFmpegAudioArgs(): string[] {
    if (!this.audioAvailable) return [];
    return [
      '-use_wallclock_as_timestamps', '1',
      '-f', 'pulse',
      '-i', `${this.sinkName}.monitor`,
    ];
  }

  async cleanup(): Promise<void> {
    if (this.audioAvailable) {
      await this.unloadSink();
      logger.info(`Audio sink '${this.sinkName}' unloaded`);
    }
  }
}

export const audioSetup = new AudioSetup('default');
