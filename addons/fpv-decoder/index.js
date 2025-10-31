'use strict';

class StubFpvDecoder {
  constructor(options = {}) {
    this.options = options;
    this.running = false;
    this.frameListeners = new Set();
  }

  async start() {
    this.running = true;
    return {
      stop: () => this.stop(),
    };
  }

  onFrame(listener) {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  emitFrame(frame) {
    if (!this.running) {
      return;
    }
    for (const listener of this.frameListeners) {
      try {
        listener(frame);
      } catch {
        // ignore listener errors in stub
      }
    }
  }

  async stop() {
    this.running = false;
    this.frameListeners.clear();
  }
}

function createFpvDecoder(options) {
  return new StubFpvDecoder(options);
}

module.exports = {
  createFpvDecoder,
  StubFpvDecoder,
};
