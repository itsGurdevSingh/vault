// Starts all transport servers
import { startGrpcServer } from '../transport/grpc/server/server.js';
import { startHttpServer } from '../transport/http/server.js';

export async function startServers({ jwksService, signerService, rotatorService }) {
    const { server: grpcServer, port: grpcPort } = await startGrpcServer({
        certDir: 'certs',
        port: 50051,
        services: { jwksService, signerService, rotatorService }
    });
    console.log(`Vault gRPC listening on :${grpcPort}`);

    const httpServer = startHttpServer({
        jwksService,
        port: 3000
    });
    return { grpcServer, httpServer };
}
