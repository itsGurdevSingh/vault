// Main bootstrap entrypoint
import { connectDB } from '../infrastructure/db/index.js';
import { createKeyManager } from './keyManager.js';
import { JwksService, SignerService, RotationService, JanitorService, AdminService } from '../application/services/index.js';
import { startCronJobs } from './cron.js';
import { startServers } from './servers.js';
import { shutdown } from './shutdown.js';

export async function bootstrap() {
    try {
        await connectDB();
        const keyManager = await createKeyManager();
        keyManager.initialSetupDomain('user');
        keyManager.initialSetupDomain('user-admin');
        keyManager.initialSetupDomain('service');

        const jwksService = new JwksService({ keyManager });
        const signerService = new SignerService({ keyManager });
        const rotatorService = new AdminService({ keyManager });
        const rotationService = new RotationService({ keyManager });
        const janitorService = new JanitorService({ keyManager });

        startCronJobs({ rotationService, janitorService, logger: console });
        const { grpcServer, httpServer } = await startServers({ jwksService, signerService, rotatorService });

        process.on('SIGTERM', () => shutdown(grpcServer, httpServer));
        process.on('SIGINT', () => shutdown(grpcServer, httpServer));
    } catch (err) {
        console.error('Failed to start Vault', err);
        process.exit(1);
    }
}
