// Starts cron jobs for rotation and janitor
import { startCron } from '../corn/index.js';

export function startCronJobs({ rotationService, janitorService, garbageService, logger }) {
    startCron({ rotationService, janitorService, garbageService, logger });
}
