export interface FpvFrame {
  /**
   * Raw luminance samples (stub metadata only).
   */
  data?: Uint8Array;
  /**
   * Frame width in pixels.
   */
  width?: number;
  /**
    * Frame height in pixels.
    */
  height?: number;
  /**
   * Frames per second estimate.
   */
  fps?: number;
}

export interface FpvDecoder {
  start(): Promise<{ stop(): Promise<void> | void }>;
  stop(): Promise<void> | void;
  onFrame(listener: (frame: FpvFrame) => void): () => void;
}

export interface FpvDecoderOptions {
  source?: string;
  channel?: number;
}

export function createFpvDecoder(options?: FpvDecoderOptions): FpvDecoder;
