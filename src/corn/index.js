import { CronScheduler } from "./scheduler.js";
import { createRotationJob } from "./jobs/rotation.job.js";
import { createCleanupJob } from "./jobs/cleanup.job.js";

export function startCron({
  rotationService,
  janitorService,
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

  scheduler.start();
}
