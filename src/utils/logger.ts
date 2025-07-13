/**
 * Simple logger utility for info and error messages.
 * Logs messages with timestamps to stdout (info) or stderr (error).
 */

type LogLevel = 'info' | 'error' | 'warn' | 'debug' | 'trace';

/**
 * Logs a message at the specified log level, with optional error details.
 * @param level - The log level ('info' or 'error').
 * @param message - The message to log.
 * @param err - Optional error object or details.
 */
function log(level: LogLevel, message: string, err?: unknown) {
  const timestamp = new Date().toISOString();
  let output = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  if (err) {
    output += ' | ' + (err instanceof Error ? err.stack : String(err));
  }
  // Log to stderr for errors and warnings, stdout for others
  if (level === 'error' || level === 'warn') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

/**
 * Logger object with info and error methods.
 * - info: Logs informational messages to stdout.
 * - error: Logs error messages and optional error details to stderr.
 */
export const logger = {
  info: (message: string) => log('info', message),
  error: (message: string, err?: unknown) => log('error', message, err),
  warn: (message: string) => log('warn', message),
  debug: (message: string) => log('debug', message),
  trace: (message: string) => log('trace', message),
};
