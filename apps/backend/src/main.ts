import { bootstrap } from './bootstrap';

bootstrap().catch((error) => {
  console.error('Fatal error starting Command Center backend', error);
  process.exit(1);
});
