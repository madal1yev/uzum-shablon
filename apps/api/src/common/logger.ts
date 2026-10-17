import { loadEnv } from '@marketpix/config';
import { type Env } from '@marketpix/config';
import pino, { type Logger } from 'pino';

export const loggerProvider = 'MP_LOGGER';

export function httpLoggerOptions(env: Env = loadEnv()) {
  return {
    logger: buildLogger(env),
    genReqId: (req: { headers: Record<string, unknown>; id?: unknown }) => {
      const h = req.headers['x-request-id'];
      const id = typeof h === 'string' && h.length <= 64 ? h : undefined;
      req.id = id;
      return id;
    },
    customProps: (req: { id?: unknown }) => ({ requestId: req.id }),
    autoLogging: env.NODE_ENV !== 'test',
  };
}

export function buildLogger(env: Env = loadEnv()): Logger {
  const options: pino.LoggerOptions = {
    level: env.LOG_LEVEL,
    base: { service: 'marketpix-api' },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        'newPassword',
        'currentPassword',
        'token',
        'accessToken',
        'refreshToken',
        'apiKey',
        'secret',
      ],
      censor: '[redacted]',
    },
  };
  if (env.NODE_ENV === 'development') {
    return pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' },
      },
    });
  }
  return pino(options);
}
