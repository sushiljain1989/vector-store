import { logger } from '../utils/logger';

describe('logger', () => {
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  let stdoutOutput = '';
  let stderrOutput = '';

  beforeEach(() => {
    stdoutOutput = '';
    stderrOutput = '';
    process.stdout.write = (chunk: any) => {
      stdoutOutput += chunk;
      return true;
    };
    process.stderr.write = (chunk: any) => {
      stderrOutput += chunk;
      return true;
    };
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });

  it('logs info to stdout', () => {
    logger.info('info message');
    expect(stdoutOutput).toMatch(/INFO: info message/);
    expect(stderrOutput).toBe('');
  });

  it('logs error to stderr', () => {
    logger.error('error message');
    expect(stderrOutput).toMatch(/ERROR: error message/);
    expect(stdoutOutput).toBe('');
  });

  it('logs warn to stderr', () => {
    logger.warn('warn message');
    expect(stderrOutput).toMatch(/WARN: warn message/);
    expect(stdoutOutput).toBe('');
  });

  it('logs debug to stdout', () => {
    logger.debug('debug message');
    expect(stdoutOutput).toMatch(/DEBUG: debug message/);
    expect(stderrOutput).toBe('');
  });

  it('logs trace to stdout', () => {
    logger.trace('trace message');
    expect(stdoutOutput).toMatch(/TRACE: trace message/);
    expect(stderrOutput).toBe('');
  });

  it(' error with stack trace', () => {
    const err = new Error('fail');
    logger.error('error with stack', err);
    expect(stderrOutput).toMatch(/ERROR: error with stack/);
    expect(stderrOutput).toMatch(/Error: fail/);
  });
});
