// Starts cron jobs for rotation and janitor
import { startCron } from '../corn/index.js';

export function startCronJobs({ rotationService, janitorService, logger }) {
    startCron({ rotationService, janitorService, logger });
}
