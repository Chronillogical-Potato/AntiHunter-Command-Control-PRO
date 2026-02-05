import { bootstrap, BootstrapResult } from './bootstrap';

const isSilent =
  process.argv.includes('--silent') || process.argv.includes('-s') || process.env.SILENT === 'true';

if (isSilent) {
  process.env.LOG_LEVEL = 'error';

  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
}

let bootstrapResult: BootstrapResult | null = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`Received ${signal}, shutting down gracefully...`);

  if (bootstrapResult) {
    try {
      // Close redirect server first if it exists
      const result = bootstrapResult; // Capture in const for TypeScript null check
      if (result.redirectServer) {
        await new Promise<void>((resolve) => {
          result.redirectServer?.close(() => {
            console.log('Redirect server closed');
            resolve();
          });
        });
      }

      // Close NestJS app (this also closes the main HTTP/HTTPS server)
      await result.app.close();
      console.log('Application closed successfully');
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  process.exit(0);
}

// Register signal handlers for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
// SIGUSR2 is used by ts-node-dev for restarts
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

bootstrap()
  .then((result) => {
    bootstrapResult = result;
  })
  .catch((error) => {
    console.error('Fatal error starting Command Center backend', error);
    process.exit(1);
  });
