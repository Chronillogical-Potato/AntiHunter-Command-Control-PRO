import { Transform, TransformCallback } from 'node:stream';

const MAGIC_BYTE_1 = 0x94;
const MAGIC_BYTE_2 = 0xc3;
const HEADER_SIZE = 4;
const MAX_PAYLOAD_SIZE = 4096;

export type MeshtasticFrameEvent = { type: 'frame'; data: Buffer } | { type: 'text'; data: string };

export class MeshtasticFrameParser extends Transform {
  private buffer = Buffer.alloc(0);
  private textAccumulator = '';

  constructor() {
    super({ readableObjectMode: true });
  }

  override _transform(chunk: Buffer, _encoding: string, callback: TransformCallback): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    this.extract();
    callback();
  }

  override _flush(callback: TransformCallback): void {
    this.flushText();
    this.buffer = Buffer.alloc(0);
    callback();
  }

  private extract(): void {
    while (this.buffer.length > 0) {
      const magicIndex = this.findMagic();

      if (magicIndex < 0) {
        this.accumulateText(this.buffer);
        const lastByte = this.buffer[this.buffer.length - 1];
        if (lastByte === MAGIC_BYTE_1) {
          this.buffer = this.buffer.subarray(this.buffer.length - 1);
        } else {
          this.buffer = Buffer.alloc(0);
        }
        return;
      }

      if (magicIndex > 0) {
        this.accumulateText(this.buffer.subarray(0, magicIndex));
        this.buffer = this.buffer.subarray(magicIndex);
      }

      if (this.buffer.length < HEADER_SIZE) {
        return;
      }

      const payloadLength = (this.buffer[2] << 8) | this.buffer[3];
      if (payloadLength === 0 || payloadLength > MAX_PAYLOAD_SIZE) {
        this.accumulateText(this.buffer.subarray(0, 2));
        this.buffer = this.buffer.subarray(2);
        continue;
      }

      const totalLength = HEADER_SIZE + payloadLength;
      if (this.buffer.length < totalLength) {
        return;
      }

      this.flushText();
      const payload = Buffer.from(this.buffer.subarray(HEADER_SIZE, totalLength));
      this.push({ type: 'frame', data: payload } satisfies MeshtasticFrameEvent);
      this.buffer = this.buffer.subarray(totalLength);
    }
  }

  private accumulateText(bytes: Buffer): void {
    const text = bytes.toString('utf8');
    this.textAccumulator += text;
    this.emitCompleteLines();
  }

  private emitCompleteLines(): void {
    let idx: number;
    while ((idx = this.textAccumulator.search(/\r?\n|\r/)) >= 0) {
      const line = this.textAccumulator.slice(0, idx).trim();
      const eol = this.textAccumulator[idx] === '\r' && this.textAccumulator[idx + 1] === '\n' ? 2 : 1;
      this.textAccumulator = this.textAccumulator.slice(idx + eol);
      if (line) {
        this.push({ type: 'text', data: line } satisfies MeshtasticFrameEvent);
      }
    }
  }

  private flushText(): void {
    this.emitCompleteLines();
    const remaining = this.textAccumulator.trim();
    if (remaining) {
      this.push({ type: 'text', data: remaining } satisfies MeshtasticFrameEvent);
    }
    this.textAccumulator = '';
  }

  private findMagic(): number {
    for (let i = 0; i <= this.buffer.length - 2; i++) {
      if (this.buffer[i] === MAGIC_BYTE_1 && this.buffer[i + 1] === MAGIC_BYTE_2) {
        return i;
      }
    }
    return -1;
  }
}
