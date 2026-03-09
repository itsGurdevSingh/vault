import { CronScheduler } from "./scheduler.js";
import { createRotationJob } from "./jobs/rotation.job.js";
import { createCleanupJob } from "./jobs/cleanup.job.js";

export function startCron({
  rotationService,
  janitorService,
  garbageService,
  logger
}) {
  const scheduler = new CronScheduler(logger);

  const isDev = process.env.NODE_ENV !== 'production';

  scheduler.register({
    name: "key-rotation",
    intervalMs: 24 * 60 * 60 * 1000, // every 24 hours
    task: createRotationJob({ rotationService })
  });

  scheduler.register({
    name: "expired-key-cleanup",
    intervalMs: 6 * 60 * 60 * 1000, // every 6 hours
    task: createCleanupJob({ janitorService })
  });

  // In development, run garbage collection much less frequently to avoid log spam
  const gcIntervalMs = isDev
    ? 24 * 60 * 60 * 1000  // every 24 hours in dev
    : 4 * 30 * 24 * 60 * 60 * 1000; // every 4 months in prod

  scheduler.register({
    name: "garbage-collection",
    intervalMs: gcIntervalMs,
    task: async () => {
      await garbageService.collector.run();
    }
  });

  scheduler.register({
    name: "garbage-cleaning",
    intervalMs: gcIntervalMs + (60 * 60 * 1000), // GC interval + 1 hour
    task: async () => {
      await garbageService.cleaner.run();
    }
  });

  scheduler.start();

  return scheduler;
}
