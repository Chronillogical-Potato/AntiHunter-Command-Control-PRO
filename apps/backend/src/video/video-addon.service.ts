import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { FpvAddonStatus } from './video.types';

type FpvDecoderModule = typeof import('@command-center/fpv-decoder');
type FpvDecoderFactory = FpvDecoderModule['createFpvDecoder'];
type FpvDecoderInstance = ReturnType<FpvDecoderFactory>;

@Injectable()
export class VideoAddonService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VideoAddonService.name);
  private decoderInstance?: FpvDecoderInstance;
  private stopHandle?: () => Promise<void> | void;
  private status: FpvAddonStatus = {
    enabled: false,
    available: false,
    framesReceived: 0,
  };

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.configService.get<boolean>('video.fpvEnabled', false);
    this.status.enabled = enabled;

    if (!enabled) {
      this.status.message = 'FPV decoder disabled';
      return;
    }

    await this.tryInitializeDecoder();
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdownDecoder();
  }

  getStatus(): FpvAddonStatus {
    return { ...this.status };
  }

  private async tryInitializeDecoder(): Promise<void> {
    let factory: FpvDecoderFactory | undefined;
    try {
      ({ createFpvDecoder: factory } = await import('@command-center/fpv-decoder'));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'FPV decoder addon is not installed (install @command-center/fpv-decoder)';
      this.logger.warn(`Unable to load FPV decoder addon: ${message}`);
      this.status.available = false;
      this.status.message = message;
      return;
    }

    try {
      this.decoderInstance = factory({ source: 'soapy-litexm2sdr' });
      this.decoderInstance.onFrame(() => {
        this.status.framesReceived += 1;
        this.status.lastFrameAt = new Date().toISOString();
      });
      const handle = await this.decoderInstance.start();
      if (handle?.stop) {
        this.stopHandle = () => handle.stop();
      } else if (typeof this.decoderInstance.stop === 'function') {
        this.stopHandle = () => this.decoderInstance?.stop?.();
      }
      this.status.available = true;
      this.status.message = 'FPV decoder addon loaded';
      this.logger.log('FPV decoder addon initialized (stub)');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize FPV decoder addon';
      this.logger.error(`FPV decoder initialization error: ${message}`);
      this.status.available = false;
      this.status.message = message;
    }
  }

  private async shutdownDecoder(): Promise<void> {
    try {
      if (this.stopHandle) {
        await this.stopHandle();
      } else if (this.decoderInstance?.stop) {
        await this.decoderInstance.stop();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Error stopping FPV decoder addon: ${message}`);
    } finally {
      this.decoderInstance = undefined;
      this.stopHandle = undefined;
    }
  }
}
