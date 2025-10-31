export interface FpvAddonStatus {
  enabled: boolean;
  available: boolean;
  message?: string;
  framesReceived: number;
  lastFrameAt?: string;
}
