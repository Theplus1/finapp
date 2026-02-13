import { Logger } from '@nestjs/common';

const jobLocks = new Map<string, boolean>();
const logger = new Logger('JobLock');

/**
 * Lock decorator to prevent concurrent execution of cron jobs
 * 
 * Usage:
 * @Lock('jobName')
 * @Cron(CronExpression.EVERY_5_MINUTES)
 * async myJob() { ... }
 */
export function Lock(lockKey: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Check if job is already running
      if (jobLocks.get(lockKey)) {
        logger.warn(`Job '${lockKey}' already running, skipping execution`);
        return;
      }

      // Acquire lock
      jobLocks.set(lockKey, true);
      logger.debug(`Lock acquired for job '${lockKey}'`);

      try {
        // Execute the original method
        return await originalMethod.apply(this, args);
      } finally {
        // Release lock
        jobLocks.set(lockKey, false);
        logger.debug(`Lock released for job '${lockKey}'`);
      }
    };

    return descriptor;
  };
}
