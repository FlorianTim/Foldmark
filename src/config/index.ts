import rawConfig from './app.config.json';
import { AppConfigSchema } from './AppConfig';

/** Validated, runtime-safe public application configuration. */
export const appConfig = AppConfigSchema.parse(rawConfig);
