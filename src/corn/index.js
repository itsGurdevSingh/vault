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

  scheduler.register({
    name: "garbage-collection",
    intervalMs: 4 * 30 * 24 * 60 * 60 * 1000, // every 4 months
    task: async () => {
      await garbageService.collector.collect();
    }
  });

  scheduler.register({
    name: "garbage-cleaning",
    intervalMs: 4 * 30 * 24 * (60 * 60 * 1000 )+ (60 * 60 * 1000), // every 4 months + 1 hour
    task: async () => {
      await garbageService.cleaner.clean();
    }
  });

  scheduler.start();
}
