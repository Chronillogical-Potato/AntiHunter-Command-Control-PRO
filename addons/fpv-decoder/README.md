# FPV Decoder Addon (Scaffold)

This workspace package acts as the integration point for an optional FPV (NTSC) video decoder inside the Command Center stack. The current implementation is a stub so the backend can detect whether the addon is present and enabled. Replace the stub with a real decoder pipeline (SoapySDR ingest → NTSC demod → frame emission) when you are ready.

## Usage

1. Install dependencies at the repo root: `pnpm install`.
2. Enable the decoder in the backend by setting `FPV_DECODER_ENABLED=true` (see `README.md` in the root project).
3. Implement the decoder logic by replacing the contents of `index.js` with a real implementation that exports `createFpvDecoder`.

The backend loads this addon dynamically (marked as an `optionalDependency`) so production builds succeed even when the addon is missing. When present, the backend exposes the decoder status through `GET /video/fpv/status` and will emit frames once the implementation calls `onFrame` listeners.
