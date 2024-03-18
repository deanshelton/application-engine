import color from 'colors';
import * as logger from 'loglevel';
import prefix from 'loglevel-plugin-prefix';

export type Logger = logger.Logger

interface LoggerConf {
   level?: logger.LogLevelDesc 
}
/* istanbul ignore next */ // Not worth testing a logger.
export const getLogger = (obj:LoggerConf={} ) => {

  const colors = {
    TRACE: color.magenta,
    DEBUG: color.cyan,
    INFO: color.blue,
    WARN: color.yellow,
    ERROR: color.red
  };
  // logger.setDefaultLevel('debug');
  prefix.reg(logger);
  const log = logger.getLogger('App');
  log.setLevel(obj.level || 'WARN');

  prefix.apply(log, {
    format(level, name, timestamp) {
      return `${color.gray(`[${timestamp}]`)} ${(colors as any)[level.toUpperCase()](level)} ${color.green(`${name}:`)}`;
    }
  });

  prefix.apply(log, {
    format(level, name, timestamp) {
      return color.red.bold(`[${timestamp}] ${level} ${name}:`);
    }
  });
  return log;
};
