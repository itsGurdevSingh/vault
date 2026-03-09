export class CronScheduler {
  constructor(logger = console) {
    this.jobs = [];
    this.intervalIds = [];
    this.logger = logger;
  }

  register({ name, intervalMs, task }) {
    this.jobs.push({ name, intervalMs, task });
  }

  start() {
    for (const job of this.jobs) {
      this.logger.info?.(`Starting cron job: ${job.name} with interval ${job.intervalMs}ms (${(job.intervalMs / 1000 / 60 / 60).toFixed(2)} hours)`);

      const intervalId = setInterval(async () => {
        try {
          await job.task();
        } catch (err) {
          this.logger.error?.(
            `Cron job failed: ${job.name}`,
            err
          );
        }
      }, job.intervalMs);

      this.intervalIds.push(intervalId);
    }
  }

  stop() {
    this.logger.info?.('Stopping all cron jobs...');
    for (const intervalId of this.intervalIds) {
      clearInterval(intervalId);
    }
    this.intervalIds = [];
  }
}
