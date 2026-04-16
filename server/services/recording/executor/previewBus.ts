import { EventEmitter } from 'events';

class PreviewBus extends EventEmitter {
  frameEvent(taskId: string): string {
    return `frame:${taskId}`;
  }

  publishFrame(taskId: string, frameData: Buffer): void {
    const event = this.frameEvent(taskId);
    if (this.listenerCount(event) > 0) {
      this.emit(event, frameData);
    }
  }

  hasSubscribers(taskId: string): boolean {
    return this.listenerCount(this.frameEvent(taskId)) > 0;
  }
}

export const previewBus = new PreviewBus();
previewBus.setMaxListeners(50);
