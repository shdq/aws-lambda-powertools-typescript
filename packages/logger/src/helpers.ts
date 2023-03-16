import { Logger } from './Logger.js';
import type { ConstructorOptions } from './types/index.js';

const createLogger = (options: ConstructorOptions = {}): Logger => new Logger(options);

export {
  createLogger,
};