export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  http: {
    port: Number(process.env.PORT ?? 3000),
    prefix: process.env.HTTP_PREFIX ?? 'api',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  serial: {
    device: process.env.SERIAL_DEVICE,
    baudRate: process.env.SERIAL_BAUD ? Number(process.env.SERIAL_BAUD) : 115200,
    delimiter: process.env.SERIAL_DELIMITER ?? '\n',
    protocol: process.env.SERIAL_PROTOCOL ?? 'meshtastic-like',
    perTargetRate: process.env.SERIAL_PER_TARGET_RATE
      ? Number(process.env.SERIAL_PER_TARGET_RATE)
      : 8,
    globalRate: process.env.SERIAL_GLOBAL_RATE ? Number(process.env.SERIAL_GLOBAL_RATE) : 30,
    reconnectBaseMs: process.env.SERIAL_RECONNECT_BASE_MS
      ? Number(process.env.SERIAL_RECONNECT_BASE_MS)
      : 500,
    reconnectMaxMs: process.env.SERIAL_RECONNECT_MAX_MS
      ? Number(process.env.SERIAL_RECONNECT_MAX_MS)
      : 5000,
    reconnectJitter: process.env.SERIAL_RECONNECT_JITTER
      ? Number(process.env.SERIAL_RECONNECT_JITTER)
      : 0.3,
    reconnectMaxAttempts: process.env.SERIAL_RECONNECT_MAX_ATTEMPTS
      ? Number(process.env.SERIAL_RECONNECT_MAX_ATTEMPTS)
      : 0,
  },
  websocket: {
    maxClients: process.env.WS_MAX_CLIENTS ? Number(process.env.WS_MAX_CLIENTS) : 200,
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
    structured: process.env.STRUCTURED_LOGS !== 'false',
  },
});
