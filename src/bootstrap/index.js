// Main bootstrap entrypoint
import { connectDB } from '../infrastructure/db/index.js';
import { createKeyManagerServices } from './keyManager.js';
import { JwksService, SignerService, RotationService, JanitorService, AdminService } from '../application/services/index.js';
import { startCronJobs } from './cron.js';
import { startServers } from './servers.js';
import { shutdown } from './shutdown.js';
import { createGarbageServices } from './garbage.js';
import { createRotationSchedulerServices } from './rotatonScheduler.js';
const { configManager } = await import('../application/config/index.js');

export async function bootstrap() {
    try {
        await connectDB();
        const { KeyManager: keyManager, janitor, snapshotBuilder } = await createKeyManagerServices(configManager);
        await keyManager.initialSetupDomain('user');
        await keyManager.initialSetupDomain('user-admin');
        await keyManager.initialSetupDomain('service');

        const rotationScheduler = createRotationSchedulerServices(keyManager, configManager);

        const jwksService = new JwksService({ keyManager });
        const signerService = new SignerService({ keyManager });
        const rotatorService = new AdminService({ adminRepository: keyManager, rotationScheduler, configManager });
        const rotationService = new RotationService({ rotationScheduler });
        const janitorService = new JanitorService({ keyManager });

        // garbage service = { collector, cleaner }
        const garbageService = await createGarbageServices({ snapshotBuilder, janitor, logger: console });

        const scheduler = startCronJobs({ rotationService, janitorService, garbageService, logger: console });
        const { grpcServer, httpServer } = await startServers({ jwksService, signerService, rotatorService });

        process.on('SIGTERM', () => shutdown(grpcServer, httpServer, scheduler));
        process.on('SIGINT', () => shutdown(grpcServer, httpServer, scheduler));
    } catch (err) {
        console.error('Failed to start Vault', err);
        process.exit(1);
    }
}
