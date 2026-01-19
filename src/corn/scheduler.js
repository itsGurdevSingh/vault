export class CronScheduler {
  constructor(logger = console) {
    this.jobs = [];
    this.logger = logger;
  }

  register({ name, intervalMs, task }) {
    this.jobs.push({ name, intervalMs, task });
  }

  start() {
    for (const job of this.jobs) {
      this.logger.info?.(`Starting cron job: ${job.name}`);

      setInterval(async () => {
        try {
          await job.task();
        } catch (err) {
          this.logger.error?.(
            `Cron job failed: ${job.name}`,
            err
          );
        }
      }, job.intervalMs);
    }
  }
}
