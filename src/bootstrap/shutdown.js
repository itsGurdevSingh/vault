// Handles graceful shutdown
export function shutdown(grpcServer, httpServer) {
    console.log('Shutting down Vault...');
    let pending = 2;
    const done = () => {
        pending -= 1;
        if (pending === 0) process.exit(0);
    };
    grpcServer.tryShutdown(done);
    httpServer.close(done);
}
